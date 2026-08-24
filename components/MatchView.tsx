"use client";
import { useState } from "react";
import VoteBar from "./VoteBar";
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

                <VoteBar
                  isSolo={isSolo}
                  currentMatch={currentMatch}
                  voteCount={voteCount}
                  sides={sides}
                  totalVotes={totalVotes}
                  fillPercent={fillPercent}
                  getSideName={getSideName}
                  getUserColor={getUserColor}
                  myVote={myVote}
                  pendingVote={pendingVote}
                />

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
                    Confirm {getVoteLabel(selectedVote)} (−
                    {currentMatch?.bounty_pool ?? 0} bounty)
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

                {canVote &&
                  !isSoloCreator &&
                  (isCoolingDown ? (
                    <p style={{ marginTop: 10, color: "#888" }}>
                      ⏳ You voted:{" "}
                      <b>
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
                          background:
                            selectedVote === "A" ? "#ff4444" : "red",
                          color: "white",
                        }}
                        onClick={() => setSelectedVote("A")}
                      >
                        Select {getVoteLabel("A")}
                      </button>

                      <button
                        style={{
                          ...btn,
                          background:
                            selectedVote === "B" ? "#44ff44" : "green",
                          color: "white",
                        }}
                        onClick={() => setSelectedVote("B")}
                      >
                        Select {getVoteLabel("B")}
                      </button>
                    </>
                  ))}
              </div>
            </div>
          )}


        </div>
      )}
    </div>
  );
}