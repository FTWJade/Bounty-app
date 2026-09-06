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
    // remove creator completely
    const voters = votes.filter(v => v.user_id !== creatorId);

    // 💰 bounty_pool is already the full accumulated pool
    const pool = betAmount;

    // 🧠 outcome decided by creator button
    const correctSide = creatorOutcome === "WIN" ? "B" : "A";

    const correct = voters.filter(v => v.vote === correctSide);
    const wrong = voters.filter(v => v.vote !== correctSide);

    const rewards: Record<string, { xp: number; bounty: number }> = {};

    // split pool
    const winnerPool = Math.floor(pool * 0.8);
    const loserPool = pool - winnerPool; // ensures exact total

    const eachWinner = correct.length
        ? Math.floor(winnerPool / correct.length)
        : 0;

    const eachLoser = wrong.length
        ? Math.floor(loserPool / wrong.length)
        : 0;

    // 🧨 if nobody was correct → creator wins everything
    if (correct.length === 0) {
        rewards[creatorId] = {
            xp: 50,
            bounty: pool,
        };

        return { pool, rewards };
    }

    // 🏆 winners
    for (const v of correct) {
        rewards[v.user_id] = {
            xp: 10,
            bounty: eachWinner,
        };
    }

    // 🎖 losers (still get something)
    for (const v of wrong) {
        votes.filter(v => v.user_id !== creatorId)
        rewards[v.user_id] = {
            xp: 3,
            bounty: eachLoser,
        };
    }

    return { pool, rewards };
}