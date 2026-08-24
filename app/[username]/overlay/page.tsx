"use client";

import { useEffect, useState } from "react";
import VoteBar from "../../../components/VoteBar";

export default function UserOverlay({
    params,
}: {
    params: Promise<{ username: string }>;
}) {
    const [username, setUsername] = useState("");
    const [match, setMatch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [voteCount, setVoteCount] = useState({ a: 0, b: 0 });
    const [winnerMessage, setWinnerMessage] = useState<string | null>(null);
    useEffect(() => {
        params.then(({ username }) => {
            setUsername(username);

            const loadMatch = async () => {
                try {
                    const response = await fetch(
                        `/api/profile/${username}/active-match`
                    );

                    const data = await response.json();

                    const activeMatch = data.match ?? null;

                    if (activeMatch) {
                        setMatch(activeMatch);

                        const voteResponse = await fetch(
                            `/api/match/votes?match_id=${activeMatch.id}`
                        );

                        const voteData = await voteResponse.json();

                        setVoteCount({
                            a: voteData.a ?? 0,
                            b: voteData.b ?? 0,
                        });
                    }
                } catch (error) {
                    console.error("Failed to load active match:", error);
                } finally {
                    setLoading(false);
                }
            };

            loadMatch();

            const interval = setInterval(loadMatch, 1000);

            return () => clearInterval(interval);
        });
    }, [params]);

    if (loading) {
        return null;
    }

    if (!match) {
        return null;
    }

    return (
        <div
            style={{
                width: "100vw",
                height: "100vh",
                background: "transparent",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-end",
                paddingBottom: 50,
                fontFamily: "Arial",
                position: "relative",
            }}
        >
            <div
                style={{
                    width: 400,
                    background: "rgba(0,0,0,0.7)",
                    padding: 20,
                    borderRadius: 12,
                    color: "white",
                    textAlign: "center",
                }}
            >
                <h3>🗳 {username}'s Live Match</h3>

                <p>Match #{match.id}</p>

                <p>💰 Bounty Pool: {match.bounty_pool}</p>

                <VoteBar
                    isSolo={match.mode === "solo"}
                    currentMatch={match}
                    voteCount={voteCount}
                    sides={{
                        A: {
                            user: match.creator,
                            userId: match.creator_id,
                            votes: voteCount.a,
                        },
                        B: {
                            user: match.opponent,
                            userId: match.opponent_id,
                            votes: voteCount.b,
                        },
                    }}
                    totalVotes={Math.max(voteCount.a + voteCount.b, 1)}
                    fillPercent={
                        50 +
                        ((voteCount.b - voteCount.a) /
                            Math.max(voteCount.a + voteCount.b, 1)) *
                        50
                    }
                    getSideName={(side) => {
                        const user =
                            side === "A"
                                ? match.creator
                                : match.opponent;

                        if (Array.isArray(user)) {
                            return user[0]?.username || side;
                        }

                        return user?.username || side;
                    }}
                    getUserColor={(userId) => {
                        if (userId === match.creator_id) return "blue";
                        if (userId === match.opponent_id) return "red";
                        return "gray";
                    }}
                    myVote={null}
                    pendingVote={null}
                />
            </div>
        </div>
    );
}