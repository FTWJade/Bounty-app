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

    const rewards: Record<string, { xp: number; bounty: number }> = {};

    // 🧨 if nobody was correct → creator wins everything
    if (correct.length === 0) {
        rewards[creatorId] = {
            xp: 50,
            bounty: pool,
        };

        return { pool, rewards };
    }

    // 🏆 creator gets 10%, correct voters split 90%
    rewards[creatorId] = {
        xp: 50,
        bounty: Math.floor(pool * 0.1),
    };

    const voterPool = pool - rewards[creatorId].bounty;
    const eachWinner = Math.floor(voterPool / correct.length);

    for (const v of correct) {
        rewards[v.user_id] = {
            xp: 10,
            bounty: eachWinner,
        };
    }

    return { pool, rewards };
}