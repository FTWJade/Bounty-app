"use client";

import { useEffect, useState } from "react";

export default function UserOverlay({
    params,
}: {
    params: Promise<{ username: string }>;
}) {
    const [username, setUsername] = useState("");
    const [match, setMatch] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        params.then(({ username }) => {
            setUsername(username);

            const loadMatch = async () => {
                try {
                    const response = await fetch(
                        `/api/profile/${username}/active-match`
                    );

                    const data = await response.json();

                    setMatch(data.match ?? null);
                } catch (error) {
                    console.error("Failed to load active match:", error);
                    setMatch(null);
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

                <p>🔵 Player 1 vs 🔴 Player 2</p>
            </div>
        </div>
    );
}