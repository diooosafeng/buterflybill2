import { io, Socket } from "socket.io-client";
import { PartyEvent } from "../types";

const COLLECTION_NAME = "events";
const LOCAL_STORAGE_KEY_PREFIX = "offline_event_";

// Initialize Socket.io client
// Force websocket transport to avoid session affinity issues on serverless platforms
export const socket: Socket = io({
  transports: ['websocket']
});

/**
 * Creates or overwrites an event in the cloud (Socket.io) and LocalStorage.
 */
export const saveEventToCloud = async (event: PartyEvent) => {
  const dataToSave = {
    ...event,
    lastUpdated: Date.now()
  };

  // 1. Sync to Cloud via Socket
  socket.emit("update-event", dataToSave);

  // 2. Fallback: LocalStorage
  localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + event.id, JSON.stringify(dataToSave));
  // Notify listeners in same window
  window.dispatchEvent(new Event('local-storage-update'));
};

/**
 * Subscribes to a specific event's changes in real-time.
 * Returns an unsubscribe function.
 */
export const subscribeToEvent = (eventId: string, onUpdate: (event: PartyEvent | null) => void) => {
  // 1. Join the room on the server
  socket.emit("join-event", eventId);

  // 2. Listen for updates from the server
  const handleUpdate = (event: PartyEvent) => {
    if (event.id === eventId) {
      onUpdate(event);
      // Also update local storage to keep it in sync
      localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + eventId, JSON.stringify(event));
    }
  };

  const handleDelete = (deletedId: string) => {
    if (deletedId === eventId) {
      onUpdate(null);
      localStorage.removeItem(LOCAL_STORAGE_KEY_PREFIX + eventId);
    }
  };

  socket.on("event-update", handleUpdate);
  socket.on("event-deleted", handleDelete);

  // 3. LocalStorage Mode (Initial load and offline fallback)
  const loadFromLocal = () => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + eventId);
      if (stored) {
        onUpdate(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error reading local event:", e);
    }
  };

  // Initial load from local storage while waiting for server
  loadFromLocal();

  // Listen for changes in other tabs AND local updates in same tab
  const storageHandler = () => loadFromLocal();
  window.addEventListener('storage', storageHandler);
  window.addEventListener('local-storage-update', storageHandler);

  return () => {
    socket.off("event-update", handleUpdate);
    socket.off("event-deleted", handleDelete);
    window.removeEventListener('storage', storageHandler);
    window.removeEventListener('local-storage-update', storageHandler);
  };
};

/**
 * Updates just specific fields of an event
 */
export const updateEventFields = async (eventId: string, fields: Partial<PartyEvent>) => {
  // LocalStorage Fallback
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + eventId);
  if (stored) {
    const event = JSON.parse(stored);
    const updated = { ...event, ...fields, lastUpdated: Date.now() };
    saveEventToCloud(updated);
  }
};

export const deleteEventFromCloud = async (eventId: string) => {
  // 1. Sync to Cloud
  socket.emit("delete-event", eventId);

  // 2. LocalStorage Fallback
  localStorage.removeItem(LOCAL_STORAGE_KEY_PREFIX + eventId);
  window.dispatchEvent(new Event('local-storage-update'));
}

/**
 * Generates a short, easy-to-type passcode for an event
 */
export const generateEventPasscode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};
