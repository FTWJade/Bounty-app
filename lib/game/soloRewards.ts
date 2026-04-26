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

  const voterOnly = votes.filter(v => v.user_id !== creatorId);

  const rewards: Record<string, { xp: number; bounty: number }> = {};

  // 👑 creator always gets XP only (NOT pool control anymore)
  rewards[creatorId] = {
    xp: 10,
    bounty: 0,
  };

  // 🚫 if match cancelled / no winner → nothing happens
  if (!winnerId) {
    for (const v of voterOnly) {
      rewards[v.user_id] = { xp: 3, bounty: 0 };
    }

    return { pool, rewards };
  }

  const correctSide = winnerId === creatorId ? "B" : "A";
  const correctVoters = voterOnly.filter(v => v.vote === correctSide);

  // 🚫 NO correct voters → cancel match payout completely
  if (correctVoters.length === 0) {
    for (const v of voterOnly) {
      rewards[v.user_id] = { xp: 3, bounty: 0 };
    }

    return { pool: 0, rewards };
  }

  // 💸 split pool ONLY among correct voters
  const each = Math.floor(pool / correctVoters.length);

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

  return { pool, rewards };
}