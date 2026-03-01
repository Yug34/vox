import { Client, GatewayIntentBits } from 'discord.js';
import config from '../config';
import { loadEvents } from './handlers/eventHandler';

if (!config.token || !config.clientId) {
  console.error('Missing required env: DISCORD_TOKEN and CLIENT_ID must be set.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  shards: config.shardIds.length === 1 ? config.shardIds[0]! : config.shardIds,
  shardCount: config.shardCount,
});

await loadEvents(client);

await client.login(config.token);

if (config.shardCount > 1) {
  console.log(`Running shards ${config.shardIds.join(', ')} of ${config.shardCount} total`);
}
