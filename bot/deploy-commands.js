require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check if bot is alive"),

  new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily XP reward"),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
console.log(process.env.GUILD_ID);
(async () => {
  try {

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("✅ Commands deployed");
  } catch (err) {
    console.error(err);
  }
})();