export function calculateSoloRewards({
    votes,
    creatorId,
    betAmount,
}: {
    votes: { user_id: string; vote: "A" | "B" }[];
    creatorId: string;
    betAmount: number;
}) {
    const voters = votes.filter(v => v.user_id !== creatorId);

    const votesA = voters.filter(v => v.vote === "A").length;
    const votesB = voters.filter(v => v.vote === "B").length;

    const majoritySide = votesA > votesB ? "A" : "B";
    const creatorSide = majoritySide === "A" ? "B" : "A";

    // 🔥 TEMP: replace with real outcome later
    const creatorWins = Math.random() < 0.5;

    const winningSide = creatorWins ? creatorSide : majoritySide;

    const pool = betAmount * (1 + voters.length);

    const rewards: Record<string, { xp: number; bounty: number }> = {};

    const winners = voters.filter(v => v.vote === winningSide);
    const losers = voters.filter(v => v.vote !== winningSide);

    if (creatorWins) {
        // 👑 creator wins WITH minority voters

        const creatorCut = Math.floor(pool * 0.5);
        const remaining = pool - creatorCut;

        rewards[creatorId] = {
            xp: 50,
            bounty: creatorCut,
        };

        const each = winners.length
            ? Math.floor(remaining / winners.length)
            : 0;

        for (const v of winners) {
            rewards[v.user_id] = {
                xp: 10,
                bounty: each,
            };
        }

    } else {
        // 🧠 voters win (majority correct)

        const each = winners.length
            ? Math.floor(pool / winners.length)
            : 0;

        for (const v of winners) {
            rewards[v.user_id] = {
                xp: 10,
                bounty: each,
            };
        }

        // creator loses → no payout
        rewards[creatorId] = {
            xp: 5,
            bounty: 0,
        };
    }

    return { pool, rewards };
}