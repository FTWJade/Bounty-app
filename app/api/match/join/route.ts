import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { user_id, match_id, bet_amount } = await req.json();

  if (!user_id || !match_id) {
    return Response.json({ error: "Missing data" }, { status: 400 });
  }

  // 1. Get match
  const { data: match, error } = await supabaseAdmin
    .from("matches")
    .select("*")
    .eq("id", match_id)
    .single();

  if (!match || error) {
    return Response.json({ error: "Match not found" }, { status: 404 });
  }

  // 2. Only allow joining open matches
  if (match.status !== "open") {
    return Response.json({ error: "Match is not open" }, { status: 400 });
  }

  // 3. Prevent creator joining as opponent
  if (match.creator_id === user_id) {
    return Response.json({ error: "You can't join your own match" }, { status: 400 });
  }

  // 4. Bet validation
  if (bet_amount !== match.bounty_pool) {
    return Response.json({ error: "Bet mismatch" }, { status: 400 });
  }

  // 5. 🔒 ATOMIC PvP JOIN (IMPORTANT FIX)
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("matches")
    .update({
      opponent_id: user_id,
      status: "active",
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", match_id)
    .is("opponent_id", null) // 🔒 prevents 3rd player + race condition
    .select()
    .single();

  if (!updated || updateError) {
    return Response.json(
      { error: "Match already taken" },
      { status: 400 }
    );
  }

  return Response.json({
    success: true,
    data: updated,
    role: "opponent",
  });
}