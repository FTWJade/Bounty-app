require("dotenv").config();

// Discord bot tools
const { Client, GatewayIntentBits } = require("discord.js");

// Your Supabase database connection
const supabase = require("./supabaseClient");

// Create the Discord bot client
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});


// ======================================================
// 🧮 HELPER FUNCTIONS (small reusable tools)
// ======================================================

// Turn XP into a level
// Example: 0–99 XP = level 1, 100–199 XP = level 2
function getLevel(xp) {
  return Math.floor(xp / 100) + 1;
}

// Get how much XP is inside the current level
// Example: 150 XP → 50/100 into level 2
function getXPIntoLevel(xp) {
  return xp % 100;
}


// ======================================================
// 🤖 BOT START EVENT
// ======================================================

client.on("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});


// ======================================================
// ⚡ COMMAND HANDLER (this runs when user uses /commands)
// ======================================================

client.on("interactionCreate", async (interaction) => {
  // Ignore anything that is NOT a slash command
  if (!interaction.isChatInputCommand()) return;


  // ------------------------------------------------------
  // 🏓 /ping command (just for testing)
  // ------------------------------------------------------
  if (interaction.commandName === "ping") {
    await interaction.reply("🏓 Pong!");
  }


  // ------------------------------------------------------
  // 🎮 /daily command (XP reward system)
  // ------------------------------------------------------
  if (interaction.commandName === "daily") {
    try {
      // Who clicked the command
      const userId = interaction.user.id;

        const username =
          interaction.user.globalName ||
          interaction.user.username ||
          "unknown";
      // ====================================================
      // 1. Get user from database
      // ====================================================
      let { data: user, error } = await supabase
        .from("bounties")
        .select("*")
        .eq("user_id", userId)
        .single();

      // If database error (but not "user not found")
      if (error && error.code !== "PGRST116") {
        console.log("SUPABASE ERROR:", error);
        return interaction.reply("Database error 😢");
      }

      // ====================================================
      // 2. If user does NOT exist yet → create them
      // ====================================================
      if (!user) {
        const { data: newUser, error: insertError } = await supabase
          .from("bounties")
          .insert({
            user_id: userId,
            username: username,
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

      // ====================================================
      // 3. Check if user already claimed today
      // ====================================================
      const today = new Date().toISOString().split("T")[0];

      if (user.last_login === today) {
        return interaction.reply("⛔ You already claimed today 🔥");
      }

      // ====================================================
      // 4. XP CALCULATION (core game logic)
      // ====================================================

      const oldXP = user.points || 0;
      const oldLevel = getLevel(oldXP);

      const newXP = oldXP + 100; // daily reward = +100 XP
      const newLevel = getLevel(newXP);

      // ====================================================
      // 5. Save updated XP to database
      // ====================================================
      await supabase
        .from("bounties")
        .update({
          points: newXP,
          last_login: today,
          username: username,
        })
        .eq("user_id", userId);
      // ====================================================
      // 6. LEVEL UP CHECK
      // ====================================================
      let rewardMessage = "";

      if (newLevel > oldLevel) {
        rewardMessage = `\n🎉 LEVEL UP! You are now level ${newLevel}!`;

        // (future idea: give rewards here 💰)
        // example: +$25 bounty, unlock item, etc.
      }

      // ====================================================
      // 7. XP progress inside current level
      // ====================================================
      const xpIntoLevel = getXPIntoLevel(newXP);

      // ====================================================
      // 8. Send message back to Discord
      // ====================================================
      return interaction.reply(
        `🎉 +100 XP!\n` +
        `⭐ Level: ${newLevel}\n` +
        `📊 XP: ${xpIntoLevel}/100\n` +
        `💰 Total XP: ${newXP}` +
        rewardMessage
      );

    } catch (err) {
      console.log("ERROR:", err);
      return interaction.reply("Unexpected error 😢");
    }
  }
});


// ======================================================
// 🔐 LOGIN BOT
// ======================================================
client.login(process.env.DISCORD_TOKEN);