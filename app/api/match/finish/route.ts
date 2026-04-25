import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateMatchRewards } from "@/lib/game/rewards";
import { calculateVoteBasedRewards } from "@/lib/game/payouts";

export async function POST(req: Request) {
  const { match_id, winner_id, caller_id } = await req.json();

  if (!match_id || !winner_id || !caller_id) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: claimed, error: claimError } = await supabaseAdmin
    .from("matches")
    .update({ status: "processing" })
    .eq("id", match_id)
    .in("status", ["active", "open", "waiting", "lobby"])
    .select()
    .single();

  console.log(
    calculateVoteBasedRewards({
      votesA: 5,
      votesB: 3,
      betAmount: 10,
      creatorId: "A",
      opponentId: "B",
      winnerId: "A",
      votes: [
        { user_id: "u1", vote: "A" },
        { user_id: "u2", vote: "B" },
      ],
    })
  );

  if (!claimed || claimError) {
    return Response.json({ error: "Already processing or finished" }, { status: 400 });
  }

  // 1. Get match
  const { data: match, error } = await supabaseAdmin
    .from("matches")
    .select("*")
    .eq("id", match_id)
    .single();


  const { data: votes } = await supabaseAdmin
    .from("match_votes")
    .select("user_id, vote")
    .eq("match_id", match_id);

  if (!match || error) {
    return Response.json({ error: "Match not found" }, { status: 404 });
  }

  if (match.mode === "pvp" && !match.opponent_id) {
    return Response.json({ error: "No opponent" }, { status: 400 });
  }

  if (!match.creator_id) {
    return Response.json({ error: "No creator" }, { status: 400 });
  }

  if (match.mode === "solo") {
    if (!match.creator_id) {
      return Response.json({ error: "No creator" }, { status: 400 });
    }



    // Only creator is allowed to trigger finish
    // (you may want to pass caller_id later for stricter validation)
  }



  if (!winner_id) {
    return Response.json({ error: "Missing winner_id" }, { status: 400 });
  }

  const isParticipant =
    caller_id === match.creator_id ||
    caller_id === match.opponent_id;
  if (match.mode === "pvp" && !isParticipant) {
    return Response.json({ error: "Not allowed" }, { status: 403 });
  }

  if (match.mode === "pvp" && caller_id !== winner_id) {
    return Response.json(
      { error: "You can only declare yourself as winner" },
      { status: 403 }
    );
  }

  // 2. Determine loser
  let loser_id: string | null = null;
  const isSolo = match.mode === "solo";

  if (match.mode === "pvp") {
    loser_id =
      winner_id === match.creator_id
        ? match.opponent_id
        : match.creator_id;
  } else if (match.mode === "solo") {
    // optional: no loser in solo
    loser_id = null;
  }

  // 3. Get levels
  const { data: winner } = winner_id
    ? await supabaseAdmin
      .from("bounties")
      .select("points")
      .eq("user_id", winner_id)
      .single()
    : { data: null };

  const { data: loser } = loser_id
    ? await supabaseAdmin
      .from("bounties")
      .select("points")
      .eq("user_id", loser_id)
      .single()
    : { data: null };

  const winnerLevel = Math.floor((winner?.points ?? 0) / 100) + 1;
  const loserLevel =
    loser_id && loser
      ? Math.floor((loser.points ?? 0) / 100) + 1
      : winnerLevel; // fallback for solo

  // 4. Rewards
  const rewards = calculateMatchRewards({
    winnerLevel,
    loserLevel,
    bountyPool: match.bounty_pool ?? 0,
    mode: match.mode,
  });


  let correctSide: "A" | "B" | null = null;

  if (match.mode === "pvp") {
    correctSide = winner_id === match.creator_id ? "A" : "B";
  }

  if (match.mode === "solo") {
    // SOLO RULE:
    // creator_id is the "truth source"
    // A = LOSE, B = WIN (from your UI logic)

    const creatorWon = winner_id === match.creator_id;

    correctSide = creatorWon ? "B" : "A";
  }
  if (match.mode === "pvp") {
    await supabaseAdmin.rpc("increment_xp", {
      uid: winner_id,
      amount: rewards.winnerXP,
    });

    await supabaseAdmin.rpc("increment_bounty", {
      uid: winner_id,
      amount: rewards.winnerBounty,
    });

    if (loser_id) {
      await supabaseAdmin.rpc("increment_xp", {
        uid: loser_id,
        amount: rewards.loserXP,
      });

      await supabaseAdmin.rpc("increment_bounty", {
        uid: loser_id,
        amount: rewards.loserBounty,
      });
    }
  } else {
    await supabaseAdmin.rpc("increment_xp", {
      uid: match.creator_id,
      amount: rewards.winnerXP,
    });

    await supabaseAdmin.rpc("increment_bounty", {
      uid: match.creator_id,
      amount: rewards.winnerBounty,
    });
  }

  for (const v of votes ?? []) {
    // ❌ Skip creator in solo mode
    if (match.mode === "solo" && v.user_id === match.creator_id) {
      continue;
    }

    const isCorrect = v.vote === correctSide;

    const pool = match.bounty_pool ?? 0;

    const voterReward = isCorrect
      ? Math.max(1, Math.floor(pool * 0.05))
      : 1;

    await supabaseAdmin.rpc("increment_xp", {
      uid: v.user_id,
      amount: isCorrect ? 10 : 3,
    });

    await supabaseAdmin.rpc("increment_bounty", {
      uid: v.user_id,
      amount: voterReward,
    });
  }
  // 6. Update match (THIS IS THE KEY FIX)
  const { data: updated } = await supabaseAdmin
    .from("matches")
    .update({
      status: "finished",
      winner_id,
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