import { log } from '../utils/logger';
import type { ChannelEntry } from './types';

const store = new Map<string, ChannelEntry>();
const cleanupTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

export const channelStore = {
  async register(channelId: string, ownerId: string): Promise<void> {
    store.set(channelId, {
      ownerId,
      permittedUserIds: new Set(),
    });
    log.store.info(`register channel=${channelId} owner=${ownerId}`);
  },

  async getOwner(channelId: string): Promise<string | null> {
    return store.get(channelId)?.ownerId ?? null;
  },

  async setOwner(channelId: string, newOwnerId: string): Promise<void> {
    const entry = store.get(channelId);
    if (entry) {
      entry.permittedUserIds.delete(newOwnerId);
      entry.ownerId = newOwnerId;
      log.store.info(`setOwner channel=${channelId} newOwner=${newOwnerId}`);
    }
  },

  async get(channelId: string): Promise<ChannelEntry | null> {
    return store.get(channelId) ?? null;
  },

  async isPermitted(channelId: string, userId: string): Promise<boolean> {
    const entry = store.get(channelId);
    if (!entry) return false;
    return entry.ownerId === userId || entry.permittedUserIds.has(userId);
  },

  async addPermitted(channelId: string, userId: string): Promise<void> {
    const entry = store.get(channelId);
    if (entry) {
      entry.permittedUserIds.add(userId);
      log.store.info(`addPermitted channel=${channelId} userId=${userId}`);
    }
  },

  async removePermitted(channelId: string, userId: string): Promise<void> {
    const entry = store.get(channelId);
    if (entry) {
      entry.permittedUserIds.delete(userId);
      log.store.info(`removePermitted channel=${channelId} userId=${userId}`);
    }
  },

  async unregister(channelId: string): Promise<void> {
    store.delete(channelId);
    const timeoutId = cleanupTimeouts.get(channelId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      cleanupTimeouts.delete(channelId);
    }
    log.store.info(`unregister channel=${channelId}`);
  },

  async has(channelId: string): Promise<boolean> {
    return store.has(channelId);
  },

  async setCleanupTimeout(
    channelId: string,
    timeoutId?: ReturnType<typeof setTimeout>
  ): Promise<void> {
    if (timeoutId) {
      cleanupTimeouts.set(channelId, timeoutId);
      log.store.info(`setCleanupTimeout channel=${channelId}`);
    }
  },

  async clearCleanupTimeout(channelId: string): Promise<void> {
    const timeoutId = cleanupTimeouts.get(channelId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      cleanupTimeouts.delete(channelId);
      log.store.info(`clearCleanupTimeout channel=${channelId}`);
    }
  },
};
