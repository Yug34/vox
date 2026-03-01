function parseShardIds(env: string | undefined): number[] {
  if (!env?.trim()) return [0];
  return env
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

export default {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  commandPrefix: process.env.COMMAND_PREFIX || '!!',
  triggerChannelName: process.env.TRIGGER_CHANNEL_NAME || 'Create Your Own VC',
  cleanupDelayMs: parseInt(process.env.CLEANUP_DELAY_MS || '5000', 10),
  votekickDurationHours: parseFloat(process.env.VOTEKICK_DURATION_HOURS || '1'),
  redisUrl: process.env.REDIS_URL || null,
  /** Total shards across all processes (for horizontal scaling) */
  shardCount: parseInt(process.env.SHARD_COUNT || '1', 10) || 1,
  /** Comma-separated shard IDs this process runs (e.g. "0,1" for first two shards) */
  shardIds: parseShardIds(process.env.SHARD_IDS),
};
