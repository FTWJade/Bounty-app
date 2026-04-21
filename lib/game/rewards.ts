export function calculateMatchRewards({
  winnerLevel,
  loserLevel,
}: {
  winnerLevel: number;
  loserLevel: number;
}) {
  // ------------------------
  // XP SYSTEM
  // ------------------------

  const winnerXP =
    50 + loserLevel * 8 + winnerLevel * 3;

  const loserXP =
    10 + loserLevel * 2;

  // ------------------------
  // BOUNTY SYSTEM
  // ------------------------

  const bountyGain =
    5 +
    winnerLevel * 2 +
    Math.max(0, loserLevel - winnerLevel) * 3;

  return {
    winnerXP,
    loserXP,
    bountyGain,
  };
}