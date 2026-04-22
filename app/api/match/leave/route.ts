import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { match_id, user_id } = await req.json();

  if (!match_id || !user_id) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  // 1. get match
  const { data: match } = await supabaseAdmin
    .from("matches")
    .select("*")
    .eq("id", match_id)
    .single();

  if (!match) {
    return Response.json({ error: "Match not found" }, { status: 404 });
  }

  // 2. check if creator or opponent is leaving
  const isCreator = match.creator_id === user_id;
  const isOpponent = match.opponent_id === user_id;

  if (!isCreator && !isOpponent) {
    return Response.json({ error: "Not in match" }, { status: 400 });
  }

  // 3. if opponent leaves → END MATCH
  const shouldEndMatch = isOpponent || isCreator;

  if (shouldEndMatch) {
    await supabaseAdmin
      .from("matches")
      .update({
        status: "cancelled",
        opponent_id: null,
      })
      .eq("id", match_id);
  }

  return Response.json({ ok: true });
}