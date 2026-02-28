import { log } from '../utils/logger';

interface VotekickEntry {
  targetUserId: string;
  channelId: string;
  textChannelId: string;
  messageId: string;
  timeoutId: ReturnType<typeof setTimeout>;
}

const store = new Map<string, VotekickEntry>();

export const votekickStore = {
  has(channelId: string): boolean {
    return store.has(channelId);
  },

  set(channelId: string, entry: VotekickEntry): void {
    store.set(channelId, entry);
    log.store.info(`votekick set channel=${channelId} target=${entry.targetUserId}`);
  },

  get(channelId: string): VotekickEntry | null {
    return store.get(channelId) ?? null;
  },

  remove(channelId: string): void {
    const entry = store.get(channelId);
    if (entry) {
      clearTimeout(entry.timeoutId);
      store.delete(channelId);
      log.store.info(`votekick remove channel=${channelId}`);
    }
  },
};
