import type { Message } from 'discord.js';
import { channelStore } from '../store/channelStore';
import { sanitizeChannelName } from '../utils/channelName';
import { getPermissionOverwriteErrorMessage } from '../utils/discordErrors';
import { log } from '../utils/logger';
import { canEditPermissionOverwrite } from '../utils/roleHierarchy';

export default {
  name: 'transfer',
  async execute(message: Message, _args: string[]): Promise<void> {
    const member = message.member;
    const voiceChannel = member?.voice?.channel;
    const targetUser = message.mentions.users.first();

    log.cmd.info(
      `!!transfer user=${member?.id ?? 'unknown'} channel=${voiceChannel?.id ?? 'none'} target=${targetUser?.id ?? 'none'}`
    );

    if (!voiceChannel) {
      log.cmd.info(`!!transfer validation failed: not in voice channel`);
      await message.reply('You must be in a voice channel to use this command.');
      return;
    }

    const ownerId = channelStore.getOwner(voiceChannel.id);
    if (ownerId !== member?.id) {
      log.cmd.info(`!!transfer validation failed: not owner (owner=${ownerId})`);
      await message.reply('Only the voice channel owner can transfer ownership.');
      return;
    }

    if (!channelStore.has(voiceChannel.id)) {
      log.cmd.info(`!!transfer validation failed: not a temp VC`);
      await message.reply('This command only works in temporary voice channels.');
      return;
    }

    if (!targetUser) {
      log.cmd.info(`!!transfer validation failed: user not found`);
      await message.reply('Mention a user to transfer ownership to, e.g. `!!transfer @user`');
      return;
    }

    if (targetUser.id === member?.id) {
      log.cmd.info(`!!transfer validation failed: target is self`);
      await message.reply("You're already the owner of this channel.");
      return;
    }

    if (targetUser.bot) {
      log.cmd.info(`!!transfer validation failed: target is bot`);
      await message.reply('You cannot transfer ownership to a bot.');
      return;
    }

    const targetMember = voiceChannel.members.get(targetUser.id);
    if (!targetMember) {
      log.cmd.info(`!!transfer validation failed: target not in VC`);
      await message.reply('The user you want to transfer to must be in your voice channel.');
      return;
    }

    try {
      const guild = message.guild!;
      const hasGuildOverwrite = voiceChannel.permissionOverwrites.cache.has(voiceChannel.guildId);
      if (hasGuildOverwrite) {
        const targetMember = voiceChannel.members.get(targetUser.id)!;
        if (
          !canEditPermissionOverwrite(guild, member) ||
          !canEditPermissionOverwrite(guild, targetMember)
        ) {
          await message.reply(
            "I can't update permission overwrites for users with roles above mine. The bot needs Administrator permission or a higher role."
          );
          return;
        }
      }

      const oldOwnerId = member.id;
      channelStore.setOwner(voiceChannel.id, targetUser.id);

      const baseName = sanitizeChannelName(targetUser.username);
      await voiceChannel.setName(`${baseName}'s VC`);

      if (hasGuildOverwrite) {
        await voiceChannel.permissionOverwrites.delete(oldOwnerId);
        await voiceChannel.permissionOverwrites.edit(targetUser.id, { Connect: true });
      }

      log.cmd.info(`!!transfer success channel=${voiceChannel.id} newOwner=${targetUser.id}`);
      await message.reply(`Ownership transferred to ${targetUser.tag}.`);
    } catch (error) {
      log.cmd.error('Transfer command error:', error);
      const msg = getPermissionOverwriteErrorMessage(
        error,
        'Failed to transfer ownership. Make sure the bot has Manage Channels permission.'
      );
      await message.reply(`Failed to transfer ownership. ${msg}`);
    }
  },
};
