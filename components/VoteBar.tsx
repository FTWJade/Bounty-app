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
    fillPercent: number;
    getSideName: (side: "A" | "B") => string;
    getUserColor: (userId?: string) => string;
    myVote: "A" | "B" | null;
    pendingVote: "A" | "B" | null;
};

export default function VoteBar({
    isSolo,
    currentMatch,
    voteCount,
    sides,
    totalVotes,
    fillPercent,
    getSideName,
    getUserColor,
    myVote,
    pendingVote,
}: VoteBarProps) {
    const displayedVote = myVote || pendingVote;

    if (isSolo) {
        return (
            <div style={{ textAlign: "center", marginBottom: 10 }}>
                {displayedVote && (
                    <p style={{ fontSize: 12, color: "#aaa" }}>
                        You voted: {displayedVote === "A" ? "LOSE" : "WIN"}
                    </p>
                )}

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
                    <span>❌ LOSE — {voteCount.a}</span>
                    <span>
                        {voteCount.b} — WIN ✅
                    </span>
                </div>

                <div
                    style={{
                        width: 300,
                        height: 10,
                        background: "#333",
                        borderRadius: 5,
                        position: "relative",
                        overflow: "hidden",
                        margin: "8px auto",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            top: -2,
                            left: `calc(${fillPercent}% - 4px)`,
                            width: 8,
                            height: 14,
                            background: "white",
                            borderRadius: 4,
                            transition: "left 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div style={{ textAlign: "center", marginBottom: 10 }}>
            {displayedVote && (
                <p style={{ fontSize: 12, color: "#aaa" }}>
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
                        <span style={{ color: getUserColor(currentMatch.creator_id) }}>
                            {getSideName("A")} — {sides.A.votes}
                        </span>
                    ) : (
                        "⏳ Waiting for opponent..."
                    )}
                </span>

                <span>
                    <span style={{ color: getUserColor(currentMatch.opponent_id) }}>
                        {getSideName("B")} — {sides.B.votes}
                    </span>
                </span>
            </div>

            <div
                style={{
                    position: "relative",
                    width: 300,
                    height: 10,
                    background: "#222",
                    borderRadius: 5,
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        height: "100%",
                        width: `${(sides.A.votes / totalVotes) * 100}%`,
                        background: "blue",
                        transition: "width 0.3s ease",
                    }}
                />

                <div
                    style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        height: "100%",
                        width: `${(sides.B.votes / totalVotes) * 100}%`,
                        background: "red",
                        transition: "width 0.3s ease",
                    }}
                />
            </div>
        </div>
    );
}