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

  // 📦 Get votes
  const { data: votes } = await supabaseAdmin
    .from("match_votes")
    .select("user_id, vote")
    .eq("match_id", match_id);

  const allVotes = votes ?? [];

  const voteData = match.mode === "solo"
    ? allVotes.filter(v => v.user_id !== match.creator_id)
    : allVotes;

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

  const votesA = voteData.filter(v => v.vote === "A").length;
  const votesB = voteData.filter(v => v.vote === "B").length;

  // 💰 Rewards
  let rewards: Record<string, { xp: number; bounty: number }> = {};

  if (match.mode === "solo") {
    const result = calculateSoloRewards({
      betAmount: match.bounty_pool ?? 0,
      creatorId: match.creator_id,
      votes: voteData,
    });
    rewards = result.rewards;

  } else {
    const result = calculatePvPRewards({
      votes: voteData,
      creatorId: match.creator_id,
      opponentId: match.opponent_id,
      winnerId: finalWinnerId,
      betAmount: match.bounty_pool ?? 0,
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