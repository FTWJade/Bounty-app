"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { supabase } from "@/lib/supabase";
export default function Home() {
  const { data: session, status } = useSession();
  const [bounty, setBounty] = useState<number>(0);
  const [input, setInput] = useState<string>("");
  const [points, setPoints] = useState(0);
  const [displayPoints, setDisplayPoints] = useState(0);
  const safePoints = Number(displayPoints) || 0;
  const level = Math.floor(safePoints / 100) + 1;
  const xpIntoLevel = safePoints % 100;
  const [popup, setPopup] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const xpNeeded = 100;
const prevLevel = useRef(level);
const [discordLinked, setDiscordLinked] = useState(false);
const [matchId, setMatchId] = useState("");
const [createdMatchId, setCreatedMatchId] = useState("");
const [currentMatch, setCurrentMatch] = useState<any>(null);

const addDebugXP = (amount: number) => {
  const newPoints = points + amount;

    const inMatch =
    currentMatch?.status === "open" ||
    currentMatch?.status === "active";

    const canVote = currentMatch?.status === "active";


  setPoints(newPoints);
  animateXP(newPoints);

  console.log("🧪 DEBUG XP ADDED:", amount, "NEW TOTAL:", newPoints);
};


  const animateXP = (target: number) => {
  let start = displayPoints;
  let diff = target - start;

  if (diff === 0) return;

  const duration = 600; // ms
  const steps = 30;
  const increment = diff / steps;

  let current = start;
  let i = 0;

  const interval = setInterval(() => {
    i++;
    current += increment;

    if (i >= steps) {
      current = target;
      clearInterval(interval);
    }

    setDisplayPoints(Math.floor(current));
  }, duration / steps);
  };
  const loadUser = async (userId: string) => {
  const res = await fetch(`/api/bounty?user_id=${userId}`);
  const result = await res.json();


  if (result.data) {
    setBounty(result.data.bounty ?? 0);
    const newPoints = Number(result.data.points ?? 0);
    setPoints(newPoints);
    animateXP(newPoints);
  }
};

useEffect(() => {
  if (!currentMatch?.id) return;

  const interval = setInterval(async () => {
    const res = await fetch(`/api/match/get?id=${currentMatch.id}`);
    const data = await res.json();

    if (data.data) {
      setCurrentMatch(data.data);
    }
  }, 3000); // every 3 seconds

  return () => clearInterval(interval);
}, [currentMatch?.id]);

useEffect(() => {
  if (!session?.user?.id) return;

const checkDiscord = async () => {
  const res = await fetch(`/api/bounty?user_id=${session.user.id}`);
  const json = await res.json();

  const user = json.data;

  const linked = !!user?.discord_id;

  setDiscordLinked(linked);

  console.log("🔗 Discord linked:", linked, user);
};

  checkDiscord();
}, [session?.user?.id]);

useEffect(() => {
  const url = new URL(window.location.href);
  const discord = url.searchParams.get("discord");

  if (discord === "linked") {
    setDiscordLinked(true);
  }
}, []);

useEffect(() => {
  console.log("📊 STATE SNAPSHOT:", {
    points,
    displayPoints,
    level,
    xpIntoLevel,
  });
}, [points, displayPoints, level]);

useEffect(() => {
  if (!session?.user?.id) return;

  const loadLeaderboard = async () => {
    const res = await fetch("/api/leaderboard");
    const data = await res.json();
    setLeaderboard(data.data || []);
  };

  loadLeaderboard();

  const interval = setInterval(loadLeaderboard, 10000);

  return () => clearInterval(interval);
}, [session?.user?.id]);

useEffect(() => {
  if (!prevLevel.current) {
    prevLevel.current = level;
    return;
  }

  if (level > prevLevel.current) {
    setPopup("🎉 LEVEL UP!");
  }

  prevLevel.current = level;
}, [level]);

useEffect(() => {
  if (!session?.user?.id) return;

  const userId = session.user.id;

  const run = async () => {
    console.log("RUN DAILY FOR:", userId);

    await loadUser(userId);

    const daily = await fetch("/api/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });

    const data = await daily.json();

    if (data.pointsAdded) {
      setPopup(`+${data.pointsAdded} XP 🎉`);
      const newPoints = points + data.pointsAdded;
      setPoints(newPoints);
      animateXP(newPoints);
    }

    if (data.unlocked?.length > 0) {
      data.unlocked.forEach((a: string) => {
        setTimeout(() => setPopup(`🏆 ${a}`), 500);
      });
    }
  };

  run();
}, [session?.user?.id]);

if (status === "loading") {
  return <p>Loading...</p>;
}

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
  // simple reusable button style (so they STOP looking like text)
const btn = {
  marginTop: "10px",
  padding: "10px 14px",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
};

  return (
    <main style={{
      display: "flex",
      height: "100vh",
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "column",
      fontFamily: "Arial"
    }}>

<button
  style={{ ...btn, background: "#444", color: "white" }}
  onClick={async () => {
    const res = await fetch("/api/match/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: session.user.id }),
    });

    const result = await res.json();

    console.log("CREATE RESULT:", result);

    if (result.data) {
      setCurrentMatch(result.data);
      setMatchId(result.data.id); // auto-fill
    }
  }}
>
  🎮 Create Match
</button>

{createdMatchId && (
  <p style={{ marginTop: 10 }}>
    Match ID: <b>{createdMatchId}</b>
  </p>
)}

<button
  style={{ ...btn, background: "purple", color: "white" }}
  onClick={async () => {
    const res = await fetch("/api/match/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: session.user.id,
        match_id: matchId,
      }),
    });

    const text = await res.text();

    if (!res.ok) {
      setPopup(text);
    } else {
      setPopup("Joined match!");
    }
  }}
>
  🤝 Join Match
</button>

<button
  style={{ ...btn, background: "green", color: "white" }}
  onClick={async () => {
    if (!matchId) {
      setPopup("No match selected");
      return;
    }

    await fetch("/api/match/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        match_id: matchId,
        winner_id: session.user.id,
      }),
    });

    setPopup("🏆 Match finished!");
  }}
>
  🏆 Win Match
</button>

{currentMatch && (
  <div style={{ marginTop: 20, padding: 10, border: "1px solid #ccc" }}>
    <h3>🎮 Match</h3>

    <p>ID: {currentMatch.id}</p>
    <p>Status: {currentMatch.status}</p>

    <p>Creator: {currentMatch.creator?.username || currentMatch.creator_id}</p>
    <p>Opponent: {currentMatch.opponent?.username || "Waiting..."}</p>
  </div>
)}

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
      <p>{displayPoints} XP</p>

<div style={{ width: 300, height: 12, background: "#333", borderRadius: 6, overflow: "hidden", marginTop: 10 }}>
  <div
    style={{
      width: `${((xpIntoLevel || 0) / xpNeeded) * 100}%`,
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
  onClick={() => addDebugXP(50)}
  style={{
    marginTop: "20px",
    padding: "10px 16px",
    background: "orange",
    color: "black",
    borderRadius: "8px",
  }}
>
  🧪 Add 50 XP (Debug)
</button>

<button onClick={() => addDebugXP(10)}>+10 XP</button>
<button onClick={() => addDebugXP(50)}>+50 XP</button>
<button onClick={() => addDebugXP(120)}>+120 XP (level test)</button>

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
{!discordLinked ? (
  <button
    onClick={() => {
      const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
      if (!clientId) return;
console.log("STATE USER ID:", session.user.id);
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: "http://localhost:3000/api/discord/callback",
        response_type: "code",
        scope: "identify",
        state: session.user.id,
      });

      window.location.href =
        `https://discord.com/oauth2/authorize?${params.toString()}`;
    }}
    style={{
      marginTop: "10px",
      padding: "10px 16px",
      background: "#5865F2",
      color: "white",
    }}
  >
    Link Discord
  </button>
) : (
  <div style={{ marginTop: "10px", color: "limegreen" }}>
    ✅ Discord connected
  </div>
)}
{discordLinked && (
  <button
    onClick={async () => {
      await fetch("/api/discord/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: session.user.id }),
      });

      setDiscordLinked(false);
    }}
    style={{
      marginTop: "10px",
      padding: "10px 16px",
      background: "red",
      color: "white",
    }}
  >
    Disconnect Discord
  </button>
)}

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