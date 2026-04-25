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

  if (match.status !== "open") {
    return new Response("Match is not open", { status: 400 });
  }

  if (bet_amount !== match.bounty_pool) {
    return new Response("Bet must match creator bet", { status: 400 });
  }

  // 🧠 CASE 1: fill opponent slot (ONLY FIRST JOINER)
  if (!match.opponent_id) {
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

  // 🧠 CASE 2: voter join (DO NOT MODIFY MATCH)
  // just ensure they exist in vote system
  await supabaseAdmin
    .from("match_votes")
    .upsert({
      match_id,
      user_id,
    });

  return Response.json({
    success: true,
    role: "voter",
  });
}