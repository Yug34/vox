import config from '../../config';
import { log } from '../utils/logger';
import type { VotekickEntry } from './types';

interface VotekickEntryWithTimeout extends VotekickEntry {
  timeoutId: ReturnType<typeof setTimeout>;
}

const store = new Map<string, VotekickEntryWithTimeout>();

export const votekickStore = {
  async has(channelId: string): Promise<boolean> {
    return store.has(channelId);
  },

  async set(
    channelId: string,
    entry: Omit<VotekickEntry, 'expiresAt'> & { timeoutId?: ReturnType<typeof setTimeout> }
  ): Promise<void> {
    const timeoutId = entry.timeoutId;
    if (!timeoutId) throw new Error('In-memory votekickStore requires timeoutId');
    const expiresAt = Date.now() + config.votekickDurationHours * 3600 * 1000;
    store.set(channelId, { ...entry, expiresAt, timeoutId });
    log.store.info(`votekick set channel=${channelId} target=${entry.targetUserId}`);
  },

  async get(channelId: string): Promise<VotekickEntry | null> {
    const entry = store.get(channelId);
    if (!entry) return null;
    return {
      targetUserId: entry.targetUserId,
      channelId: entry.channelId,
      textChannelId: entry.textChannelId,
      messageId: entry.messageId,
      expiresAt: entry.expiresAt,
    };
  },

  async remove(channelId: string): Promise<void> {
    const entry = store.get(channelId);
    if (entry) {
      clearTimeout(entry.timeoutId);
      store.delete(channelId);
      log.store.info(`votekick remove channel=${channelId}`);
    }
  },
};
