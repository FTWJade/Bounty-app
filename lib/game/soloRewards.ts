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
  // 💰 REAL MONEY ONLY
  const pool = betAmount * 2;

  const creatorWon = winnerId === creatorId;

  // 🎯 decide correct side
  const correctSide = creatorWon ? "B" : "A";

  const correctVoters = votes.filter(v => v.vote === correctSide);
  const wrongVoters = votes.filter(v => v.vote !== correctSide);

  // 🧠 include creator as "participant"
  const totalParticipants = correctVoters.length + wrongVoters.length + 1;

  // 💡 split pool based on participants
  const creatorShare = Math.floor(pool * (creatorWon ? 0.6 : 0.2));
  const voterPool = pool - creatorShare;

  const correctPool = Math.floor(voterPool * 0.7);
  const wrongPool = voterPool - correctPool;

  const rewards: Record<string, { xp: number; bounty: number }> = {};

  // 👤 creator
  rewards[creatorId] = {
    xp: creatorWon ? 50 : 10,
    bounty: creatorShare,
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