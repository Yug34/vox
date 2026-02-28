import { readdirSync } from 'fs';
import { dirname, join } from 'path';
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';
import type { Command } from '../types';

const __dirname = dirname(fileURLToPath(import.meta.url));

let commandsCache: Command[] | null = null;

export async function getCommands(): Promise<Command[]> {
  if (commandsCache) return commandsCache;

  const commandsPath = join(__dirname, '..', 'commands');
  const commandFiles = readdirSync(commandsPath).filter((f) => f.endsWith('.ts'));
  const commands: Command[] = [];

  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const command = (await import(pathToFileURL(filePath).href)).default as Command;
    if (command && command.name && typeof command.execute === 'function') {
      commands.push(command);
    }
  }

  commandsCache = commands;
  return commands;
}
