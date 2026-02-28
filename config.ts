export default {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  commandPrefix: process.env.COMMAND_PREFIX || '!!',
  triggerChannelName: process.env.TRIGGER_CHANNEL_NAME || 'Create Your Own VC',
  cleanupDelayMs: parseInt(process.env.CLEANUP_DELAY_MS || '5000', 10),
  votekickDurationHours: parseFloat(process.env.VOTEKICK_DURATION_HOURS || '1'),
};
