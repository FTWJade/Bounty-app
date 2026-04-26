export function calculateSoloRewards({
  votes,
  creatorId,
  betAmount,
}: {
  votes: { user_id: string; vote: "A" | "B" }[];
  creatorId: string;
  betAmount: number;
}) {
  const voters = votes.filter(v => v.user_id !== creatorId);

  const pool = betAmount * (1 + voters.length);

  const votesA = voters.filter(v => v.vote === "A");
  const votesB = voters.filter(v => v.vote === "B");

  // determine majority
  let majoritySide: "A" | "B" = "A";
  if (votesB.length > votesA.length) majoritySide = "B";

  const minoritySide = majoritySide === "A" ? "B" : "A";

  // winners = minority voters + creator
  const winningVoters = voters.filter(v => v.vote === minoritySide);

  const winnersCount = winningVoters.length + 1; // + creator

  const rewards: Record<string, { xp: number; bounty: number }> = {};

  const each = Math.floor(pool / winnersCount);

  let distributed = 0;

  // creator
  rewards[creatorId] = {
    xp: 30,
    bounty: each,
  };
  distributed += each;

  // winning voters
  for (const v of winningVoters) {
    rewards[v.user_id] = {
      xp: 10,
      bounty: each,
    };
    distributed += each;
  }

  // remainder fix
  const remainder = pool - distributed;
  if (remainder > 0) {
    rewards[creatorId].bounty += remainder;
  }

  return { pool, rewards };
}