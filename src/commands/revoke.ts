import type { Message } from 'discord.js';
import { channelStore } from '../store/channelStore';
import { getPermissionOverwriteErrorMessage } from '../utils/discordErrors';
import { log } from '../utils/logger';
import { canEditPermissionOverwrite } from '../utils/roleHierarchy';

export default {
  name: 'revoke',
  async execute(message: Message, _args: string[]): Promise<void> {
    const member = message.member;
    const voiceChannel = member?.voice?.channel;
    const targetUser = message.mentions.users.first();

    log.cmd.info(
      `!!revoke user=${member?.id ?? 'unknown'} channel=${voiceChannel?.id ?? 'none'} target=${targetUser?.id ?? 'none'}`
    );

    if (!voiceChannel) {
      log.cmd.info(`!!revoke validation failed: not in voice channel`);
      await message.reply('You must be in a voice channel to use this command.');
      return;
    }

    if (!targetUser) {
      log.cmd.info(`!!revoke validation failed: user not found`);
      await message.reply('Mention a user to revoke, e.g. `!!revoke @user`');
      return;
    }

    const ownerId = channelStore.getOwner(voiceChannel.id);
    if (ownerId !== member?.id) {
      log.cmd.info(`!!revoke validation failed: not owner (owner=${ownerId})`);
      await message.reply('You can only revoke users in your own temporary voice channel.');
      return;
    }

    const entry = channelStore.get(voiceChannel.id);
    if (!entry?.permittedUserIds.has(targetUser.id)) {
      log.cmd.info(`!!revoke validation failed: user not on permitted list`);
      await message.reply('That user is not on the permitted list.');
      return;
    }

    try {
      const guild = message.guild!;
      const targetMember =
        guild.members.cache.get(targetUser.id) ??
        (await guild.members.fetch(targetUser.id).catch(() => null));
      if (!canEditPermissionOverwrite(guild, targetMember)) {
        await message.reply(
          "I can't remove permission overwrites for users with roles above mine. The bot needs Administrator permission or a higher role."
        );
        return;
      }

      channelStore.removePermitted(voiceChannel.id, targetUser.id);
      await voiceChannel.permissionOverwrites.delete(targetUser.id);

      log.cmd.info(`!!revoke success channel=${voiceChannel.id} revoked=${targetUser.id}`);
      await message.reply(`${targetUser.tag} has been removed from the permitted list.`);
    } catch (error) {
      log.cmd.error('Revoke command error:', error);
      const msg = getPermissionOverwriteErrorMessage(
        error,
        'Failed to revoke the user. Make sure the bot has Manage Channels permission.'
      );
      await message.reply(`Failed to revoke the user. ${msg}`);
    }
  },
};
