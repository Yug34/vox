import type { Message } from 'discord.js';
import { log } from '../utils/logger';

export default {
  name: 'ping',
  async execute(message: Message, _args: string[]): Promise<void> {
    const sent = await message.reply('Pong!');
    const roundtrip = sent.createdTimestamp - message.createdTimestamp;

    log.cmd.info(`!!ping user=${message.author.id} roundtrip=${roundtrip}ms`);

    await sent.edit(`Pong! (${roundtrip}ms)`);
  },
};
