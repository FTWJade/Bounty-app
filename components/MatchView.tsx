"use client";
import { useState } from "react";
export default function MatchView({
  currentMatch,
  isMatchVisible,
  canViewVotes,
  myVote,
  voteCount,
  handleVote,
  isSolo,
  getUserColor,
  getSideName,
  totalVotes,
  fillPercent,
  canVote,
  getVoteLabel,
  isCoolingDown,
  isSoloCreator,
  pendingVote,
  sides,
  btn,
}: any) {
  const getVotedUsername = (vote: "A" | "B" | null) => {
    if (!vote || !currentMatch) return null;
    const user =
      vote === "A"
        ? currentMatch.creator
        : currentMatch.opponent;

    return user?.username || (vote === "A" ? "Creator" : "Opponent");
  };
  const displayedVote = myVote || pendingVote;
  const [selectedVote, setSelectedVote] = useState<"A" | "B" | null>(null);
  return (
    <div>
      {isMatchVisible && (
        <div
          style={{
            marginTop: 20,
            padding: 10,
            border: "1px solid #ccc",
            width: 340,
            textAlign: "center",
            borderRadius: 8,
          }}
        >
          <h3>🎮 Match</h3>

          <p>ID: {currentMatch.id}</p>
          <p>Status: {currentMatch.status}</p>

          {canViewVotes && (
            <div style={{ marginTop: 15 }}>
              <div style={{ marginTop: 10 }}>
                <h3>🗳 Vote</h3>
                {!isSolo ? (
                  <div style={{ textAlign: "center", marginBottom: 10 }}>

                    {(myVote || pendingVote) && (
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
                      {/* LEFT = OPPONENT */}
                      <span>
                        {currentMatch.opponent_id ? (
                          <>
                            <span style={{ color: getUserColor(currentMatch.creator_id) }}>
                              {getSideName("A")} — {sides.A.votes}
                            </span>
                          </>
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
                      {/* BLUE (creator) */}
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

                      {/* RED (opponent) */}
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
                ) : (

                  // KEEP YOUR SOLO UI EXACTLY AS IS
                  <div style={{ textAlign: "center", marginBottom: 10 }}>
                    {myVote && (
                      <p style={{ fontSize: 12, color: "#aaa" }}>
                        You voted: {myVote === "A" ? "LOSE" : "WIN"}
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
                      <span>
                        ❌ LOSE — {voteCount.a}
                      </span>

                      <span>
                        {voteCount.b} — WIN ✅
                      </span>
                    </div>
                    <div
                    >
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
                            top: -2, // 👈 key fix
                            left: `clamp(0%, calc(${fillPercent}% - 4px), calc(100% - 8px))`,
                            width: 8,
                            height: 14, // slightly taller so it reads clearly
                            background: "white",
                            borderRadius: 4,
                            transition: "left 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {selectedVote && (
                <button
                  style={{
                    ...btn,
                    background: "#222",
                    color: "white",
                    marginTop: 10,
                    border: "1px solid #555",
                  }}
                  onClick={() => {
                    handleVote(selectedVote);
                    setSelectedVote(null);
                  }}
                >
                  Confirm {getVoteLabel(selectedVote)} (−{currentMatch?.bounty_pool ?? 0} bounty)
                </button>
              )}
              {selectedVote && (
                <button
                  style={{
                    ...btn,
                    background: "#555",
                    color: "white",
                    marginTop: 5,
                  }}
                  onClick={() => setSelectedVote(null)}
                >
                  Cancel
                </button>
              )}
              {canVote && !isSoloCreator && (
                isCoolingDown ? (
                  <p style={{ marginTop: 10, color: "#888" }}>
                    ⏳ You voted:    <b>
                      {isSolo
                        ? myVote === "A"
                          ? "LOSE"
                          : "WIN"
                        : getVotedUsername(myVote)}
                    </b>
                  </p>
                ) : (
                  <>
                    <button
                      style={{
                        ...btn,
                        background: selectedVote === "A" ? "#ff4444" : "red",
                        color: "white",
                      }}
                      onClick={() => setSelectedVote("A")}
                    >
                      Select {getVoteLabel("A")}
                    </button>

                    <button
                      style={{
                        ...btn,
                        background: selectedVote === "B" ? "#44ff44" : "green",
                        color: "white",
                      }}
                      onClick={() => setSelectedVote("B")}
                    >
                      Select {getVoteLabel("B")}
                    </button>
                  </>
                )
              )}
            </div>
          )}


        </div>
      )}
    </div>
  );
}