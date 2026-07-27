import { create } from 'zustand';
import {
  DEFAULT_MESSAGE_RINGTONE_ID,
  MESSAGE_RINGTONES,
  type MessageRingtoneId,
} from '../config/messageRingtones';

const STORAGE_KEY = 'puurga_message_ringtone';

interface StoredPrefs {
  enabled: boolean;
  ringtoneId: MessageRingtoneId;
}

interface MessageRingtoneState {
  enabled: boolean;
  ringtoneId: MessageRingtoneId;
  setEnabled: (enabled: boolean) => void;
  setRingtoneId: (id: MessageRingtoneId) => void;
}

function isValidId(id: string): id is MessageRingtoneId {
  return MESSAGE_RINGTONES.some((r) => r.id === id);
}

function loadPrefs(): StoredPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { enabled: true, ringtoneId: DEFAULT_MESSAGE_RINGTONE_ID };
    }
    const parsed = JSON.parse(raw) as Partial<StoredPrefs>;
    return {
      enabled: parsed.enabled !== false,
      ringtoneId: isValidId(String(parsed.ringtoneId || ''))
        ? (parsed.ringtoneId as MessageRingtoneId)
        : DEFAULT_MESSAGE_RINGTONE_ID,
    };
  } catch {
    return { enabled: true, ringtoneId: DEFAULT_MESSAGE_RINGTONE_ID };
  }
}

function persist(prefs: StoredPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota / private mode
  }
}

const initial = loadPrefs();

export const useMessageRingtoneStore = create<MessageRingtoneState>((set, get) => ({
  enabled: initial.enabled,
  ringtoneId: initial.ringtoneId,
  setEnabled: (enabled) => {
    const next = { enabled, ringtoneId: get().ringtoneId };
    persist(next);
    set({ enabled });
  },
  setRingtoneId: (ringtoneId) => {
    const next = { enabled: get().enabled, ringtoneId };
    persist(next);
    set({ ringtoneId });
  },
}));
