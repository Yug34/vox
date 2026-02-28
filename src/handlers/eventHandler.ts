import { readdirSync } from 'fs';
import { dirname, join } from 'path';
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';
import type { Client } from 'discord.js';
import type { Event } from '../types';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadEvents(client: Client): Promise<void> {
  const eventsPath = join(__dirname, '..', 'events');
  const eventFiles = readdirSync(eventsPath).filter((f) => f.endsWith('.ts'));

  for (const file of eventFiles) {
    const filePath = join(eventsPath, file);
    const event = (await import(pathToFileURL(filePath).href)).default as Event;

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }
}
