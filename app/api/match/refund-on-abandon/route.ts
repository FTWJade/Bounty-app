import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { match_id } = await req.json();

  if (!match_id) {
    return Response.json({ error: "Missing match_id" }, { status: 400 });
  }

  // 1. Get match
  const { data: match, error } = await supabaseAdmin
    .from("matches")
    .select("*")
    .eq("id", match_id)
    .single();

  if (error || !match) {
    return Response.json({ error: "Match not found" }, { status: 404 });
  }

  // 2. Get all voters
  const { data: votes } = await supabaseAdmin
    .from("match_votes")
    .select("user_id")
    .eq("match_id", match_id);

  const voterIds = [...new Set(votes?.map(v => v.user_id) || [])];

  // 3. Refund all voters (example: +bet_amount or fixed refund logic)
  // If you store bet per user, adjust this accordingly
  const refundAmount = match.bounty_pool ?? 0;

  for (const userId of voterIds) {
    await supabaseAdmin.rpc("add_points", {
      user_id_input: userId,
      amount_input: refundAmount,
    });
  }

  // 4. Refund creator + opponent bets if they exist
  if (match.creator_id) {
    await supabaseAdmin.rpc("add_points", {
      user_id_input: match.creator_id,
      amount_input: match.bet_amount ?? 0,
    });
  }

  if (match.opponent_id) {
    await supabaseAdmin.rpc("add_points", {
      user_id_input: match.opponent_id,
      amount_input: match.bet_amount ?? 0,
    });
  }

  // 5. Close match safely
  await supabaseAdmin
    .from("matches")
    .update({
      status: "cancelled",
      winner_id: null,
    })
    .eq("id", match_id);

  return Response.json({ ok: true });
}