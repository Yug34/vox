import { Events } from "discord.js";
import config from "../../config";
import { log } from "../utils/logger";

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: import("discord.js").Client<true>): Promise<void> {
    log.ready.info(`Logged in as ${client.user.tag}`);
    log.ready.info(`Command prefix: ${config.commandPrefix}`);
  },
};
