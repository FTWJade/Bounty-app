export function calculateSoloRewards({
  votesA,
  votesB,
  betAmount,
  creatorId,
  winnerId,
  votes,
}: {
  votesA: number;
  votesB: number;
  betAmount: number;
  creatorId: string;
  winnerId: string;
  votes: { user_id: string; vote: "A" | "B" }[];
}) {
  const pool = (votesA + votesB + 1) * betAmount;

  const creatorWon = winnerId === creatorId;

  // 🎯 Creator reward
  const creatorReward = creatorWon
    ? Math.floor(pool * 0.6)
    : Math.floor(pool * 0.1);

  // 🗳️ Split voters
  const correctSide = creatorWon ? "B" : "A";

  const correctVoters = votes.filter(v => v.vote === correctSide);
  const wrongVoters = votes.filter(v => v.vote !== correctSide);

  const correctPool = Math.floor(pool * 0.3);
  const wrongPool = Math.floor(pool * 0.1);

  const rewards: Record<string, { xp: number; bounty: number }> = {};

  // 👤 creator
  rewards[creatorId] = {
    xp: creatorWon ? 50 : 10,
    bounty: creatorReward,
  };

  // 🟢 correct voters
  const eachCorrect =
    correctVoters.length > 0
      ? Math.floor(correctPool / correctVoters.length)
      : 0;

  for (const v of correctVoters) {
    rewards[v.user_id] = {
      xp: 10,
      bounty: eachCorrect,
    };
  }

  // 🔴 wrong voters
  const eachWrong =
    wrongVoters.length > 0
      ? Math.floor(wrongPool / wrongVoters.length)
      : 0;

  for (const v of wrongVoters) {
    rewards[v.user_id] = {
      xp: 3,
      bounty: eachWrong,
    };
  }

  return {
    pool,
    rewards,
  };
}