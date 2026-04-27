"use client";
export default function MatchView({
  currentMatch,
  isMatchVisible,
  canViewVotes,
  myVote,
  voteCount,
  handleVote,
  isSolo,
  getUsername,
  getUserColor,
  getSideName,
  votes,
  leftVotes,
  rightVotes,
  creatorVotes,
  opponentVotes,
  totalVotes,
  fillPercent,
  canVote,
  getVoteLabel,
  session,
  btn,
}: any) {
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

                    {myVote && (
                      <p style={{ fontSize: 12, color: "#aaa" }}>
                        You voted: {myVote === "A"
                          ? getUsername(currentMatch.creator)
                          : getUsername(currentMatch.opponent)}
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
                              {getSideName("A")} — {votes.A}
                            </span>
                          </>
                        ) : (
                          "⏳ Waiting for opponent..."
                        )}
                      </span>

                      <span>
                        <span style={{ color: getUserColor(currentMatch.opponent_id) }}>
                          {getSideName("B")} — {votes.B}
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
                          width: `${(creatorVotes / totalVotes) * 100}%`,
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
                          width: `${(opponentVotes / totalVotes) * 100}%`,
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
              {canVote && (
                <>
                  <button
                    style={{ ...btn, background: "red", color: "white" }}
                    onClick={() => handleVote("A")}
                  >
                    Vote {getVoteLabel("A")}
                  </button>

                  <button
                    style={{ ...btn, background: "green", color: "white" }}
                    onClick={() => handleVote("B")}
                  >
                    Vote {getVoteLabel("B")}
                  </button>
                </>
              )}
            </div>
          )}


        </div>
      )}
    </div>
  );
}