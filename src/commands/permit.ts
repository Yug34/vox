import type { Message } from 'discord.js';
import { channelStore } from '../store/channelStore';
import { getPermissionOverwriteErrorMessage } from '../utils/discordErrors';
import { log } from '../utils/logger';
import { canEditPermissionOverwrite } from '../utils/roleHierarchy';

export default {
  name: 'permit',
  async execute(message: Message, args: string[]): Promise<void> {
    const member = message.member;
    const voiceChannel = member?.voice?.channel;
    const targetUser = message.mentions.users.first();

    log.cmd.info(
      `!!permit user=${member?.id ?? 'unknown'} channel=${voiceChannel?.id ?? 'none'} target=${targetUser?.id ?? 'none'}`
    );

    if (!voiceChannel) {
      log.cmd.info(`!!permit validation failed: not in voice channel`);
      await message.reply('You must be in a voice channel to use this command.');
      return;
    }

    if (!targetUser) {
      log.cmd.info(`!!permit validation failed: user not found`);
      await message.reply('Mention a user to permit, e.g. `!!permit @user`');
      return;
    }

    const ownerId = channelStore.getOwner(voiceChannel.id);
    if (ownerId !== member?.id) {
      log.cmd.info(`!!permit validation failed: not owner (owner=${ownerId})`);
      await message.reply('You can only permit users in your own temporary voice channel.');
      return;
    }

    if (targetUser.id === member?.id) {
      log.cmd.info(`!!permit validation failed: target is owner`);
      await message.reply("You're already the owner of this channel.");
      return;
    }

    if (targetUser.bot) {
      log.cmd.info(`!!permit validation failed: target is bot`);
      await message.reply('You cannot permit bots.');
      return;
    }

    try {
      const guild = message.guild!;
      const targetMember =
        guild.members.cache.get(targetUser.id) ??
        (await guild.members.fetch(targetUser.id).catch(() => null));
      if (!canEditPermissionOverwrite(guild, targetMember)) {
        await message.reply(
          "I can't add permission overwrites for users with roles above mine. The bot needs Administrator permission or a higher role."
        );
        return;
      }

      channelStore.addPermitted(voiceChannel.id, targetUser.id);
      await voiceChannel.permissionOverwrites.edit(targetUser.id, {
        Connect: true,
      });

      log.cmd.info(`!!permit success channel=${voiceChannel.id} permitted=${targetUser.id}`);
      await message.reply(`${targetUser.tag} can now join your voice channel when it's locked.`);
    } catch (error) {
      log.cmd.error('Permit command error:', error);
      const msg = getPermissionOverwriteErrorMessage(
        error,
        'Failed to permit the user. Make sure the bot has Manage Channels permission.'
      );
      await message.reply(`Failed to permit the user. ${msg}`);
    }
  },
};
