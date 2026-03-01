import type { Message } from 'discord.js';
import { channelStoreImpl } from '../store';
import { getPermissionOverwriteErrorMessage } from '../utils/discordErrors';
import { formatVcName, stripLockFromName } from '../utils/channelName';
import { log } from '../utils/logger';
import { canEditPermissionOverwrite } from '../utils/roleHierarchy';

export default {
  name: 'lock',
  async execute(message: Message, _args: string[]): Promise<void> {
    const member = message.member;
    const voiceChannel = member?.voice?.channel;

    log.cmd.info(
      `!!lock user=${member?.id ?? 'unknown'} channel=${voiceChannel?.id ?? 'none'}`
    );

    if (!voiceChannel) {
      log.cmd.info(`!!lock validation failed: not in voice channel`);
      await message.reply('You must be in a voice channel to use this command.');
      return;
    }

    const ownerId = await channelStoreImpl.getOwner(voiceChannel.id);
    if (ownerId !== member?.id) {
      log.cmd.info(`!!lock validation failed: not owner (owner=${ownerId})`);
      await message.reply('You can only lock your own temporary voice channel.');
      return;
    }

    try {
      const guild = message.guild!;
      await voiceChannel.permissionOverwrites.edit(guild.id, {
        Connect: false,
      });

      if (canEditPermissionOverwrite(guild, member)) {
        await voiceChannel.permissionOverwrites.edit(member.id, {
          Connect: true,
        });
      }

      const entry = await channelStoreImpl.get(voiceChannel.id);
      for (const userId of entry?.permittedUserIds ?? []) {
        const targetMember = guild.members.cache.get(userId) ?? null;
        if (canEditPermissionOverwrite(guild, targetMember)) {
          await voiceChannel.permissionOverwrites.edit(userId, {
            Connect: true,
          });
        }
      }

      const baseName = stripLockFromName(voiceChannel.name).replace(/'s VC$/, '');
      await voiceChannel.setName(formatVcName(baseName, true));

      log.cmd.info(`!!lock success channel=${voiceChannel.id}`);
      await message.reply('Your voice channel is now locked. Only you and permitted users can join.');
    } catch (error) {
      log.cmd.error('Lock command error:', error);
      const msg = getPermissionOverwriteErrorMessage(
        error,
        'Failed to lock the channel. Make sure the bot has Manage Channels permission.'
      );
      await message.reply(`Failed to lock the channel. ${msg}`);
    }
  },
};
