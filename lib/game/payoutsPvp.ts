export function calculatePvPRewards({
    votes,
    creatorId,
    opponentId,
    winnerId,
    betAmount,
}: {
    votes: { user_id: string; vote: "A" | "B" }[];
    creatorId: string;
    opponentId: string;
    winnerId: string;
    betAmount: number;
}) {
    // 🧠 dedupe voters properly
    const voters = [...new Map(votes.map(v => [v.user_id, v])).values()]
        .filter(v => v.user_id !== creatorId && v.user_id !== opponentId);

    // 💰 bounty_pool is already the full accumulated pool
    const pool = betAmount;

    const correctSide = winnerId === creatorId ? "A" : "B";

    const correct = voters.filter(v => v.vote === correctSide);

    const rewards: Record<string, { xp: number; bounty: number }> = {};

    // 🧨 if nobody was correct → winner wins everything
    if (correct.length === 0) {
        rewards[winnerId] = {
            xp: 50,
            bounty: pool,
        };
        return { pool, rewards };
    }

    // 🏆 winner gets 10%, correct voters split 90%
    rewards[winnerId] = {
        xp: 50,
        bounty: Math.floor(pool * 0.1),
    };

    const voterPool = pool - rewards[winnerId].bounty;
    const eachWinner = Math.floor(voterPool / correct.length);

    for (const v of correct) {
        rewards[v.user_id] = {
            xp: 10,
            bounty: eachWinner,
        };
    }

    return { pool, rewards };
}