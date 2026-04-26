export function calculateSoloRewards({
    betAmount,
    creatorId,
    winnerId,
    votes,
}: {
    betAmount: number;
    creatorId: string;
    winnerId: string;
    votes: { user_id: string; vote: "A" | "B" }[];
}) {
    const participantCount = 1 + votes.length;
    const pool = betAmount * participantCount;

    const creatorWon = winnerId === creatorId;
    const correctSide = winnerId === creatorId ? "A" : "B";

    const correctVoters = votes.filter(v => v.vote === correctSide);
    const wrongVoters = votes.filter(v => v.vote !== correctSide);

    // 💡 FIXED SPLITS (must sum to 1.0)
    const creatorSharePct = creatorWon ? 0.6 : 0.2;
    const voterPoolPct = 1 - creatorSharePct;

    const creatorShare = pool * creatorSharePct;
    const voterPool = pool * voterPoolPct;

    const correctPool = voterPool * 0.7;
    const wrongPool = voterPool * 0.3;

    const rewards: Record<string, { xp: number; bounty: number }> = {};

    // 👤 creator
    rewards[creatorId] = {
        xp: creatorWon ? 50 : 10,
        bounty: Math.floor(creatorShare),
    };

    const eachCorrect =
        correctVoters.length > 0
            ? Math.floor(correctPool / correctVoters.length)
            : 0;

    const eachWrong =
        wrongVoters.length > 0
            ? Math.floor(wrongPool / wrongVoters.length)
            : 0;

    for (const v of correctVoters) {
        rewards[v.user_id] = {
            xp: 10,
            bounty: eachCorrect,
        };
    }

    for (const v of wrongVoters) {
        rewards[v.user_id] = {
            xp: 3,
            bounty: eachWrong,
        };
    }

    return {
        pool,
        rewards,
    };
}