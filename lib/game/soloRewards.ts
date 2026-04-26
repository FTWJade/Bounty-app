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
    const voterContribution = votes.length * betAmount;
    const playerContribution = betAmount;

    const pool = voterContribution + playerContribution;

    const creatorCut = Math.floor(pool * 0.25);
    const voterPool = Math.floor(pool * 0.75);

    const correctSide = winnerId ? "B" : "A";
    // A = LOSE, B = WIN (your UI logic)

    const realVoters = votes.filter(v => v.user_id !== creatorId);

    const correct = realVoters.filter(v => v.vote === correctSide);
    const wrong = realVoters.filter(v => v.vote !== correctSide);

    const rewards: Record<string, { xp: number; bounty: number }> = {};

    // creator always gets something
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