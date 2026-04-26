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
    const pool = betAmount * 2;

    const winnerCut = Math.floor(pool * 0.6);
    const voterPool = pool - winnerCut;

    const correctSide = winnerId === creatorId ? "A" : "B";

    const voters = votes.filter(
        v => v.user_id !== creatorId && v.user_id !== opponentId
    );

    const correct = voters.filter(v => v.vote === correctSide);

    const rewards: Record<string, { xp: number; bounty: number }> = {};

    // winner
    rewards[winnerId] = {
        xp: 50,
        bounty: winnerCut,
    };

    // scalable voter split
    const each = correct.length
        ? Math.floor(voterPool / correct.length)
        : 0;

    for (const v of correct) {
        rewards[v.user_id] = {
            xp: 10,
            bounty: each,
        };
    }

    // voters bonus only
    for (const v of correct) {
        rewards[v.user_id] = {
            xp: 10,
            bounty: each,
        };
    }

    return { pool, rewards };
}