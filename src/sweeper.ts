import type { Client, VoiceChannel } from 'discord.js';
import config from '../config';
import { channelStoreImpl, votekickStoreImpl } from './store';
import { redisChannelStore } from './store/redisChannelStore';
import { redisVotekickStore } from './store/redisVotekickStore';
import { log } from './utils/logger';

const CLEANUP_INTERVAL_MS = 3000;
const VOTEKICK_SWEEP_INTERVAL_MS = 5000;

async function sweepChannelCleanups(client: Client): Promise<void> {
  if (channelStoreImpl !== redisChannelStore) return;
  const shardIds = config.shardIds;
  const channelIds = await redisChannelStore.getChannelsPendingCleanup({
    shardIds,
    shardCount: config.shardCount,
  });
  for (const channelId of channelIds) {
    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      const voiceChannel = channel?.isVoiceBased?.() ? (channel as VoiceChannel) : null;
      if (!voiceChannel || voiceChannel.members.size > 0) {
        await channelStoreImpl.clearCleanupTimeout(channelId);
        continue;
      }
      await voiceChannel.delete();
      log.voice.info(`channel ${channelId} deleted by sweeper (was empty)`);
    } catch (error) {
      log.voice.error('Sweeper channel cleanup error:', error);
    } finally {
      await votekickStoreImpl.remove(channelId);
      await channelStoreImpl.unregister(channelId);
    }
  }
}

async function sweepVotekickExpiry(client: Client): Promise<void> {
  if (votekickStoreImpl !== redisVotekickStore) return;
  const shardIds = config.shardIds;
  const expired = await redisVotekickStore.getExpiredVotekicks({
    shardIds,
    shardCount: config.shardCount,
  });
  for (const entry of expired) {
    try {
      await votekickStoreImpl.remove(entry.channelId);
      const textChannel = await client.channels.fetch(entry.textChannelId).catch(() => null);
      if (!textChannel?.isSendable()) continue;
      const msg = await textChannel.messages.fetch(entry.messageId).catch(() => null);
      const poll = msg?.poll;
      if (!poll) continue;
      const yesAnswer = poll.answers.find((a) => a.text === 'Yes');
      const noAnswer = poll.answers.find((a) => a.text === 'No');
      const yesCount = yesAnswer?.voteCount ?? 0;
      const noCount = noAnswer?.voteCount ?? 0;
      const guild = 'guild' in textChannel ? textChannel.guild : null;
      if (!guild) continue;
      if (yesCount > noCount) {
        const targetMember = guild.members.cache.get(entry.targetUserId);
        if (targetMember?.voice.channelId === entry.channelId) {
          await targetMember.voice.setChannel(null);
          await textChannel.send(`<@${entry.targetUserId}> was votekicked from the voice channel.`);
        }
      } else {
        const targetUser = guild.members.cache.get(entry.targetUserId)?.user;
        await textChannel.send(
          `Votekick failed. ${targetUser?.tag ?? 'User'} stays in the voice channel.`
        );
      }
    } catch (error) {
      log.cmd.error('Sweeper votekick expiry error:', error);
    }
  }
}

export function startSweeper(client: Client): void {
  if (!config.redisUrl) return;
  setInterval(() => sweepChannelCleanups(client), CLEANUP_INTERVAL_MS);
  setInterval(() => sweepVotekickExpiry(client), VOTEKICK_SWEEP_INTERVAL_MS);
  log.ready.info('Sweeper started (Redis mode)');
}
