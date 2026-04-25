export function calculateVoteBasedRewards({
  votesA,
  votesB,
  betAmount,
  creatorId,
  opponentId,
  winnerId,
  votes, // [{ user_id, vote }]
}: {
  votesA: number;
  votesB: number;
  betAmount: number;
  creatorId: string;
  opponentId: string;
  winnerId: string;
  votes: { user_id: string; vote: "A" | "B" }[];
}) {
  const totalVotes = votesA + votesB;
  const totalPlayers = 2;

  // 🔥 1. Pool
  const pool = (totalVotes + totalPlayers) * betAmount;

  // 🔥 2. Core splits
  const creatorReward = Math.floor(pool * 0.5);
  const opponentReward = Math.floor(pool * 0.1);

  // 🔥 3. Determine correct side
  const correctSide =
    winnerId === creatorId ? "A" : "B";

  const correctVoters = votes.filter(v => v.vote === correctSide);
  const wrongVoters = votes.filter(v => v.vote !== correctSide);

  // 🔥 4. Voter pools
  const correctPool = Math.floor(pool * 0.3);
  const wrongPool = Math.floor(pool * 0.1);

  const rewards: Record<string, { xp: number; bounty: number }> = {};

  // 🟢 Creator
  rewards[creatorId] = {
    xp: 50,
    bounty: creatorReward,
  };

  // 🔴 Opponent
  rewards[opponentId] = {
    xp: 10,
    bounty: opponentReward,
  };

  // 🟢 Correct voters
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

  // 🔴 Wrong voters
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