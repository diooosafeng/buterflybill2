import { db, isFirebaseConfigured } from "./firebase";
import { doc, setDoc, onSnapshot, updateDoc, deleteDoc } from "firebase/firestore";
import { PartyEvent } from "../types";

const COLLECTION_NAME = "events";
const LOCAL_STORAGE_KEY_PREFIX = "offline_event_";

/**
 * Creates or overwrites an event in Firestore or LocalStorage.
 */
export const saveEventToCloud = async (event: PartyEvent) => {
  const dataToSave = {
    ...event,
    lastUpdated: Date.now()
  };

  if (isFirebaseConfigured && db) {
    try {
      const eventRef = doc(db, COLLECTION_NAME, event.id);
      await setDoc(eventRef, dataToSave);
      return;
    } catch (error) {
      console.error("Error saving event to cloud:", error);
      throw error;
    }
  }

  // Fallback: LocalStorage
  localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + event.id, JSON.stringify(dataToSave));
  // Notify listeners in same window
  window.dispatchEvent(new Event('local-storage-update'));
};

/**
 * Subscribes to a specific event's changes in real-time.
 * Returns an unsubscribe function.
 */
export const subscribeToEvent = (eventId: string, onUpdate: (event: PartyEvent | null) => void) => {
  // 1. Firebase Mode
  if (isFirebaseConfigured && db) {
    const eventRef = doc(db, COLLECTION_NAME, eventId);
    return onSnapshot(eventRef, (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as PartyEvent);
      } else {
        onUpdate(null);
      }
    }, (error) => {
      console.error("Error listening to event:", error);
      onUpdate(null);
    });
  }

  // 2. LocalStorage Mode (Mock Subscription)
  const loadFromLocal = () => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + eventId);
      if (stored) {
        onUpdate(JSON.parse(stored));
      } else {
        onUpdate(null);
      }
    } catch (e) {
      console.error("Error reading local event:", e);
      onUpdate(null);
    }
  };

  // Initial load
  loadFromLocal();

  // Listen for changes
  const handler = () => loadFromLocal();
  
  // 'local-storage-update' is our custom event for same-window updates
  window.addEventListener('local-storage-update', handler);
  // 'storage' event fires when other tabs update LocalStorage
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener('local-storage-update', handler);
    window.removeEventListener('storage', handler);
  };
};

/**
 * Updates just specific fields of an event
 */
export const updateEventFields = async (eventId: string, fields: Partial<PartyEvent>) => {
  if (isFirebaseConfigured && db) {
    const eventRef = doc(db, COLLECTION_NAME, eventId);
    await updateDoc(eventRef, {
      ...fields,
      lastUpdated: Date.now()
    });
    return;
  }

  // LocalStorage Fallback
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + eventId);
  if (stored) {
    const event = JSON.parse(stored);
    const updated = { ...event, ...fields, lastUpdated: Date.now() };
    localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + eventId, JSON.stringify(updated));
    window.dispatchEvent(new Event('local-storage-update'));
  }
};

export const deleteEventFromCloud = async (eventId: string) => {
  if (isFirebaseConfigured && db) {
    const eventRef = doc(db, COLLECTION_NAME, eventId);
    await deleteDoc(eventRef);
    return;
  }

  // LocalStorage Fallback
  localStorage.removeItem(LOCAL_STORAGE_KEY_PREFIX + eventId);
  window.dispatchEvent(new Event('local-storage-update'));
}