import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { match_id } = await req.json();

  const { data: match, error } = await supabaseAdmin
    .from("matches")
    .select("*")
    .eq("id", match_id)
    .single();

  if (error || !match) {
    return Response.json({ error: "Match not found" }, { status: 404 });
  }

  let winner_id = null;

  // 🧠 Decide winner based on who is still in match
  if (match.creator_id && !match.opponent_id) {
    winner_id = match.creator_id;
  } else if (!match.creator_id && match.opponent_id) {
    winner_id = match.opponent_id;
  }

  // If BOTH players gone → cancel
  if (!winner_id) {
    await supabaseAdmin
      .from("matches")
      .update({ status: "cancelled" })
      .eq("id", match_id);

    return Response.json({ cancelled: true });
  }

  // 🏆 Finish match with winner
  await supabaseAdmin
    .from("matches")
    .update({
      status: "finished",
      winner_id,
    })
    .eq("id", match_id);

  return Response.json({ winner_id });
}