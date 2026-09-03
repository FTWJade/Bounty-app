"use client";

type VoteBarProps = {
    isSolo: boolean;
    currentMatch: any;
    voteCount: {
        a: number;
        b: number;
    };
    sides: {
        A: {
            user: any;
            userId?: string;
            votes: number;
        };
        B: {
            user: any;
            userId?: string;
            votes: number;
        };
    };
    totalVotes: number;
    getSideName: (side: "A" | "B") => string;
    getUserColor: (userId?: string) => string;
    myVote: "A" | "B" | null;
    pendingVote: "A" | "B" | null;
    handleVote?: (vote: "A" | "B") => void | Promise<void>;
    canVote?: boolean;
};

export default function VoteBar({
    isSolo,
    currentMatch,
    voteCount,
    sides,
    totalVotes,
    getSideName,
    getUserColor,
    myVote,
    pendingVote,
    handleVote,
    canVote,
}: VoteBarProps) {
    const displayedVote = myVote || pendingVote;

    /*
     * SOLO
     *
     * A = LOSE
     * B = WIN
     *
     * The marker starts in the center when there are no votes.
     * More WIN votes move it right.
     * More LOSE votes move it left.
     */
    if (isSolo) {
        const totalSoloVotes = voteCount.a + voteCount.b;

        const soloPercent =
            totalSoloVotes === 0
                ? 50
                : (voteCount.b / totalSoloVotes) * 100;

        return (
            <div
                style={{
                    textAlign: "center",
                    marginTop: 20,
                    marginBottom: 10,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        width: 300,
                        margin: "0 auto 6px auto",
                        fontSize: 12,
                        color: "#aaa",
                    }}
                >
                    <span>
                        ❌ LOSE — {voteCount.a}
                    </span>

                    <span>
                        {voteCount.b} — WIN 🏆
                    </span>
                </div>

                {/* SOLO VOTE TRACK */}
                <div
                    style={{
                        position: "relative",
                        width: 300,
                        height: 10,
                        background: "#333",
                        borderRadius: 5,
                        margin: "8px auto",
                    }}
                >
                    {/* CENTER LINE */}
                    <div
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: -3,
                            transform: "translateX(-50%)",
                            width: 2,
                            height: 16,
                            background: "#666",
                        }}
                    />

                    {/* MOVING MARKER */}
                    <div
                        style={{
                            position: "absolute",
                            left: `${soloPercent}%`,
                            top: -4,
                            transform: "translateX(-50%)",
                            width: 8,
                            height: 18,
                            background: "white",
                            borderRadius: 4,
                            transition:
                                "left 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                    />
                </div>

                {/* VOTER STATUS */}
                {displayedVote ? (
                    <p
                        style={{
                            fontSize: 12,
                            color: "#aaa",
                            marginTop: 8,
                        }}
                    >
                        You voted:{" "}
                        {displayedVote === "A" ? "LOSE" : "WIN"}
                    </p>
                ) : !canVote ? (
                    <p
                        style={{
                            fontSize: 12,
                            color: "#ff6666",
                            marginTop: 8,
                        }}
                    >
                        Unable to vote
                    </p>
                ) : null}

                {/* SOLO VOTING BUTTONS */}
                {canVote && handleVote && !displayedVote && (
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 10,
                            marginTop: 15,
                        }}
                    >
                        <button
                            onClick={() => handleVote("A")}
                            style={{
                                padding: "10px 18px",
                                borderRadius: 8,
                                border: "none",
                                background: "#d33",
                                color: "white",
                                cursor: "pointer",
                                fontWeight: 600,
                            }}
                        >
                            ❌ LOSE
                        </button>

                        <button
                            onClick={() => handleVote("B")}
                            style={{
                                padding: "10px 18px",
                                borderRadius: 8,
                                border: "none",
                                background: "#2e9d50",
                                color: "white",
                                cursor: "pointer",
                                fontWeight: 600,
                            }}
                        >
                            🏆 WIN
                        </button>
                    </div>
                )}
            </div>
        );
    }

    /*
     * PVP
     */
    return (
        <div
            style={{
                textAlign: "center",
                marginTop: 20,
                marginBottom: 10,
            }}
        >
            {displayedVote && (
                <p
                    style={{
                        fontSize: 12,
                        color: "#aaa",
                    }}
                >
                    You voted: {displayedVote}
                </p>
            )}

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: 300,
                    margin: "2px auto 8px auto",
                    color: "#ccc",
                    fontSize: 13,
                }}
            >
                <span>
                    {currentMatch.opponent_id ? (
                        <span
                            style={{
                                color: getUserColor(
                                    currentMatch.creator_id
                                ),
                            }}
                        >
                            {getSideName("A")} — {sides.A.votes}
                        </span>
                    ) : (
                        "⏳ Waiting for opponent..."
                    )}
                </span>

                <span>
                    <span
                        style={{
                            color: getUserColor(
                                currentMatch.opponent_id
                            ),
                        }}
                    >
                        {getSideName("B")} — {sides.B.votes}
                    </span>
                </span>
            </div>
            {/* PVP VOTE TRACK */}
            {totalVotes > 0 && (
                <div
                    style={{
                        position: "relative",
                        width: 300,
                        height: 10,
                        background: "#222",
                        borderRadius: 5,
                        overflow: "hidden",
                        margin: "8px auto",
                    }}
                >
                    {/* BLUE / CREATOR SIDE */}
                    <div
                        style={{
                            position: "absolute",
                            right: "50%",
                            top: 0,
                            height: "100%",
                            width: `${(sides.A.votes / totalVotes) * 50}%`,
                            background: "blue",
                            transition: "width 0.4s ease",
                        }}
                    />

                    {/* RED / OPPONENT SIDE */}
                    <div
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: 0,
                            height: "100%",
                            width: `${(sides.B.votes / totalVotes) * 50}%`,
                            background: "red",
                            transition: "width 0.4s ease",
                        }}
                    />

                    {/* WHITE SPLIT MARKER */}
                    <div
                        style={{
                            position: "absolute",
                            left: `${50 + ((sides.B.votes - sides.A.votes) / totalVotes) * 50
                                }%`,
                            top: -4,
                            transform: "translateX(-50%)",
                            width: 8,
                            height: 18,
                            background: "white",
                            borderRadius: 4,
                            transition:
                                "left 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                    />
                </div>
            )}
            {/* PVP VOTING BUTTONS */}
            {canVote && handleVote && !displayedVote && currentMatch.opponent_id && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 10,
                        marginTop: 15,
                    }}
                >
                    <button
                        onClick={() => handleVote("A")}
                        style={{
                            padding: "10px 18px",
                            borderRadius: 8,
                            border: "none",
                            background: "blue",
                            color: "white",
                            cursor: "pointer",
                            fontWeight: 600,
                        }}
                    >
                        {getSideName("A")}
                    </button>

                    <button
                        onClick={() => handleVote("B")}
                        style={{
                            padding: "10px 18px",
                            borderRadius: 8,
                            border: "none",
                            background: "red",
                            color: "white",
                            cursor: "pointer",
                            fontWeight: 600,
                        }}
                    >
                        {getSideName("B")}
                    </button>
                </div>
            )}
        </div>
    );
}
