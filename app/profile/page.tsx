"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
export default function ProfilePage() {
    const { data: session, status } = useSession();
    const [profile, setProfile] = useState<{
        username: string;
        points: number;
        bounty: number;
        hasNextPage: boolean;
        matches: {
            id: string;
            creator_id: string;
            opponent_id: string | null;
            status: string;
            winner_id: string | null;
            created_at: string;
            mode: string;
            bounty_pool: number;
            title: string | null;
        }[];
    } | null>(null);
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetch(`/api/profile?page=${page}`)
            .then((res) => res.json())
            .then((data) => {
                console.log("PROFILE DATA:", data);
                setProfile(data);
            });
    }, [page]);
    if (status === "loading") {
        return <div>Loading profile...</div>;
    }

    if (!session?.user?.id) {
        return <div>Please log in to view your profile.</div>;
    }
    const username = session.user.name ?? "Unknown";
    const hideMatch = async (matchId: string) => {
        const response = await fetch("/api/profile/hide-match", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                match_id: matchId,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();

            console.error("Hide match failed:", {
                status: response.status,
                statusText: response.statusText,
                body: errorText,
            });

            return;
        }

        // Refresh profile data
        const profileResponse = await fetch(`/api/profile?page=${page}`);
        const data = await profileResponse.json();

        setProfile(data);
    };
    return (
        <main className="min-h-screen p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Profile</h1>

                <div className="flex items-center gap-2">
                    <span className="text-purple-500">●</span>
                    <span>{username}</span>
                </div>
            </div>

            <section className="mt-8">
                <h2 className="text-xl font-semibold">Balance</h2>
                <p className="mt-2">Points: {profile?.points ?? 0}</p>
                <p>Bounty: {profile?.bounty ?? 0}</p>
            </section>
            <section className="mt-8">
                <h2 className="text-xl font-semibold">Past Bounties</h2>

                <div className="mt-4 space-y-4">
                    {profile?.matches?.length ? (
                        profile.matches.map((match) => {
                            const won = match.winner_id === session.user.id;
                            return (
                                <div
                                    key={match.id}
                                    className="rounded-lg border p-4"
                                >
                                    {match.title && (
                                        <p className="text-lg font-semibold">
                                            {match.title}
                                        </p>
                                    )}
                                    <p className="font-semibold">
                                        Match #{match.id}
                                    </p>

                                    <p>Bounty Pool: {match.bounty_pool}</p>

                                    <p>
                                        Result: {won ? "Won" : "Lost"}
                                    </p>

                                    <p>
                                        Date:{" "}
                                        {new Date(match.created_at).toLocaleDateString()}
                                    </p>
                                    <button
                                        onClick={() => hideMatch(match.id)}
                                        className="mt-2 rounded px-3 py-1 border"
                                    >
                                        Remove
                                    </button>
                                </div>
                            );
                        })
                    ) : (
                        <p>No past bounties yet.</p>
                    )}
                </div>
                <div className="mt-6 flex items-center gap-4">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="rounded border px-3 py-1 disabled:opacity-50"
                    >
                        ← Previous
                    </button>

                    <span>Page {page}</span>

                    <button
                        onClick={() => setPage((p) => p + 1)}
                        disabled={!profile?.hasNextPage}
                        className="rounded border px-3 py-1 disabled:opacity-50"
                    >
                        Next →
                    </button>
                </div>
            </section>
        </main>
    );
}