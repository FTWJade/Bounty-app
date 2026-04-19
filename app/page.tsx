"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
export default function Home() {
  const { data: session } = useSession();
  const [bounty, setBounty] = useState<number>(0);
  const [input, setInput] = useState<string>("");
  const [points, setPoints] = useState(0);
  const [popup, setPopup] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const level = Math.floor(points / 100) + 1;
  const xpIntoLevel = points % 100;
  const xpNeeded = 100;
useEffect(() => {
  if (!session?.user?.id) return;

  const userId = session.user.id;

  const run = async () => {
    console.log("RUN DAILY FOR:", userId);

    const res = await fetch(`/api/bounty?user_id=${userId}`);
    const result = await res.json();

    if (result.data?.bounty !== undefined) {
      setBounty(result.data.bounty);
    }

    const daily = await fetch("/api/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
console.log("➡️ DAILY STATUS:", daily.status);
    const data = await daily.json();

    if (data.pointsAdded) {
      setPoints((p) => p + data.pointsAdded);
      setPopup(`+${data.pointsAdded} points! 🎉`);
    }

    setTimeout(() => setPopup(null), 3000);

    if (data.unlocked?.length > 0) {
      data.unlocked.forEach((a: string) => {
        setTimeout(() => {
          setPopup(`🏆 Achievement unlocked: ${a}`);
        }, 800);
        console.log("DAILY RESPONSE:", data);
      });
    }
  };
console.log("➡️ CALLING DAILY API");
  run();
}, [session?.user?.id]);

  if (!session) {
    return (
      <main style={{
        display: "flex",
        height: "100vh",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        fontFamily: "Arial"
      }}>
        <h1>Bounty App</h1>

        <button
          onClick={() => signIn("twitch")}
          style={{
            padding: "12px 20px",
            background: "#9146FF",
            color: "white",
            border: "none",
            borderRadius: "8px"
          }}
        >
          Login with Twitch
        </button>
      </main>
    );
  }
  return (
    <main style={{
      display: "flex",
      height: "100vh",
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "column",
      fontFamily: "Arial"
    }}>

{popup && (
  <div
    style={{
      position: "fixed",
      top: 20,
      right: 20,
      background: "#222",
      color: "white",
      padding: "12px 16px",
      borderRadius: 8,
      zIndex: 999,
    }}
  >
    {popup}
  </div>
)}

      <h1>Welcome {session.user?.name}</h1>

      <h2>Level {level}</h2>
      <p>{points} XP</p>

<div style={{ width: 300, height: 12, background: "#333", borderRadius: 6, overflow: "hidden", marginTop: 10 }}>
  <div
    style={{
      width: `${(xpIntoLevel / xpNeeded) * 100}%`,
      height: "100%",
      background: "limegreen",
      transition: "width 0.3s ease"
    }}
  />
</div>

<p>
  {xpIntoLevel} / {xpNeeded} XP
</p>

      <p>Current bounty: ${bounty}</p>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Set bounty amount"
        style={{
          padding: "10px",
          marginTop: "10px"
        }}
      />

<div style={{ marginTop: 30, textAlign: "center" }}>
  <h2>🏆 Leaderboard</h2>

  {leaderboard.map((user, index) => (
    <div
      key={user.user_id}
      style={{
        display: "flex",
        justifyContent: "space-between",
        width: 300,
        marginTop: 8,
        padding: 8,
        border: "1px solid #ccc",
        borderRadius: 6,
      }}
    >
      <span>
        #{index + 1} {user.username}
      </span>
      <span>{user.points} pts</span>
    </div>
  ))}
</div>

<button
onClick={async () => {
  console.log("SESSION:", session);
  console.log("USER ID:", session?.user?.id);

  if (!session?.user?.id) {
    console.log("NO USER ID YET");
    return;
  }
  const userId = session.user.id;
  const username = session?.user?.name;
await fetch("/api/bounty", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_id: session.user.id,
    username: session.user.name,
    bounty: Number(input),
  }),
});

  setBounty(Number(input));
}}
  
  
  style={{
    marginTop: "10px",
    padding: "10px 16px",
    background: "green",
    color: "white"
  }}
>
  Save Bounty
</button>

      <button
        onClick={() => signOut()}
        style={{
          marginTop: "20px",
          padding: "10px 16px"
        }}
      >
        Logout
      </button>
    </main>
  );
}