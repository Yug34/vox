import config from '../../config';
import { log } from '../utils/logger';
import type { ChannelEntry } from './types';
import { getRedis } from './redis';

const VC_PREFIX = 'vc:';
const CLEANUP_INTERVAL_MS = 3000;

interface ChannelData {
  ownerId: string;
  permittedUserIds: string[];
  cleanupAt?: number;
}

function key(channelId: string): string {
  return `${VC_PREFIX}${channelId}`;
}

async function getData(channelId: string): Promise<ChannelData | null> {
  const r = getRedis();
  if (!r) return null;
  const raw = await r.get(key(channelId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ChannelData;
  } catch {
    return null;
  }
}

async function setData(channelId: string, data: ChannelData): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.set(key(channelId), JSON.stringify(data));
}

async function del(channelId: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.del(key(channelId));
}

export const redisChannelStore = {
  async register(channelId: string, ownerId: string): Promise<void> {
    await setData(channelId, {
      ownerId,
      permittedUserIds: [],
    });
    log.store.info(`register channel=${channelId} owner=${ownerId}`);
  },

  async getOwner(channelId: string): Promise<string | null> {
    const data = await getData(channelId);
    return data?.ownerId ?? null;
  },

  async setOwner(channelId: string, newOwnerId: string): Promise<void> {
    const data = await getData(channelId);
    if (data) {
      data.permittedUserIds = data.permittedUserIds.filter((id) => id !== newOwnerId);
      data.ownerId = newOwnerId;
      await setData(channelId, data);
      log.store.info(`setOwner channel=${channelId} newOwner=${newOwnerId}`);
    }
  },

  async get(channelId: string): Promise<ChannelEntry | null> {
    const data = await getData(channelId);
    if (!data) return null;
    return {
      ownerId: data.ownerId,
      permittedUserIds: new Set(data.permittedUserIds),
    };
  },

  async isPermitted(channelId: string, userId: string): Promise<boolean> {
    const data = await getData(channelId);
    if (!data) return false;
    return data.ownerId === userId || data.permittedUserIds.includes(userId);
  },

  async addPermitted(channelId: string, userId: string): Promise<void> {
    const data = await getData(channelId);
    if (data && !data.permittedUserIds.includes(userId)) {
      data.permittedUserIds.push(userId);
      await setData(channelId, data);
      log.store.info(`addPermitted channel=${channelId} userId=${userId}`);
    }
  },

  async removePermitted(channelId: string, userId: string): Promise<void> {
    const data = await getData(channelId);
    if (data) {
      data.permittedUserIds = data.permittedUserIds.filter((id) => id !== userId);
      await setData(channelId, data);
      log.store.info(`removePermitted channel=${channelId} userId=${userId}`);
    }
  },

  async unregister(channelId: string): Promise<void> {
    await del(channelId);
    log.store.info(`unregister channel=${channelId}`);
  },

  async has(channelId: string): Promise<boolean> {
    const data = await getData(channelId);
    return data !== null;
  },

  async setCleanupTimeout(
    channelId: string,
    _timeoutId?: ReturnType<typeof setTimeout>
  ): Promise<void> {
    const data = await getData(channelId);
    if (data) {
      data.cleanupAt = Date.now() + config.cleanupDelayMs;
      await setData(channelId, data);
      log.store.info(`setCleanupTimeout channel=${channelId}`);
    }
  },

  async clearCleanupTimeout(channelId: string): Promise<void> {
    const data = await getData(channelId);
    if (data && data.cleanupAt !== undefined) {
      delete data.cleanupAt;
      await setData(channelId, data);
      log.store.info(`clearCleanupTimeout channel=${channelId}`);
    }
  },

  async getChannelsPendingCleanup(): Promise<string[]> {
    const r = getRedis();
    if (!r) return [];
    const keys = await r.keys(`${VC_PREFIX}*`);
    const channelIds: string[] = [];
    const now = Date.now();
    for (const k of keys) {
      const raw = await r.get(k);
      if (!raw) continue;
      try {
        const data = JSON.parse(raw) as ChannelData;
        if (data.cleanupAt !== undefined && data.cleanupAt <= now) {
          channelIds.push(k.slice(VC_PREFIX.length));
        }
      } catch {
        // ignore parse errors
      }
    }
    return channelIds;
  },
};
