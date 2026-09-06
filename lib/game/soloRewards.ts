export function calculateSoloRewards({
    votes,
    creatorId,
    creatorOutcome,
    betAmount,
    entryFee,
}: {
    votes: { user_id: string; vote: "A" | "B" }[];
    creatorId: string;
    creatorOutcome: "WIN" | "LOSE";
    betAmount: number;
    entryFee: number;
}) {
    // remove creator completely
    const voters = votes.filter(v => v.user_id !== creatorId);

    // 💰 bounty_pool is the full accumulated pool
    const pool = Math.max(0, betAmount);
    const winnerEntryRefund = Math.min(Math.max(0, entryFee), pool);
    const rewardPool = pool - winnerEntryRefund;

    // 🧠 outcome decided by creator button
    const correctSide = creatorOutcome === "WIN" ? "B" : "A";

    const correct = voters.filter(v => v.vote === correctSide);

    const rewards: Record<string, { xp: number; bounty: number }> = {};

    // 🧨 if nobody was correct → creator gets their entry fee back + the rest of the pool
    if (correct.length === 0) {
        rewards[creatorId] = {
            xp: 50,
            bounty: winnerEntryRefund + rewardPool,
        };

        return { pool, rewards };
    }

    // 🏆 creator gets their entry fee back + 10% of the reward pool
    const winnerShare = Math.floor(rewardPool * 0.1);

    rewards[creatorId] = {
        xp: 50,
        bounty: winnerEntryRefund + winnerShare,
    };

    const voterPool = rewardPool - winnerShare;
    const eachWinner = Math.floor(voterPool / correct.length);

    for (const v of correct) {
        rewards[v.user_id] = {
            xp: 10,
            bounty: eachWinner,
        };
    }

    return { pool, rewards };
}
