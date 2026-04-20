import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const code = searchParams.get("code");
  const userId = searchParams.get("state");

  if (!code || !userId) {
    return new Response("Missing code or state", { status: 400 });
  }

  // 1. Exchange code for token
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI!,
    }),
  });

  const tokenData = await tokenRes.json();

  // 2. Get Discord user
  const discordRes = await fetch("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  const discordUser = await discordRes.json();

  console.log("DISCORD USER:", discordUser);

const check = await supabaseAdmin
  .from("bounties")
  .select("*")
  .eq("user_id", userId);

console.log("FOUND ROWS:", check);

  // 3. UPDATE
const result = await supabaseAdmin
  .from("bounties")
  .upsert(
    {
      user_id: String(userId),
      discord_id: discordUser.id,
      username: discordUser.username,
      avatar_url: discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null,
    },
    {
      onConflict: "user_id",
    }
  )
  .select();

console.log("UPSERT RESULT:", result);

  // 4. Redirect back
  return Response.redirect(
    new URL("/?discord=linked", req.url)
  );
}