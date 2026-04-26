export function calculateSoloRewards({
  votes,
  creatorId,
  creatorOutcome,
  betAmount,
}: {
  votes: { user_id: string; vote: "A" | "B" }[];
  creatorId: string;
  creatorOutcome: "WIN" | "LOSE";
  betAmount: number;
}) {
  const voters = votes.filter(v => v.user_id !== creatorId);

  // 💰 REAL pool (creator + voters)
  const pool = betAmount * (1 + voters.length);

  const creatorCut = Math.floor(pool * 0.4);
  const voterPool = pool - creatorCut;

  const correctSide = creatorOutcome === "WIN" ? "B" : "A";

  const correct = voters.filter(v => v.vote === correctSide);
  const wrong = voters.filter(v => v.vote !== correctSide);

  const rewards: Record<string, { xp: number; bounty: number }> = {};

  // 👑 creator always gets cut
  rewards[creatorId] = {
    xp: 30,
    bounty: creatorCut,
  };

  const eachCorrect = correct.length
    ? Math.floor((voterPool * 0.8) / correct.length)
    : 0;

  const eachWrong = wrong.length
    ? Math.floor((voterPool * 0.2) / wrong.length)
    : 0;

  for (const v of correct) {
    rewards[v.user_id] = {
      xp: 10,
      bounty: eachCorrect,
    };
  }

  for (const v of wrong) {
    rewards[v.user_id] = {
      xp: 3,
      bounty: eachWrong,
    };
  }

  return { pool, rewards };
}