const ctx = (name: string) => ({
  info: (msg: string, ...args: unknown[]) =>
    console.log(`[${new Date().toISOString()}] [${name}]`, msg, ...args),
  warn: (msg: string, ...args: unknown[]) =>
    console.warn(`[${new Date().toISOString()}] [${name}]`, msg, ...args),
  error: (msg: string, ...args: unknown[]) =>
    console.error(`[${new Date().toISOString()}] [${name}]`, msg, ...args),
});

export const log = {
  voice: ctx('VoiceState'),
  store: ctx('ChannelStore'),
  cmd: ctx('Command'),
  ready: ctx('Ready'),
};
