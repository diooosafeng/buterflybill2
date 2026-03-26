import { createClient } from '@supabase/supabase-js';
import { PartyEvent } from "../types";

const COLLECTION_NAME = "events";
const LOCAL_STORAGE_KEY_PREFIX = "offline_event_";

// Initialize Supabase Client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Global connection state
let isGlobalConnected = supabase.realtime.isConnected();

// Connection status listeners
type ConnectionCallback = (isConnected: boolean) => void;
const connectionListeners: ConnectionCallback[] = [];

export const onConnectionChange = (callback: ConnectionCallback) => {
  // Immediately call with current state
  callback(isGlobalConnected);
  
  connectionListeners.push(callback);
  return () => {
    const index = connectionListeners.indexOf(callback);
    if (index > -1) connectionListeners.splice(index, 1);
  };
};

const notifyConnectionChange = (isConnected: boolean) => {
  isGlobalConnected = isConnected;
  connectionListeners.forEach(cb => cb(isConnected));
};

// Listen to global realtime connection events
if (supabaseUrl && supabaseAnonKey) {
  supabase.realtime.on('open', () => notifyConnectionChange(true));
  supabase.realtime.on('close', () => notifyConnectionChange(false));
  supabase.realtime.on('error', () => notifyConnectionChange(false));
}

/**
 * Creates or overwrites an event in the cloud (Supabase) and LocalStorage.
 */
export const saveEventToCloud = async (event: PartyEvent) => {
  const dataToSave = {
    ...event,
    lastUpdated: Date.now()
  };

  // 1. Fallback: LocalStorage (Optimistic update)
  localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + event.id, JSON.stringify(dataToSave));
  window.dispatchEvent(new Event('local-storage-update'));

  // 2. Sync to Cloud via Supabase
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const { error } = await supabase
        .from(COLLECTION_NAME)
        .upsert({ 
          id: event.id, 
          data: dataToSave, 
          updated_at: new Date().toISOString() 
        });
        
      if (error) console.error("Supabase upsert error:", error);
    } catch (err) {
      console.error("Error saving to Supabase:", err);
    }
  }
};

/**
 * Subscribes to a specific event's changes in real-time.
 * Returns an unsubscribe function.
 */
export const subscribeToEvent = (eventId: string, onUpdate: (event: PartyEvent | null) => void) => {
  // 1. LocalStorage Mode (Initial load and offline fallback)
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

  // Initial load from local storage
  loadFromLocal();

  // Listen for local updates in same tab or other tabs
  const storageHandler = () => loadFromLocal();
  window.addEventListener('storage', storageHandler);
  window.addEventListener('local-storage-update', storageHandler);

  let channel: any = null;

  // 2. Supabase Realtime Subscription
  if (supabaseUrl && supabaseAnonKey) {
    // Fetch initial state from Supabase
    supabase
      .from(COLLECTION_NAME)
      .select("data")
      .eq("id", eventId)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          onUpdate(data.data);
          localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + eventId, JSON.stringify(data.data));
        } else if (error && error.code !== "PGRST116") {
          console.error("Supabase fetch error:", error);
        }
      });

    // Subscribe to real-time changes
    channel = supabase
      .channel(`public:${COLLECTION_NAME}:id=eq.${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: COLLECTION_NAME,
          filter: `id=eq.${eventId}`
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            onUpdate(null);
            localStorage.removeItem(LOCAL_STORAGE_KEY_PREFIX + eventId);
          } else if (payload.new && payload.new.data) {
            onUpdate(payload.new.data);
            localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + eventId, JSON.stringify(payload.new.data));
          }
        }
      )
      .subscribe();
  }

  return () => {
    window.removeEventListener('storage', storageHandler);
    window.removeEventListener('local-storage-update', storageHandler);
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
};

/**
 * Updates just specific fields of an event
 */
export const updateEventFields = async (eventId: string, fields: Partial<PartyEvent>) => {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + eventId);
  if (stored) {
    const event = JSON.parse(stored);
    const updated = { ...event, ...fields, lastUpdated: Date.now() };
    saveEventToCloud(updated);
  }
};

export const deleteEventFromCloud = async (eventId: string) => {
  // 1. LocalStorage Fallback
  localStorage.removeItem(LOCAL_STORAGE_KEY_PREFIX + eventId);
  window.dispatchEvent(new Event('local-storage-update'));

  // 2. Sync to Cloud
  if (supabaseUrl && supabaseAnonKey) {
    try {
      await supabase.from(COLLECTION_NAME).delete().eq("id", eventId);
    } catch (err) {
      console.error("Error deleting from Supabase:", err);
    }
  }
}

/**
 * Generates a short, easy-to-type passcode for an event
 */
export const generateEventPasscode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};
