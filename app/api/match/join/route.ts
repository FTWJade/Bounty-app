import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { user_id, match_id, bet_amount } = await req.json();

  if (!user_id || !match_id) {
    return new Response("Missing data", { status: 400 });
  }

  const { data: match, error } = await supabaseAdmin
    .from("matches")
    .select("*")
    .eq("id", match_id)
    .single();

  if (error || !match) {
    return new Response("Match not found", { status: 404 });
  }

  // ⚠️ Only validate bet for participants, NOT voters
  const isCreator = match.creator_id === user_id;
  const isOpponent = match.opponent_id === user_id;

  const isParticipant = isCreator || isOpponent;

  if (isParticipant && bet_amount !== match.bounty_pool) {
    return new Response("Bet must match creator bet", { status: 400 });
  }

  // 🧠 CASE 1: fill opponent slot (ONLY FIRST SECOND PLAYER)
  if (!match.opponent_id && user_id !== match.creator_id) {
    const { data, error } = await supabaseAdmin
      .from("matches")
      .update({
        opponent_id: user_id,
        status: "active",
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", match_id)
      .select()
      .single();

    return Response.json({ data, role: "opponent", error });
  }

  // 🧠 CASE 2: everyone else = voter (ALWAYS ALLOWED)
  await supabaseAdmin.from("match_votes").upsert({
    match_id,
    user_id,
  });

  // check bounty
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("bounty")
    .eq("id", user_id)
    .single();

  if (!user || user.bounty < bet_amount) {
    return Response.json({ error: "Not enough bounty" }, { status: 400 });
  }

  // deduct
  await supabaseAdmin
    .from("users")
    .update({
      bounty: user.bounty - bet_amount
    })
    .eq("id", user_id);

  // add to pool
  await supabaseAdmin
    .from("matches")
    .update({
      opponent_id: user_id,
      bounty_pool: supabaseAdmin.rpc("increment", {
        x: bet_amount
      })
    })
    .eq("id", match_id);

  return Response.json({
    success: true,
    role: "voter",
  });
}