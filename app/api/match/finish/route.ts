import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateMatchRewards } from "@/lib/game/rewards";

export async function POST(req: Request) {
  const { match_id, winner_id } = await req.json();

  if (!match_id || !winner_id) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
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

  if (match.status === "finished") {
    return Response.json({ error: "Already finished" }, { status: 400 });
  }

  if (!match.opponent_id) {
    return Response.json({ error: "No opponent" }, { status: 400 });
  }

  if (!match.creator_id) {
  return Response.json({ error: "No creator" }, { status: 400 });
}

  // 2. Determine loser
const loser_id =
  match.opponent_id && match.opponent_id !== winner_id
    ? match.opponent_id
    : match.creator_id === winner_id
      ? null
      : match.creator_id;

if (!loser_id) {
  return Response.json({ error: "No valid loser" }, { status: 400 });
}

  // 3. Get levels
  const { data: winner } = await supabaseAdmin
    .from("bounties")
    .select("points")
    .eq("user_id", winner_id)
    .single();

  const { data: loser } = await supabaseAdmin
    .from("bounties")
    .select("points")
    .eq("user_id", loser_id)
    .single();

  const winnerLevel = Math.floor((winner?.points ?? 0) / 100) + 1;
  const loserLevel = Math.floor((loser?.points ?? 0) / 100) + 1;

  // 4. Rewards
  const rewards = calculateMatchRewards({
    winnerLevel,
    loserLevel,
  });

  const { data: votes } = await supabaseAdmin
  .from("match_votes")
  .select("user_id, vote")
  .eq("match_id", match_id);
  const votersA =
  votes?.filter((v) => v.vote === "A") ?? [];

const votersB =
  votes?.filter((v) => v.vote === "B") ?? [];

  const winnerSide =
  winner_id === match.creator_id ? "A" : "B";

  for (const v of votersA) {
  const correct = winnerSide === "A";

  await supabaseAdmin.rpc("increment_xp", {
    uid: v.user_id,
    amount: correct ? 10 : 3,
  });

  if (correct) {
    await supabaseAdmin.rpc("increment_bounty", {
      uid: v.user_id,
      amount: 2,
    });
  }
}

for (const v of votersB) {
  const correct = winnerSide === "B";

  await supabaseAdmin.rpc("increment_xp", {
    uid: v.user_id,
    amount: correct ? 10 : 3,
  });

  if (correct) {
    await supabaseAdmin.rpc("increment_bounty", {
      uid: v.user_id,
      amount: 2,
    });
  }
}

  // 5. Apply XP + bounty
  await supabaseAdmin.rpc("increment_xp", {
    uid: winner_id,
    amount: rewards.winnerXP,
  });

  await supabaseAdmin.rpc("increment_bounty", {
    uid: winner_id,
    amount: rewards.bountyGain,
  });

  await supabaseAdmin.rpc("increment_xp", {
    uid: loser_id,
    amount: rewards.loserXP,
  });

  // 6. Update match (THIS IS THE KEY FIX)
  await supabaseAdmin
    .from("matches")
    .update({
      status: "finished",
      winner_id,
    })
    .eq("id", match_id);

  return Response.json({
    ok: true,
    rewards,
  });
}