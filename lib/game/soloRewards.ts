export function calculateSoloRewards({
    votes,
    creatorId,
    winnerId,
    betAmount,
}: {
    votes: { user_id: string; vote: "A" | "B" }[];
    creatorId: string;
    winnerId: string | null;
    betAmount: number;
}) {

    const realVoters = votes.filter(v => v.user_id !== creatorId);
    const pool = betAmount * realVoters.length + betAmount;
    const creatorCut = Math.floor(pool * 0.4);
    const voterPool = Math.floor(pool * 0.6);

    const correctSide = winnerId ? "B" : "A";


    const correct = realVoters.filter(v => v.vote === correctSide);
    const wrong = realVoters.filter(v => v.vote !== correctSide);

    const rewards: Record<string, { xp: number; bounty: number }> = {};

    // creator reward
    rewards[creatorId] = {
        xp: 30,
        bounty: creatorCut,
    };

    const eachCorrect = correct.length
        ? Math.floor((voterPool * 0.8) / correct.length)
        : 0;

    const eachWrong = wrong.length
        ? Math.floor((voterPool * 0.2) / wrong.length)
        : 0;

    for (const v of correct) {
        rewards[v.user_id] = { xp: 10, bounty: eachCorrect };
    }

    for (const v of wrong) {
        rewards[v.user_id] = { xp: 3, bounty: eachWrong };
    }

    return { pool, rewards };
}