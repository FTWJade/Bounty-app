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
    // The Solo creator does not wager bounty.
    // The pool is funded only by paid voters.
    const voters = votes.filter(v => v.user_id !== creatorId);
    const pool = Math.max(0, betAmount);

    // The creator reports the actual outcome.
    const correctSide = creatorOutcome === "WIN" ? "B" : "A";
    const correct = voters.filter(v => v.vote === correctSide);

    const rewards: Record<string, { xp: number; bounty: number }> = {};

    // If nobody voted correctly, the creator receives the entire voter pool.
    if (correct.length === 0) {
        rewards[creatorId] = {
            xp: 50,
            bounty: pool,
        };

        return { pool, rewards };
    }

    // Creator gets 10%; correct voters split 90%.
    const creatorShare = Math.floor(pool * 0.1);
    const voterPool = pool - creatorShare;
    const eachWinner = Math.floor(voterPool / correct.length);

    rewards[creatorId] = {
        xp: 50,
        bounty: creatorShare,
    };

    for (const v of correct) {
        rewards[v.user_id] = {
            xp: 10,
            bounty: eachWinner,
        };
    }

    return { pool, rewards };
}
