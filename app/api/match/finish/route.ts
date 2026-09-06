import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateSoloRewards } from "@/lib/game/soloRewards";
import { calculatePvPRewards } from "@/lib/game/payoutsPvp";

export async function POST(req: Request) {
  const { match_id, winner_id, caller_id } = await req.json();

  if (!match_id || !caller_id) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  // 🔒 Lock match
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from("matches")
    .update({ status: "processing" })
    .eq("id", match_id)
    .in("status", ["active", "open", "waiting", "lobby"])
    .select()
    .single();

  if (!claimed || claimError) {
    return Response.json({ error: "Already processing or finished" }, { status: 400 });
  }

  // 📦 Get match
  const { data: match, error } = await supabaseAdmin
    .from("matches")
    .select("*")
    .eq("id", match_id)
    .single();

  if (!match || error) {
    return Response.json({ error: "Match not found" }, { status: 404 });
  }

  const finalWinnerId = winner_id;
  const entryFee = Number(match.bet_amount ?? 0);

  // 📦 Get website votes and their actual paid amounts.
  const { data: votes } = await supabaseAdmin
    .from("match_votes")
    .select("user_id, vote, bet_amount")
    .eq("match_id", match_id);

  // 📦 Get paid Twitch votes.
  // Free/anonymous Twitch votes are audience votes only and do not receive bounty rewards.
  const { data: twitchVotes } = await supabaseAdmin
    .from("twitch_votes")
    .select("bounty_user_id, vote, bet_amount")
    .eq("match_id", match_id)
    .gt("bet_amount", 0)
    .not("bounty_user_id", "is", null);

  const allVotes = votes ?? [];

  // Twitch-linked voters use the same reward path as website voters.
  // If someone voted through both platforms, count them only once.
  const websiteVoterIds = new Set(allVotes.map(v => v.user_id));

  const paidTwitchVotes = (twitchVotes ?? [])
    .filter(v => v.bounty_user_id && !websiteVoterIds.has(v.bounty_user_id))
    .map(v => ({
      user_id: v.bounty_user_id as string,
      vote: v.vote as "A" | "B",
      bet_amount: Number(v.bet_amount ?? 0),
    }));

  const combinedVotes = [
    ...allVotes.map(v => ({
      user_id: v.user_id,
      vote: v.vote as "A" | "B",
      bet_amount: Number(v.bet_amount ?? entryFee),
    })),
    ...paidTwitchVotes,
  ];

  const voteData = match.mode === "solo"
    ? combinedVotes.filter(v => v.user_id !== match.creator_id)
    : combinedVotes;

  // 💰 Build the pool from the money that was actually paid into this match.
  // This avoids relying on a stale/incomplete bounty_pool value when rewarding.
  const creatorPaid = entryFee;
  const opponentPaid = match.mode === "pvp" && match.opponent_id ? entryFee : 0;
  const voterPaid = combinedVotes.reduce(
    (sum, vote) => sum + Math.max(0, Number(vote.bet_amount ?? 0)),
    0
  );
  const actualPool = Math.max(0, creatorPaid + opponentPaid + voterPaid);

  // 🔐 Validation
  const isParticipant =
    caller_id === match.creator_id ||
    caller_id === match.opponent_id;

  if (match.mode === "pvp" && !match.opponent_id) {
    return Response.json({ error: "No opponent" }, { status: 400 });
  }

  if (match.mode === "pvp" && !isParticipant) {
    return Response.json({ error: "Not allowed" }, { status: 403 });
  }

  if (match.mode === "pvp" && caller_id !== winner_id) {
    return Response.json(
      { error: "You can only declare yourself as winner" },
      { status: 403 }
    );
  }

  // 💰 Rewards
  let rewards: Record<string, { xp: number; bounty: number }> = {};

  if (match.mode === "solo") {
    const result = calculateSoloRewards({
      betAmount: actualPool,
      entryFee,
      creatorId: match.creator_id,
      votes: voteData,
      creatorOutcome: winner_id ? "WIN" : "LOSE",
    });
    rewards = result.rewards;

  } else {
    const result = calculatePvPRewards({
      votes: voteData,
      creatorId: match.creator_id,
      opponentId: match.opponent_id,
      winnerId: finalWinnerId,
      betAmount: actualPool,
      entryFee,
    });

    rewards = result.rewards;
  }

  // 💸 Pay everyone
  for (const userId in rewards) {
    const reward = rewards[userId];

    await supabaseAdmin.rpc("increment_xp", {
      uid: userId,
      amount: reward.xp,
    });

    await supabaseAdmin.rpc("increment_bounty", {
      uid: userId,
      amount: reward.bounty,
    });
  }

  // ✅ Finish match
  const { data: updated } = await supabaseAdmin
    .from("matches")
    .update({
      status: "finished",
      winner_id: finalWinnerId,
    })
    .eq("id", match_id)
    .neq("status", "finished")
    .select()
    .single();

  if (!updated) {
    return Response.json({ error: "Already finished" }, { status: 400 });
  }

  return Response.json({
    ok: true,
    rewards,
  });
}