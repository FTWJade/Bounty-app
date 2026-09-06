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

  // 2. Get all website voters
  const { data: votes } = await supabaseAdmin
    .from("match_votes")
    .select("user_id")
    .eq("match_id", match_id);

  const voterIds = [...new Set(votes?.map(v => v.user_id) || [])];

  // 3. Refund all website voters (existing refund behavior)
  const refundAmount = match.bounty_pool ?? 0;

  for (const userId of voterIds) {
    await supabaseAdmin.rpc("add_points", {
      user_id_input: userId,
      amount_input: refundAmount,
    });
  }

  // 4. Refund paid Twitch votes to their linked bounty.town accounts.
  // Free/anonymous Twitch votes have no bounty_user_id or bet_amount, so there
  // is nothing to refund for them.
  const { data: twitchVotes } = await supabaseAdmin
    .from("twitch_votes")
    .select("bounty_user_id, bet_amount")
    .eq("match_id", match_id)
    .not("bounty_user_id", "is", null)
    .gt("bet_amount", 0);

  for (const twitchVote of twitchVotes || []) {
    if (!twitchVote.bounty_user_id || !twitchVote.bet_amount) continue;

    await supabaseAdmin.rpc("add_points", {
      user_id_input: twitchVote.bounty_user_id,
      amount_input: twitchVote.bet_amount,
    });
  }

  // 5. Refund creator + opponent bets if they exist
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

  // 6. Close match safely
  await supabaseAdmin
    .from("matches")
    .update({
      status: "cancelled",
      winner_id: null,
    })
    .eq("id", match_id);

  return Response.json({ ok: true });
}
