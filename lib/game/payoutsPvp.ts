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
  const pool = betAmount * 2; // 2 players

  const winnerReward = Math.floor(pool * 0.8);
  const voterPool = Math.floor(pool * 0.2);

  const correctSide = winnerId === creatorId ? "A" : "B";

  const realVoters = votes.filter(
    v => v.user_id !== creatorId && v.user_id !== opponentId
  );

  const correct = realVoters.filter(v => v.vote === correctSide);

  const each = correct.length
    ? Math.floor(voterPool / correct.length)
    : 0;

  const rewards: Record<string, { xp: number; bounty: number }> = {};

  // winner
  rewards[winnerId] = {
    xp: 50,
    bounty: winnerReward,
  };

  // voters
  for (const v of correct) {
    rewards[v.user_id] = {
      xp: 10,
      bounty: each,
    };
  }

  return { pool, rewards };
}