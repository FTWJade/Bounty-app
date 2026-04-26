export function calculateSoloRewards({
  betAmount,
  creatorId,
  winnerId,
  votes,
}: {
  betAmount: number;
  creatorId: string;
  winnerId: string | null;
  votes: { user_id: string; vote: "A" | "B" }[];
}) {
  const pool = betAmount;

  const creatorWon = winnerId === creatorId;
  const correctSide = creatorWon ? "B" : "A";

  // 💰 Creator ALWAYS gets 25%
  const creatorCut = Math.floor(pool * 0.25);
  const remainingPool = pool - creatorCut;

  // 🚫 exclude creator from voter distribution
  const voterOnly = votes.filter(v => v.user_id !== creatorId);

  const correctVoters = voterOnly.filter(v => v.vote === correctSide);

  const rewards: Record<string, { xp: number; bounty: number }> = {};

  // 👑 creator base reward
  rewards[creatorId] = {
    xp: 10,
    bounty: creatorCut,
  };

  // 🧠 if no correct voters → creator gets everything
  if (correctVoters.length === 0) {
    rewards[creatorId].bounty = pool;

    // wrong voters still get XP only
    for (const v of voterOnly) {
      rewards[v.user_id] = {
        xp: 3,
        bounty: 0,
      };
    }

    return { pool, rewards };
  }

  // 💸 split remaining pool among correct voters
  const each = Math.floor(remainingPool / correctVoters.length);

  for (const v of correctVoters) {
    rewards[v.user_id] = {
      xp: 10,
      bounty: each,
    };
  }

  // ❌ wrong voters
  for (const v of voterOnly) {
    if (!rewards[v.user_id]) {
      rewards[v.user_id] = {
        xp: 3,
        bounty: 0,
      };
    }
  }

  return {
    pool,
    rewards,
  };
}