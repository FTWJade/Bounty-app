import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const body = await req.json();
  const { user_id, match_id, bet_amount } = body;

  if (!user_id || !match_id) {
    return new Response("Missing data", { status: 400 });
  }

  // 1. get match
  const { data: match, error: matchError } = await supabaseAdmin
    .from("matches")
    .select("*")
    .eq("id", match_id)
    .single();

  if (matchError || !match) {
    return new Response("Match not found", { status: 404 });
  }

  if (match.status !== "open") {
    return new Response("Match is not open", { status: 400 });
  }

  // 2. enforce bet match
  if (bet_amount !== match.bounty_pool) {
    return new Response("Bet must match creator bet", { status: 400 });
  }

  // 3. join match
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

  return Response.json({ data, error });
}