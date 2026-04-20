import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { match_id, winner_id } = await req.json();

  if (!match_id || !winner_id) {
    return new Response("Missing fields", { status: 400 });
  }

  const { data: match } = await supabaseAdmin
    .from("matches")
    .select("*")
    .eq("id", match_id)
    .single();

  if (!match) {
    return new Response("Match not found", { status: 404 });
  }

  // ❌ MUST HAVE 2 PLAYERS
  if (!match.opponent_id) {
    return new Response("Cannot finish match: no opponent", { status: 400 });
  }

  const loser_id =
    match.creator_id === winner_id
      ? match.opponent_id
      : match.creator_id;

  // 🏆 winner
  await supabaseAdmin.rpc("increment_xp", {
    uid: winner_id,
    amount: 50,
  });

  await supabaseAdmin.rpc("increment_bounty", {
    uid: winner_id,
    amount: 10,
  });

  // 💀 loser
  await supabaseAdmin.rpc("increment_xp", {
    uid: loser_id,
    amount: 10,
  });

  await supabaseAdmin
    .from("matches")
    .update({
      status: "finished",
      winner_id,
    })
    .eq("id", match_id);

  return Response.json({ ok: true });
}