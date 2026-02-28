import type { Message } from 'discord.js';
import { channelStore } from '../store/channelStore';
import { log } from '../utils/logger';

export default {
  name: 'unmute',
  async execute(message: Message, _args: string[]): Promise<void> {
    const member = message.member;
    const voiceChannel = member?.voice?.channel;
    const targetUser = message.mentions.users.first();

    log.cmd.info(
      `!!unmute user=${member?.id ?? 'unknown'} channel=${voiceChannel?.id ?? 'none'} target=${targetUser?.id ?? 'none'}`
    );

    if (!voiceChannel) {
      log.cmd.info(`!!unmute validation failed: not in voice channel`);
      await message.reply('You must be in a voice channel to use this command.');
      return;
    }

    if (!channelStore.has(voiceChannel.id)) {
      log.cmd.info(`!!unmute validation failed: not a temp VC`);
      await message.reply('This command only works in temporary voice channels.');
      return;
    }

    const ownerId = channelStore.getOwner(voiceChannel.id);
    if (ownerId !== member?.id) {
      log.cmd.info(`!!unmute validation failed: not owner (owner=${ownerId})`);
      await message.reply('Only the voice channel owner can unmute users.');
      return;
    }

    if (!targetUser) {
      log.cmd.info(`!!unmute validation failed: user not found`);
      await message.reply('Mention a user to unmute, e.g. `!!unmute @user`');
      return;
    }

    const targetMember = voiceChannel.members.get(targetUser.id);
    if (!targetMember) {
      log.cmd.info(`!!unmute validation failed: target not in VC`);
      await message.reply('That user must be in your voice channel to unmute them.');
      return;
    }

    try {
      await targetMember.voice.setMute(false);
      log.cmd.info(`!!unmute success channel=${voiceChannel.id} target=${targetUser.id}`);
      await message.reply(`${targetUser.tag} has been unmuted.`);
    } catch (error) {
      log.cmd.error('Unmute command error:', error);
      await message.reply(
        'Failed to unmute the user. Make sure the bot has Mute Members permission.'
      );
    }
  },
};
