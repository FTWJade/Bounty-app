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

  // ✅ include creator as a voter
  const allVoters = [
    ...votes,
    {
      user_id: creatorId,
      vote: creatorWon ? "B" : "A", // creator vote auto-matches outcome
    },
  ];

  const correctVoters = allVoters.filter(v => v.vote === correctSide);

  const rewards: Record<string, { xp: number; bounty: number }> = {};

  const each =
    correctVoters.length > 0
      ? Math.floor(pool / correctVoters.length)
      : 0;

  for (const v of correctVoters) {
    rewards[v.user_id] = {
      xp: 10,
      bounty: each,
    };
  }

  // ❌ wrong voters get nothing
  for (const v of allVoters) {
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