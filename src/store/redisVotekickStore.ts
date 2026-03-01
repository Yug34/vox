import config from '../../config';
import { log } from '../utils/logger';
import type { VotekickEntry } from './types';
import { getRedis } from './redis';
import { getShardForGuild } from './redisChannelStore';

const VOTEKICK_PREFIX = 'votekick:';

function key(channelId: string): string {
  return `${VOTEKICK_PREFIX}${channelId}`;
}

function ttlSeconds(): number {
  return Math.ceil(config.votekickDurationHours * 3600);
}

export const redisVotekickStore = {
  async has(channelId: string): Promise<boolean> {
    const r = getRedis();
    if (!r) return false;
    const exists = await r.exists(key(channelId));
    return exists === 1;
  },

  async set(
    channelId: string,
    entry: Omit<VotekickEntry, 'expiresAt'> & { timeoutId?: ReturnType<typeof setTimeout> }
  ): Promise<void> {
    const r = getRedis();
    if (!r) return;
    const fullEntry: VotekickEntry = {
      ...entry,
      expiresAt: Date.now() + config.votekickDurationHours * 3600 * 1000,
    };
    await r.setex(key(channelId), ttlSeconds(), JSON.stringify(fullEntry));
    log.store.info(`votekick set channel=${channelId} target=${entry.targetUserId}`);
  },

  async get(channelId: string): Promise<VotekickEntry | null> {
    const r = getRedis();
    if (!r) return null;
    const raw = await r.get(key(channelId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as VotekickEntry;
    } catch {
      return null;
    }
  },

  async remove(channelId: string): Promise<void> {
    const r = getRedis();
    if (!r) return;
    await r.del(key(channelId));
    log.store.info(`votekick remove channel=${channelId}`);
  },

  async getExpiredVotekicks(options?: {
    shardIds?: number[];
    shardCount?: number;
  }): Promise<VotekickEntry[]> {
    const r = getRedis();
    if (!r) return [];
    const keys = await r.keys(`${VOTEKICK_PREFIX}*`);
    const expired: VotekickEntry[] = [];
    const now = Date.now();
    const { shardIds, shardCount } = options ?? {};

    for (const k of keys) {
      const raw = await r.get(k);
      if (!raw) continue;
      try {
        const entry = JSON.parse(raw) as VotekickEntry;
        if (entry.expiresAt > now) continue;

        if (shardIds != null && shardCount != null && entry.guildId) {
          const shard = getShardForGuild(entry.guildId, shardCount);
          if (!shardIds.includes(shard)) continue;
        }

        expired.push(entry);
      } catch {
        // ignore
      }
    }
    return expired;
  },
};
