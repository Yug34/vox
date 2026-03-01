import { Events, ChannelType, VoiceState, VoiceChannel } from 'discord.js';
import config from '../../config';
import { channelStoreImpl, votekickStoreImpl } from '../store';
import { capitalizeName, formatVcName, sanitizeChannelName } from '../utils/channelName';
import { getPermissionOverwriteErrorMessage } from '../utils/discordErrors';
import { log } from '../utils/logger';
import { canEditPermissionOverwrite } from '../utils/roleHierarchy';

const TRIGGER_NAME = config.triggerChannelName;
const CLEANUP_DELAY = config.cleanupDelayMs;

function formatChannel(ch: { id: string; name: string } | null): string {
  return ch ? `${ch.name} (${ch.id})` : 'none';
}

export default {
  name: Events.VoiceStateUpdate,
  once: false,
  async execute(oldState: VoiceState, newState: VoiceState): Promise<void> {
    if (newState.member?.user?.bot) return;

    const userId = newState.member?.user?.id ?? 'unknown';
    const username = newState.member?.user?.username ?? 'unknown';
    const oldCh = oldState.channel;
    const newCh = newState.channel;
    const eventType = !oldCh && newCh ? 'joined' : oldCh && !newCh ? 'left' : 'switched';

    log.voice.info(
      `user=${userId} (${username}) left=${formatChannel(oldCh)} joined=${formatChannel(newCh)} type=${eventType}`
    );

    const leftChannel = oldState.channel && !newState.channel;

    if (newState.channel) {
      const channel = newState.channel;
      const channelName = channel.name;

      if (channelName.toLowerCase() === TRIGGER_NAME.toLowerCase()) {
        await handleTriggerJoin(newState);
      } else if (await channelStoreImpl.has(channel.id)) {
        log.voice.info(`user joined temp VC ${channel.name} (${channel.id}), clearing cleanup`);
        await channelStoreImpl.clearCleanupTimeout(channel.id);
      }
    }

    if (oldCh && (await channelStoreImpl.has(oldCh.id)) && (await channelStoreImpl.getOwner(oldCh.id)) === userId) {
      if (oldCh.members.size > 0) {
        await handleOwnerLeft(oldState);
      }
    }

    if (leftChannel) {
      await handleChannelEmpty(oldState);
    }
  },
};

async function handleTriggerJoin(newState: VoiceState): Promise<void> {
  const { member, channel: triggerChannel, guild } = newState;
  if (!member || !triggerChannel || !guild) return;

  log.voice.info(
    `user ${member.user.tag} (${member.id}) joined trigger channel ${triggerChannel.name} (${triggerChannel.id})`
  );

  try {
    const baseName = capitalizeName(sanitizeChannelName(member.user.username));
    const channelName = `${baseName}'s VC`;

    const newChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildVoice,
      parent: triggerChannel.parent,
      position: triggerChannel.position + 1,
    });

    log.voice.info(`created temp VC ${newChannel.name} (${newChannel.id})`);

    await member.voice.setChannel(newChannel);
    log.voice.info(`moved user ${member.user.tag} to ${newChannel.name} (${newChannel.id})`);
    await channelStoreImpl.register(newChannel.id, member.id);
  } catch (error) {
    log.voice.error('Failed to create temp VC:', error);
  }
}

async function handleChannelEmpty(oldState: VoiceState): Promise<void> {
  const channel = oldState.channel;
  if (!channel || channel.members.size > 0) return;
  if (!(await channelStoreImpl.has(channel.id))) return;

  log.voice.info(
    `temp channel ${channel.name} (${channel.id}) is empty, scheduling cleanup in ${CLEANUP_DELAY}ms`
  );

  if (config.redisUrl) {
    await channelStoreImpl.setCleanupTimeout(channel.id);
  } else {
    const timeoutId = setTimeout(async () => {
      try {
        const fetchedChannel = await channel.guild.channels.fetch(channel.id).catch(() => null);
        const voiceChannel = fetchedChannel?.isVoiceBased?.()
          ? (fetchedChannel as VoiceChannel)
          : null;
        if (!voiceChannel || voiceChannel.members.size > 0) {
          log.voice.info(
            `channel ${channel.id} no longer empty or missing, cancelling delete`
          );
          await votekickStoreImpl.remove(channel.id);
          await channelStoreImpl.unregister(channel.id);
          return;
        }
        await voiceChannel.delete();
        log.voice.info(`channel ${channel.id} deleted (was empty)`);
      } catch (error) {
        log.voice.error('Failed to delete empty temp VC:', error);
      } finally {
        await votekickStoreImpl.remove(channel.id);
        await channelStoreImpl.unregister(channel.id);
      }
    }, CLEANUP_DELAY);
    await channelStoreImpl.setCleanupTimeout(channel.id, timeoutId);
  }
}

async function handleOwnerLeft(oldState: VoiceState): Promise<void> {
  const channel = oldState.channel;
  if (!channel || !channel.isVoiceBased()) return;

  const newOwner = channel.members.first();
  if (!newOwner) return;

  const oldOwnerId = oldState.member?.user?.id;
  if (!oldOwnerId) return;

  log.voice.info(
    `owner ${oldOwnerId} left temp VC ${channel.name} (${channel.id}), transferring to ${newOwner.id} (${newOwner.user.username})`
  );

  try {
    await channelStoreImpl.setOwner(channel.id, newOwner.id);

    const baseName = capitalizeName(sanitizeChannelName(newOwner.user.username));
    const isLocked = channel.permissionOverwrites.cache.has(channel.guildId);
    await channel.setName(formatVcName(baseName, isLocked));

    const hasGuildOverwrite = channel.permissionOverwrites.cache.has(channel.guildId);
    if (hasGuildOverwrite) {
      const oldOwnerMember = channel.guild.members.cache.get(oldOwnerId) ?? null;
      if (
        canEditPermissionOverwrite(channel.guild, oldOwnerMember) &&
        canEditPermissionOverwrite(channel.guild, newOwner)
      ) {
        await channel.permissionOverwrites.delete(oldOwnerId);
        await channel.permissionOverwrites.edit(newOwner.id, { Connect: true });
      }
    }

    log.voice.info(`transferred ownership of ${channel.id} to ${newOwner.id}`);
  } catch (error) {
    log.voice.error(
      'Failed to transfer ownership:',
      getPermissionOverwriteErrorMessage(
        error,
        'Make sure the bot has Manage Channels permission.'
      ),
      error
    );
  }
}
