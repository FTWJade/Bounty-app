import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateMatchRewards } from "@/lib/game/rewards";

export async function POST(req: Request) {
  const { match_id, winner_id } = await req.json();

  if (!match_id) {
    return Response.json({ error: "Missing match_id" }, { status: 400 });
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

  const { data: votes } = await supabaseAdmin
    .from("match_votes")
    .select("user_id, vote")
    .eq("match_id", match_id);

  // 2. Determine loser
  let loser_id: string | null = null;
  const isSolo = match.mode === "solo";
  if (match.mode === "pvp") {
    loser_id =
      winner_id === match.creator_id
        ? match.opponent_id
        : match.creator_id;
  }

  if (match.mode === "solo") {
    // optional: no loser in solo
    loser_id = null;
  }

  // 3. Get levels
  const { data: winner } = await supabaseAdmin
    .from("bounties")
    .select("points")
    .eq("user_id", winner_id)
    .single();

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
  });

  if (isSolo) {
    const correctAnswer = winner_id === match.creator_id ? "A" : "B";

    for (const v of votes ?? []) {
      const isCorrect = v.vote === correctAnswer;

      await supabaseAdmin.rpc("increment_xp", {
        uid: v.user_id,
        amount: isCorrect ? 10 : 3,
      });

      if (isCorrect) {
        await supabaseAdmin.rpc("increment_bounty", {
          uid: v.user_id,
          amount: 2,
        });
      }
    }
  }

  // 5. Apply XP + bounty (PVP ONLY)
  if (!isSolo) {
    await supabaseAdmin.rpc("increment_xp", {
      uid: winner_id,
      amount: rewards.winnerXP,
    });

    await supabaseAdmin.rpc("increment_bounty", {
      uid: winner_id,
      amount: rewards.bountyGain,
    });

    if (loser_id) {
      await supabaseAdmin.rpc("increment_xp", {
        uid: loser_id,
        amount: rewards.loserXP,
      });
    }

    const correctSide =
      winner_id === match.creator_id ? "A" : "B";

    for (const v of votes ?? []) {
      const isCorrect = v.vote === correctSide;

      await supabaseAdmin.rpc("increment_xp", {
        uid: v.user_id,
        amount: isCorrect ? 10 : 3,
      });

      if (isCorrect) {
        await supabaseAdmin.rpc("increment_bounty", {
          uid: v.user_id,
          amount: 2,
        });
      }
    }
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