import { log } from '../utils/logger';

interface ChannelEntry {
  ownerId: string;
  permittedUserIds: Set<string>;
}

const store = new Map<string, ChannelEntry>();
const cleanupTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

export const channelStore = {
  register(channelId: string, ownerId: string): void {
    store.set(channelId, {
      ownerId,
      permittedUserIds: new Set(),
    });
    log.store.info(`register channel=${channelId} owner=${ownerId}`);
  },

  getOwner(channelId: string): string | null {
    return store.get(channelId)?.ownerId ?? null;
  },

  setOwner(channelId: string, newOwnerId: string): void {
    const entry = store.get(channelId);
    if (entry) {
      entry.permittedUserIds.delete(newOwnerId);
      entry.ownerId = newOwnerId;
      log.store.info(`setOwner channel=${channelId} newOwner=${newOwnerId}`);
    }
  },

  get(channelId: string): ChannelEntry | null {
    return store.get(channelId) ?? null;
  },

  isPermitted(channelId: string, userId: string): boolean {
    const entry = store.get(channelId);
    if (!entry) return false;
    return entry.ownerId === userId || entry.permittedUserIds.has(userId);
  },

  addPermitted(channelId: string, userId: string): void {
    const entry = store.get(channelId);
    if (entry) {
      entry.permittedUserIds.add(userId);
      log.store.info(`addPermitted channel=${channelId} userId=${userId}`);
    }
  },

  removePermitted(channelId: string, userId: string): void {
    const entry = store.get(channelId);
    if (entry) {
      entry.permittedUserIds.delete(userId);
      log.store.info(`removePermitted channel=${channelId} userId=${userId}`);
    }
  },

  unregister(channelId: string): void {
    store.delete(channelId);
    const timeoutId = cleanupTimeouts.get(channelId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      cleanupTimeouts.delete(channelId);
    }
    log.store.info(`unregister channel=${channelId}`);
  },

  has(channelId: string): boolean {
    return store.has(channelId);
  },

  setCleanupTimeout(channelId: string, timeoutId: ReturnType<typeof setTimeout>): void {
    cleanupTimeouts.set(channelId, timeoutId);
    log.store.info(`setCleanupTimeout channel=${channelId}`);
  },

  clearCleanupTimeout(channelId: string): void {
    const timeoutId = cleanupTimeouts.get(channelId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      cleanupTimeouts.delete(channelId);
      log.store.info(`clearCleanupTimeout channel=${channelId}`);
    }
  },
};
