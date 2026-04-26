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

  const creatorCut = Math.floor(pool * 0.25);
  const remainingPool = pool - creatorCut;

  const voterOnly = votes.filter(v => v.user_id !== creatorId);

  const rewards: Record<string, { xp: number; bounty: number }> = {};

  // 👑 creator base reward ALWAYS
  rewards[creatorId] = {
    xp: 10,
    bounty: creatorCut,
  };

  // 🚨 VOID CASE HANDLED OUTSIDE — so treat winnerId null as no payout pool
  if (!winnerId) {
    for (const v of voterOnly) {
      rewards[v.user_id] = {
        xp: 3,
        bounty: 0,
      };
    }
    return { pool, rewards };
  }

  const correctSide = winnerId === creatorId ? "B" : "A";

  const correctVoters = voterOnly.filter(v => v.vote === correctSide);

  // ❌ no correct voters → NO pool distribution
  if (correctVoters.length === 0) {
    for (const v of voterOnly) {
      rewards[v.user_id] = {
        xp: 3,
        bounty: 0,
      };
    }

    return { pool, rewards };
  }

  // 💸 split remaining pool
  const each = Math.floor(remainingPool / correctVoters.length);

  for (const v of correctVoters) {
    rewards[v.user_id] = {
      xp: 10,
      bounty: each,
    };
  }

  for (const v of voterOnly) {
    if (!rewards[v.user_id]) {
      rewards[v.user_id] = {
        xp: 3,
        bounty: 0,
      };
    }
  }

  return { pool, rewards };
}