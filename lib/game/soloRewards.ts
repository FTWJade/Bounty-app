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
  // 👇 ONLY REAL MONEY
  const pool = betAmount;

  // creator always gets fixed cut
  const creatorCut = Math.floor(pool * 0.4);

  // voters share remaining
  const voterPool = pool - creatorCut;

  // outcome from creator decision ONLY
  const correctSide = creatorOutcome === "WIN" ? "B" : "A";

  // remove creator if they somehow appear in votes
  const voters = votes.filter(v => v.user_id !== creatorId);

  const correct = voters.filter(v => v.vote === correctSide);
  const wrong = voters.filter(v => v.vote !== correctSide);

  const rewards: Record<string, { xp: number; bounty: number }> = {};

  // 👑 creator reward (fixed, stable)
  rewards[creatorId] = {
    xp: 30,
    bounty: creatorCut,
  };

  // 🧠 voter distribution
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