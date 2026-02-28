import { Events } from 'discord.js';
import config from '../../config';
import { getCommands } from '../handlers/commandLoader';
import { log } from '../utils/logger';

const PREFIX = config.commandPrefix;

export default {
  name: Events.MessageCreate,
  once: false,
  async execute(message: import('discord.js').Message): Promise<void> {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    log.cmd.info(
      `command received: ${PREFIX}${commandName} user=${message.author.id} guild=${message.guildId ?? 'dm'}`
    );

    const commands = await getCommands();
    const command = commands.find((c) => c.name.toLowerCase() === commandName);
    if (!command) {
      log.cmd.warn(`command not found: ${commandName}`);
      return;
    }

    try {
      await command.execute(message, args);
    } catch (error) {
      log.cmd.error(`Error executing ${commandName}:`, error);
      await message.reply('There was an error executing this command.').catch(() => {});
    }
  },
};
