import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { match_id, caller_id } = await req.json();

  if (!match_id || !caller_id) {
    return Response.json({ error: "Missing data" }, { status: 400 });
  }

  const { data: match, error } = await supabaseAdmin
    .from("matches")
    .select("*")
    .eq("id", match_id)
    .single();

  if (error || !match) {
    return Response.json({ error: "Match not found" }, { status: 404 });
  }

  const now = Date.now();
  const TIMEOUT = 10 * 1000; // 10 seconds

  if (!match.last_activity_at) {
    return Response.json({ error: "No activity data" }, { status: 400 });
  }

  const last = new Date(match.last_activity_at).getTime();

  // ✅ If activity is recent → do nothing
  await supabaseAdmin
    .from("matches")
    .update({
      status: "cancelled",
    })
    .eq("id", match_id);

  // 🏆 Decide winner = caller (the one still here)
  const winner_id = caller_id;

  // ❌ Loser = the other player
  const loser_id =
    caller_id === match.creator_id
      ? match.opponent_id
      : match.creator_id;

  // 🏁 Finish match
  await supabaseAdmin
    .from("matches")
    .update({
      status: "finished",
      winner_id,
    })
    .eq("id", match_id);

  // ⭐ Give XP (basic version)
  if (winner_id) {
    await supabaseAdmin.rpc("add_points", {
      user_id_input: winner_id,
      amount_input: 50,
    });
  }

  if (loser_id) {
    await supabaseAdmin.rpc("add_points", {
      user_id_input: loser_id,
      amount_input: 10,
    });
  }

  return Response.json({ winner_id });
}