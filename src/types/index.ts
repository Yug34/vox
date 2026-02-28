import type { Message } from 'discord.js';

export interface Command {
  name: string;
  execute: (message: Message, args: string[]) => Promise<void>;
}

export interface Event {
  name: string;
  once?: boolean;
  execute: (...args: unknown[]) => Promise<void>;
}
