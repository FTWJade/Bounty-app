require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.on("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    await interaction.reply("🏓 Pong!");
  }

const supabase = require("./supabaseClient");

if (interaction.commandName === "daily") {
  try {
    const userId = interaction.user.id;

    let { data: user, error } = await supabase
      .from("bounties")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.log("SUPABASE ERROR:", error);
      return interaction.reply("Database error 😢");
    }

    if (!user) {
      const { data: newUser, error: insertError } = await supabase
        .from("bounties")
        .insert({
          user_id: userId,
          points: 0,
          last_login: null,
        })
        .select()
        .single();

      if (insertError) {
        console.log(insertError);
        return interaction.reply("Failed to create user 😢");
      }

      user = newUser;
    }

    const today = new Date().toISOString().split("T")[0];

    let pointsAdded = 0;

    if (user.last_login !== today) {
      pointsAdded = 100;

      const newPoints = (user.points || 0) + 100;

      await supabase
        .from("bounties")
        .update({
          points: newPoints,
          last_login: today,
        })
        .eq("user_id", userId);

      const level = Math.floor(newPoints / 100) + 1;
      const xpIntoLevel = newPoints % 100;

      return interaction.reply(
        `🎉 +${pointsAdded} XP!\n` +
        `⭐ Level: ${level}\n` +
        `📊 XP: ${xpIntoLevel}/100\n` +
        `💰 Total XP: ${newPoints}`
      );
    }

    return interaction.reply("⛔ You already claimed today 🔥");

  } catch (err) {
    console.log("DASHBOARD ERROR:", err);
    return interaction.reply("Unexpected error 😢");
  }
}
});

client.login(process.env.DISCORD_TOKEN);