"use client";

import { useEffect, useState } from "react";
import VoteBar from "../../components/VoteBar";
import { useSearchParams } from "next/navigation";
export default function Overlay() {
  const [voteCount, setVoteCount] = useState({ a: 0, b: 0 });
  const [winner, setWinner] = useState<string | null>(null);
  const params = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null;

  const matchId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("match")
      : null;
  const [match, setMatch] = useState<any>(null);
  const isSolo = match?.mode === "solo";

  const sides = {
    A: {
      user: match?.creator,
      userId: match?.creator_id,
      votes: voteCount.a,
    },
    B: {
      user: match?.opponent,
      userId: match?.opponent_id,
      votes: voteCount.b,
    },
  };

  const getSideName = (side: "A" | "B") => {
    const user = sides[side].user;

    if (Array.isArray(user)) {
      return user[0]?.username || side;
    }

    return user?.username || side;
  };

  const getUserColor = (userId?: string) => {
    if (!match) return "gray";

    if (userId === match.creator_id) return "blue";
    if (userId === match.opponent_id) return "red";

    return "gray";
  };

  const totalVotes = voteCount.a + voteCount.b || 1;

  const soloDiff = voteCount.b - voteCount.a;

  const fillPercent =
    50 + (soloDiff / totalVotes) * 50;
  useEffect(() => {
    if (!matchId) return;

    const loadVotes = async () => {
      const res = await fetch(`/api/match/votes?match_id=${matchId}`);
      const data = await res.json();

      setVoteCount({
        a: data.a ?? 0,
        b: data.b ?? 0,
      });
    };

    const loadMatch = async () => {
      const res = await fetch(`/api/match/get?id=${matchId}`);
      const data = await res.json();

      const match = data.data;
      if (!match) return;

      setMatch(match); // 👈 ADD THIS

      if (match.status === "finished") {
        setWinner(match.winner_id);
      }
    };

    loadVotes();
    loadMatch();

    const interval = setInterval(() => {
      loadVotes();
      loadMatch(); // 👈 important so winner updates live
    }, 1000);

    return () => clearInterval(interval);
  }, [matchId]);

  const total = voteCount.a + voteCount.b;
  const percentA = total === 0 ? 50 : (voteCount.a / total) * 100;

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
      {match && (
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
          <h3>🗳 Live Votes</h3>

          <VoteBar
            isSolo={isSolo}
            currentMatch={match}
            voteCount={voteCount}
            sides={sides}
            totalVotes={totalVotes}
            getSideName={getSideName}
            getUserColor={getUserColor}
            myVote={null}
            pendingVote={null}
          />
        </div>
      )}

      {winner && (
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0,0,0,0.9)",
            padding: "30px 50px",
            borderRadius: 12,
            fontSize: 28,
            fontWeight: "bold",
            color: "gold",
            textAlign: "center",
          }}
        >
          🏆 WINNER!
        </div>
      )}
    </div>
  );
}