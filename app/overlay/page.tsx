"use client";

import { useEffect, useState } from "react";
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
        position: "relative", // 👈 needed for overlay positioning
      }}
    >
      {/* 🗳 Voting UI */}
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

        <div style={{ marginBottom: 10 }}>
        {isSolo ? (
        <>
            <div>🏆 WIN: {voteCount.a}</div>
            <div>💀 LOSE: {voteCount.b}</div>
        </>
        ) : (
        <>
            <div>🔵 Player 1: {voteCount.a}</div>
            <div>🔴 Player 2: {voteCount.b}</div>
        </>
        )}
        </div>

        <div
          style={{
            width: "100%",
            height: 12,
            background: "#333",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${percentA}%`,
              height: "100%",
              background: "blue",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* 🏆 WINNER POPUP */}
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
            animation: "fadeIn 0.5s ease",
          }}
        >
          🏆 WINNER!
        </div>
      )}
    </div>
  );
}