"use client";

import VoteBar from "./VoteBar";

type MatchStatus =
  | "open"
  | "active"
  | "lobby"
  | "waiting"
  | "finished"
  | "expired"
  | "cancelled";

type Match = {
  mode?: "pvp" | "solo";
  id: string;
  status: MatchStatus;
  title?: string;
  creator_id?: string;
  opponent_id?: string;
  creator?: any;
  opponent?: any;
  created_at?: string;
  bounty_pool?: number;
};

type Props = {
  currentMatch: Match | null;
  isMatchVisible: boolean;
  canViewVotes: boolean;
  myVote: "A" | "B" | null;
  voteCount: {
    a: number;
    b: number;
  };
  handleVote: (vote: "A" | "B") => void | Promise<void>;
  isSolo: boolean;
  getUserColor: (userId?: string) => string;
  getSideName: (side: "A" | "B") => string;
  totalVotes: number;
  canVote: boolean;
  getVoteLabel: (side: "A" | "B") => string;
  isCoolingDown: boolean;
  isSoloCreator: boolean;
  pendingVote: "A" | "B" | null;
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
  btn: React.CSSProperties;
};

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
  canVote,
  getVoteLabel,
  isCoolingDown,
  isSoloCreator,
  pendingVote,
  sides,
}: Props) {
  if (!currentMatch || !isMatchVisible) {
    return null;
  }

  const getUsername = (user: any) => {
    if (!user) return null;

    if (Array.isArray(user)) {
      return user[0]?.username || null;
    }

    return user.username || null;
  };

  const creatorName =
    getUsername(currentMatch.creator) || "Creator";

  const opponentName =
    getUsername(currentMatch.opponent) || "Opponent";

  const showOpponent =
    currentMatch.mode === "pvp" &&
    !!currentMatch.opponent_id;

  return (
    <section
      style={{
        width: "100%",
        maxWidth: 700,
        marginTop: 25,
        padding: 20,
        border: "1px solid #333",
        borderRadius: 12,
        background: "#111",
        color: "white",
        textAlign: "center",
      }}
    >
      <h2>
        {isSolo ? "🎲 Solo Match" : "🆚 PvP Match"}
      </h2>

      {currentMatch.title && (
        <h3
          style={{
            marginTop: 5,
            marginBottom: 15,
            fontSize: 22,
          }}
        >
          {currentMatch.title}
        </h3>
      )}

      <p style={{ color: "#aaa" }}>
        Match ID: <b>{currentMatch.id}</b>
      </p>

      <p>
        Status: <b>{currentMatch.status}</b>
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 20,
          marginTop: 25,
        }}
      >
        {/* CREATOR */}
        <div
          style={{
            padding: 15,
            borderRadius: 10,
            border: `2px solid ${getUserColor(
              currentMatch.creator_id
            )}`,
            minWidth: 180,
          }}
        >
          <h3>{creatorName}</h3>

          {!isSolo && (
            <p>
              Votes: <b>{voteCount.a}</b>
            </p>
          )}
        </div>

        {showOpponent && (
          <>
            <div
              style={{
                fontWeight: "bold",
                fontSize: 20,
              }}
            >
              VS
            </div>

            {/* OPPONENT */}
            <div
              style={{
                padding: 15,
                borderRadius: 10,
                border: `2px solid ${getUserColor(
                  currentMatch.opponent_id
                )}`,
                minWidth: 180,
              }}
            >
              <h3>{opponentName}</h3>

              <p>
                Votes: <b>{voteCount.b}</b>
              </p>
            </div>
          </>
        )}
      </div>

      {/* VOTING */}
      {canViewVotes && (
        <VoteBar
          isSolo={isSolo}
          currentMatch={currentMatch}
          voteCount={voteCount}
          sides={sides}
          totalVotes={totalVotes}
          getSideName={getSideName}
          getUserColor={getUserColor}
          myVote={myVote}
          pendingVote={pendingVote}
          handleVote={handleVote}
          canVote={canVote}
        />
      )}
    </section>
  );
}