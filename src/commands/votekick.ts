import type { Message } from 'discord.js';
import config from '../../config';
import { channelStore } from '../store/channelStore';
import { votekickStore } from '../store/votekickStore';
import { log } from '../utils/logger';

export default {
  name: 'votekick',
  async execute(message: Message, _args: string[]): Promise<void> {
    const member = message.member;
    const voiceChannel = member?.voice?.channel;
    const targetUser = message.mentions.users.first();

    log.cmd.info(
      `!!votekick user=${member?.id ?? 'unknown'} channel=${voiceChannel?.id ?? 'none'} target=${targetUser?.id ?? 'none'}`
    );

    if (!voiceChannel) {
      log.cmd.info(`!!votekick validation failed: not in voice channel`);
      await message.reply('You must be in a voice channel to use this command.');
      return;
    }

    const ownerId = channelStore.getOwner(voiceChannel.id);
    if (ownerId !== member?.id) {
      log.cmd.info(`!!votekick validation failed: not owner (owner=${ownerId})`);
      await message.reply('Only the voice channel owner can start a votekick.');
      return;
    }

    if (!channelStore.has(voiceChannel.id)) {
      log.cmd.info(`!!votekick validation failed: not a temp VC`);
      await message.reply('This command only works in temporary voice channels.');
      return;
    }

    if (!targetUser) {
      log.cmd.info(`!!votekick validation failed: user not found`);
      await message.reply('Mention a user to votekick, e.g. `!!votekick @user`');
      return;
    }

    if (targetUser.id === member?.id) {
      log.cmd.info(`!!votekick validation failed: target is owner`);
      await message.reply("You cannot votekick yourself.");
      return;
    }

    if (targetUser.bot) {
      log.cmd.info(`!!votekick validation failed: target is bot`);
      await message.reply('You cannot votekick bots.');
      return;
    }

    const targetMember = voiceChannel.members.get(targetUser.id);
    if (!targetMember) {
      log.cmd.info(`!!votekick validation failed: target not in VC`);
      await message.reply('That user must be in your voice channel to votekick them.');
      return;
    }

    if (votekickStore.has(voiceChannel.id)) {
      log.cmd.info(`!!votekick validation failed: votekick already active`);
      await message.reply('A votekick is already in progress for this channel.');
      return;
    }

    if (!message.channel.isSendable()) {
      log.cmd.info(`!!votekick validation failed: channel not sendable`);
      await message.reply('This command must be run from a text channel.');
      return;
    }

    const textChannel = message.channel;
    const durationHours = config.votekickDurationHours;
    const durationMs = durationHours * 3600 * 1000;

    try {
      const pollMsg = await textChannel.send({
        content: `Votekick: Should **${targetUser.tag}** be removed from the voice channel?`,
        poll: {
          question: { text: `Votekick ${targetUser.tag} from VC?` },
          answers: [{ text: 'Yes' }, { text: 'No' }],
          duration: durationHours,
          allowMultiselect: false,
        },
      });

      const channelId = voiceChannel.id;
      const timeoutId = setTimeout(async () => {
        votekickStore.remove(channelId);

        try {
          const fetchedMsg = await textChannel.messages.fetch(pollMsg.id);
          const poll = fetchedMsg.poll;
          if (!poll) return;

          const yesAnswer = poll.answers.find((a) => a.text === 'Yes');
          const noAnswer = poll.answers.find((a) => a.text === 'No');
          const yesCount = yesAnswer?.voteCount ?? 0;
          const noCount = noAnswer?.voteCount ?? 0;

          if (yesCount > noCount) {
            const guild = message.guild;
            const currentTarget = guild?.members.cache.get(targetUser.id);
            if (currentTarget?.voice.channelId === channelId) {
              await currentTarget.voice.setChannel(null);
              await textChannel.send(`${targetUser.tag} was votekicked from the voice channel.`);
            }
          } else {
            await textChannel.send(`Votekick failed. ${targetUser.tag} stays in the voice channel.`);
          }
        } catch (error) {
          log.cmd.error('Votekick expiry handler error:', error);
        }
      }, durationMs);

      votekickStore.set(voiceChannel.id, {
        targetUserId: targetUser.id,
        channelId: voiceChannel.id,
        textChannelId: message.channel.id,
        messageId: pollMsg.id,
        timeoutId,
      });

      log.cmd.info(`!!votekick success channel=${voiceChannel.id} target=${targetUser.id}`);
      await message.reply(`Votekick poll started. Voting ends in ${durationHours} hour(s).`);
    } catch (error) {
      log.cmd.error('Votekick command error:', error);
      await message.reply('Failed to create the votekick poll.');
    }
  },
};
