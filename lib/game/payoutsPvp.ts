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

    const participants = [
        creatorId,
        opponentId,
        ...new Set(votes.map(v => v.user_id)),
    ];

    const pool = betAmount * participants.length;

    const correctSide = winnerId === creatorId ? "A" : "B";

    const uniqueVotes = [
        ...new Map(votes.map(v => [v.user_id, v])).values(),
    ];

    const correct = uniqueVotes.filter(v => v.vote === correctSide);

    const rewards: Record<string, { xp: number; bounty: number }> = {};

    // 🧨 EDGE CASE: no voters
    if (correct.length === 0) {
        rewards[winnerId] = {
            xp: 50,
            bounty: pool,
        };
        return { pool, rewards };
    }

    // 🏆 winner base cut
    const winnerShare = Math.floor(pool * 0.5);
    rewards[winnerId] = {
        xp: 50,
        bounty: winnerShare,
    };

    // 🧠 remaining pool to correct voters
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