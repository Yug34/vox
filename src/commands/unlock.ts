import type { Message } from 'discord.js';
import { formatVcName, stripLockFromName } from '../utils/channelName';
import { channelStoreImpl } from '../store';
import { getPermissionOverwriteErrorMessage } from '../utils/discordErrors';
import { log } from '../utils/logger';
import { canEditPermissionOverwrite } from '../utils/roleHierarchy';

export default {
  name: 'unlock',
  async execute(message: Message, _args: string[]): Promise<void> {
    const member = message.member;
    const voiceChannel = member?.voice?.channel;

    log.cmd.info(
      `!!unlock user=${member?.id ?? 'unknown'} channel=${voiceChannel?.id ?? 'none'}`
    );

    if (!voiceChannel) {
      log.cmd.info(`!!unlock validation failed: not in voice channel`);
      await message.reply('You must be in a voice channel to use this command.');
      return;
    }

    const ownerId = await channelStoreImpl.getOwner(voiceChannel.id);
    if (ownerId !== member?.id) {
      log.cmd.info(`!!unlock validation failed: not owner (owner=${ownerId})`);
      await message.reply('You can only unlock your own temporary voice channel.');
      return;
    }

    try {
      const guild = message.guild!;
      await voiceChannel.permissionOverwrites.delete(guild.id);

      const entry = await channelStoreImpl.get(voiceChannel.id);
      if (entry) {
        if (canEditPermissionOverwrite(guild, member)) {
          await voiceChannel.permissionOverwrites.delete(member.id);
        }
        for (const userId of entry.permittedUserIds) {
          const targetMember = guild.members.cache.get(userId) ?? null;
          if (canEditPermissionOverwrite(guild, targetMember)) {
            await voiceChannel.permissionOverwrites.delete(userId);
          }
        }
      }

      const baseName = stripLockFromName(voiceChannel.name).replace(/'s VC$/, '');
      await voiceChannel.setName(formatVcName(baseName, false));

      log.cmd.info(`!!unlock success channel=${voiceChannel.id}`);
      await message.reply('Your voice channel is now unlocked. Anyone can join.');
    } catch (error) {
      log.cmd.error('Unlock command error:', error);
      const msg = getPermissionOverwriteErrorMessage(
        error,
        'Failed to unlock the channel. Make sure the bot has Manage Channels permission.'
      );
      await message.reply(`Failed to unlock the channel. ${msg}`);
    }
  },
};
