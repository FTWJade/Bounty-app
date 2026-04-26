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

    const participants = [
        creatorId,
        opponentId,
        ...voters.map(v => v.user_id),
    ];

    const pool = betAmount * participants.length;

    const correctSide = winnerId === creatorId ? "A" : "B";

    const correct = voters.filter(v => v.vote === correctSide);

    const rewards: Record<string, { xp: number; bounty: number }> = {};

    // 🧨 edge case: no correct voters
    if (correct.length === 0) {
        rewards[winnerId] = {
            xp: 50,
            bounty: pool,
        };
        return { pool, rewards };
    }

    // 🏆 winner base cut
    const winnerShare = Math.floor(pool * 0.65);

    rewards[winnerId] = {
        xp: 50,
        bounty: winnerShare,
    };

    // 🧠 remaining pool
    const remaining = pool - winnerShare;

    const each = Math.floor(remaining / correct.length);

    for (const v of correct) {
        rewards[v.user_id] = {
            xp: 10,
            bounty: each,
        };
    }

    return { pool, rewards };
}