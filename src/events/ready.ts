import { Events } from 'discord.js';
import config from '../../config';
import { log } from '../utils/logger';
import { startSweeper } from '../sweeper';

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: import('discord.js').Client<true>): Promise<void> {
    const shardInfo =
      config.shardCount > 1 ? ` shards ${config.shardIds.join(', ')}/${config.shardCount}` : '';
    log.ready.info(`Logged in as ${client.user.tag}${shardInfo}`);
    log.ready.info(`Command prefix: ${config.commandPrefix}`);
    if (config.redisUrl) {
      log.ready.info('Redis enabled: using persistent store');
      startSweeper(client);
    }
  },
};
