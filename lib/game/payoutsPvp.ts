export function calculatePvPRewards({
  votes,
  creatorId,
  opponentId,
  winnerId,
  betAmount,
}: {
  votes: { user_id: string; vote: "A" | "B" }[];
  creatorId: string;
  opponentId: string;
  winnerId: string;
  betAmount: number;
}) {
  const pool = betAmount * 2; // ONLY players fund pool

  const winnerReward = Math.floor(pool * 0.9);
  const voterRewardPool = Math.floor(pool * 0.1);

  const correctSide = winnerId === creatorId ? "A" : "B";

  const voters = votes.filter(
    v => v.user_id !== creatorId && v.user_id !== opponentId
  );

  const correct = voters.filter(v => v.vote === correctSide);

  const each = correct.length
    ? Math.floor(voterRewardPool / correct.length)
    : 0;

  const rewards: Record<string, { xp: number; bounty: number }> = {};

  // winner ONLY
  rewards[winnerId] = {
    xp: 50,
    bounty: winnerReward,
  };

  // voters bonus only
  for (const v of correct) {
    rewards[v.user_id] = {
      xp: 10,
      bounty: each,
    };
  }

  return { pool, rewards };
}