import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { user_id, mode, bet_amount, title } = await req.json();

  if (!user_id) {
    return Response.json({ error: "Missing user_id" }, { status: 400 });
  }

  if (!bet_amount || bet_amount <= 0) {
    return Response.json({ error: "Invalid bet_amount" }, { status: 400 });
  }

  const { data: user, error } = await supabaseAdmin
    .from("bounties")
    .select("bounty")
    .eq("user_id", user_id)
    .maybeSingle();

  if (error || !user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  if (user.bounty < bet_amount) {
    return Response.json({ error: "Not enough bounty" }, { status: 400 });
  }

  const matchId = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data: match, error: matchError } = await supabaseAdmin
    .from("matches")
    .insert({
      id: matchId,
      creator_id: user_id,
      opponent_id: null,
      status: "open",
      mode: mode || "pvp",
      title: title || null,
      bet_amount,
      bounty_pool: bet_amount,
      last_activity_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (matchError || !match) {
    return Response.json({ error: "Failed to create match" }, { status: 500 });
  }

  await supabaseAdmin
    .from("bounties")
    .update({
      bounty: user.bounty - bet_amount,
    })
    .eq("user_id", user_id);

  return Response.json({ data: match });
}
