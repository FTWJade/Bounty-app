export function calculatePvPRewards({
    votes,
    creatorId,
    opponentId,
    winnerId,
    betAmount,
    entryFee,
}: {
    votes: { user_id: string; vote: "A" | "B" }[];
    creatorId: string;
    opponentId: string;
    winnerId: string;
    betAmount: number;
    entryFee: number;
}) {
    // 🧠 dedupe voters properly
    const voters = [...new Map(votes.map(v => [v.user_id, v])).values()]
        .filter(v => v.user_id !== creatorId && v.user_id !== opponentId);

    // 💰 bounty_pool is the full accumulated pool
    const pool = Math.max(0, betAmount);
    const winnerEntryRefund = Math.min(Math.max(0, entryFee), pool);
    const rewardPool = pool - winnerEntryRefund;

    const correctSide = winnerId === creatorId ? "A" : "B";

    const correct = voters.filter(v => v.vote === correctSide);

    const rewards: Record<string, { xp: number; bounty: number }> = {};

    // 🧨 if nobody was correct → winner gets their entry fee back + the rest of the pool
    if (correct.length === 0) {
        rewards[winnerId] = {
            xp: 50,
            bounty: winnerEntryRefund + rewardPool,
        };
        return { pool, rewards };
    }

    // 🏆 winner gets their entry fee back + 10% of the reward pool
    const winnerShare = Math.floor(rewardPool * 0.1);

    rewards[winnerId] = {
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
