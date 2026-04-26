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

    const voters = votes.filter(
        v => v.user_id !== creatorId && v.user_id !== opponentId
    );

    const pool = betAmount * (1 + voters.length);

    const correctSide = winnerId === creatorId ? "A" : "B";

    const correct = voters.filter(v => v.vote === correctSide);

    const rewards: Record<string, { xp: number; bounty: number }> = {};

    // 🧨 EDGE CASE: no voters at all → winner gets everything
    if (voters.length === 0) {
        rewards[winnerId] = {
            xp: 50,
            bounty: pool,
        };
        return { pool, rewards };
    }

    const winnerCut = Math.floor(pool * 0.6);
    const voterPool = pool - winnerCut;

    rewards[winnerId] = {
        xp: 50,
        bounty: winnerCut,
    };

    const each = correct.length
        ? Math.floor(voterPool / correct.length)
        : 0;

    for (const v of correct) {
        rewards[v.user_id] = {
            xp: 10,
            bounty: each,
        };
    }

    return { pool, rewards };
}