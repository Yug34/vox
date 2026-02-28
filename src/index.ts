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
});

await loadEvents(client);

client.login(config.token).catch((err) => {
  console.error('Failed to login:', err);
  process.exit(1);
});
