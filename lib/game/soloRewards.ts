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

  const pool = betAmount * (1 + voters.length);

  const correctSide = creatorOutcome === "WIN" ? "B" : "A";

  const correct = voters.filter(v => v.vote === correctSide);
  const wrong = voters.filter(v => v.vote !== correctSide);

  const rewards: Record<string, { xp: number; bounty: number }> = {};

  // base splits
  let creatorCut = Math.floor(pool * 0.4);
  let voterPool = pool - creatorCut;

  let distributed = 0;

  // creator
  rewards[creatorId] = {
    xp: 30,
    bounty: creatorCut,
  };
  distributed += creatorCut;

  // voters
  const correctTotal = Math.floor(voterPool * 0.8);
  const wrongTotal = voterPool - correctTotal;

  const eachCorrect = correct.length
    ? Math.floor(correctTotal / correct.length)
    : 0;

  const eachWrong = wrong.length
    ? Math.floor(wrongTotal / wrong.length)
    : 0;

  // pay correct
  for (const v of correct) {
    rewards[v.user_id] = {
      xp: 10,
      bounty: eachCorrect,
    };
    distributed += eachCorrect;
  }

  // pay wrong
  for (const v of wrong) {
    rewards[v.user_id] = {
      xp: 3,
      bounty: eachWrong,
    };
    distributed += eachWrong;
  }

  // 🧠 FIX: distribute leftover
  const remainder = pool - distributed;

  if (remainder > 0) {
    // give remainder to creator (simplest + stable)
    rewards[creatorId].bounty += remainder;
  }

  return { pool, rewards };
}