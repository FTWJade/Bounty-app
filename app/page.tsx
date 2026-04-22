"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { supabase } from "@/lib/supabase";

type MatchStatus =
  | "open"
  | "active"
  | "lobby"
  | "waiting"
  | "finished"
  | "expired"
  | "cancelled";

type Match = {
  id: string;
  status: MatchStatus;
  creator_id?: string;
  opponent_id?: string;
  creator?: any;
  opponent?: any;
};
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
const [matchId, setMatchId] = useState("");
const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
const [search, setSearch] = useState("");
const [didCreateMatch, setDidCreateMatch] = useState(false);
const isMatchVisible =
  !!currentMatch &&
  !["finished", "expired", "cancelled", "ended", "complete"].includes(
    currentMatch.status
  );
const getUsername = (user: any) => {
  if (!user) return "Waiting...";
  if (Array.isArray(user)) return user[0]?.username || "Waiting...";
  return user.username || "Waiting...";
};

const [voteCount, setVoteCount] = useState({
  a: 0,
  b: 0,
});

// const addDebugXP = (amount: number) => {
//   const newPoints = points + amount;

//     const inMatch =
//     currentMatch?.status === "open" ||
//     currentMatch?.status === "active";


//   setPoints(newPoints);
//   animateXP(newPoints);

//   console.log("🧪 DEBUG XP ADDED:", amount, "NEW TOTAL:", newPoints);
// };


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
  if (!currentMatch?.id || !session?.user?.id) return;

  const handleLeave = async () => {
    await fetch("/api/match/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        match_id: currentMatch.id,
        user_id: session.user.id,
      }),
    });
  };

  const onUnload = () => {
    handleLeave();
  };

  window.addEventListener("beforeunload", onUnload);

  return () => {
    window.removeEventListener("beforeunload", onUnload);
    handleLeave(); // also runs when React unmounts
  };
}, [currentMatch?.id]);

useEffect(() => {
  if (!currentMatch?.id) return;

  const loadVotes = async () => {
    const res = await fetch(`/api/match/votes?match_id=${currentMatch.id}`);
    const json = await res.json();

    console.log("🗳 POLL:", json);

    setVoteCount({
      a: json.a ?? 0,
      b: json.b ?? 0,
    });
  };

  const interval = setInterval(loadVotes, 1000); // faster = more “live”
  loadVotes(); // initial fetch

  return () => clearInterval(interval);
}, [currentMatch?.id]);

useEffect(() => {
   if (!currentMatch?.id || currentMatch.status === "finished") return;

  let active = true;

  const interval = setInterval(async () => {
    try {
      const res = await fetch(`/api/match/get?id=${currentMatch.id}`);
      if (!res.ok) return;

      const data = await res.json();

      if (!active || !data.data) return;

      const match = data.data;
    console.log("🗳 LIVE VOTES:", data);
      setCurrentMatch(match);
      if (
        match.status === "finished" ||
        match.status === "expired" ||
        match.status === "cancelled"
      ) {
        clearInterval(interval);
        active = false;

      setCurrentMatch(null);
      setMatchId("");
      setDidCreateMatch(false);
        console.log("🛑 Match ended → UI cleared");
      }

    } catch (err) {
      console.warn("Polling failed:", err);
    }
  }, 3000);

  return () => {
    active = false;
    clearInterval(interval);
  };
}, [currentMatch?.id]);

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
      minHeight: "100vh",
      justifyContent: "flex-start",
      alignItems: "stretch",
      flexDirection: "column",
      paddingTop: 20,
      paddingBottom: 80,
      paddingLeft: 12,
      paddingRight: 12,
      fontFamily: "Arial",
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

const myUser = leaderboard.find(
  (u) => u.user_id === session?.user?.id
);

const myRank = leaderboard.findIndex(
  (u) => u.user_id === session?.user?.id
) + 1;

const participantCount =
  (currentMatch?.creator_id ? 1 : 0) +
  (currentMatch?.opponent_id ? 1 : 0);

const votingUnlocked =
  !!currentMatch &&
  ["active", "open", "lobby", "waiting"].includes(currentMatch.status) &&
  participantCount >= 2;

const hasTwoPlayers =
  currentMatch?.creator_id && currentMatch?.opponent_id;

const canViewVotes = !!currentMatch;

const canVote =
  votingUnlocked &&
  participantCount >= 2 && // match must have both players
  session.user.id !== currentMatch?.creator_id &&
  session.user.id !== currentMatch?.opponent_id;

const filteredLeaderboard = leaderboard
  .map((user, index) => ({ ...user, realRank: index + 1 }))
  .filter((user) =>
    user.username?.toLowerCase().includes(search.toLowerCase())
  );
  

  const totalVotes = (voteCount.a ?? 0) + (voteCount.b ?? 0);
const hasVoteActivity = totalVotes > 0;



  return (
    <main style={{
      display: "flex",
      minHeight: "100vh",
      justifyContent: "flex-start",
      alignItems: "center",
      flexDirection: "column",
      paddingTop: 20,
      paddingBottom: 80,
      fontFamily: "Arial",
    }}>

      <div
  style={{
    position: "absolute",
    top: 10,
    left: 10,
    fontSize: 14,
  }}
>
  <a
    href="/about"
    style={{
      color: "#555",
      textDecoration: "none",
    }}
  >
    About
  </a>
</div>

<button
  style={{ ...btn, background: "#444", color: "white" }}
  onClick={async () => {

    await fetch("/api/bounty", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_id: session.user.id,
    username: session.user.name,
  }),
});

    const res = await fetch("/api/match/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: session.user.id }),
    });

    const result = await res.json();

    console.log("CREATE RESULT:", result);

if (result.data) {
  // 🔥 fetch full match with joins
  const res = await fetch(`/api/match/get?id=${result.data.id}`);
  const full = await res.json();

  setCurrentMatch(full.data);
  setMatchId(full.data.id);
  setDidCreateMatch(true);
}
  }}
>
  🎮 Create Match
</button>

{currentMatch && (
  <p style={{ marginTop: 10 }}>
    Match ID: <b>{currentMatch.id}</b>
  </p>
)}

{!currentMatch && (
  <div style={{ marginTop: 10 }}>
    <input
      value={matchId}
      onChange={(e) => setMatchId(e.target.value)}
      placeholder="Enter Match ID"
      style={{
        padding: "10px",
        borderRadius: 8,
        border: "1px solid #ccc",
      }}
    />

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
        const updated = await fetch(`/api/match/get?id=${matchId}`);
        const data = await updated.json();

        if (data.data) {
          setCurrentMatch(data.data);
        }
      }}
    >
      Join Match
    </button>
  </div>
)}


<button
  style={{ ...btn, background: "green", color: "white" }}
  onClick={async () => {
    if (!matchId) {
      setPopup("No match selected");
      return;
    }

    const res = await fetch("/api/match/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        match_id: matchId,
        winner_id: session.user.id,
      }),
    });

    if (!res.ok) {
      setPopup("Failed to finish match");
      return;
    }

    await loadUser(session.user.id);

    const updatedLeaderboard = await fetch("/api/leaderboard");
    const data = await updatedLeaderboard.json();
    setLeaderboard(data.data || []);

    setPopup("🏆 Match finished!");
    setCurrentMatch(null);
    setMatchId("");
    setDidCreateMatch(false);
  }}
>
  🏆 Win Match
</button>

{/* debug button */}
    {/* <button
  style={{
    marginTop: 10,
    padding: "8px 12px",
    background: "orange",
    color: "black",
    borderRadius: 6,
  }}
onClick={async () => {
  if (!currentMatch?.id) return;

for (let i = 0; i < 10; i++) {
  const vote = i % 2 === 0 ? "A" : "B";

  await fetch("/api/match/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      match_id: currentMatch.id,
      user_id: crypto.randomUUID(),
      vote,
    }),
  });
}

  const res = await fetch(`/api/match/votes?match_id=${currentMatch.id}`);
  
const data = await res.json();

setVoteCount({
  a: data.a ?? 0,
  b: data.b ?? 0,
});
}}
>
  🧪 Add Fake Vote
</button> */}

{isMatchVisible && (
  <div style={{ marginTop: 20, padding: 10, border: "1px solid #ccc" }}>
    <h3>🎮 Match</h3>

    <p>ID: {currentMatch.id}</p>
    <p>Status: {currentMatch.status}</p>
<p>
  Creator:{" "}
  {currentMatch.creator_id === session.user.id
    ? session.user.name
    : getUsername(currentMatch.creator)}
</p>
    <p>Opponent: {getUsername(currentMatch.opponent)}</p>


    
{canViewVotes && (
<div style={{ marginTop: 15 }}>
  <h3>🗳 Live Votes</h3>

<div>
  🔵 A: {getUsername(currentMatch.creator)} — {voteCount.a} votes
</div>

<div>
  🔴 B: {getUsername(currentMatch.opponent)} — {voteCount.b} votes
</div>
  <div style={{ marginTop: 10 }}>
    <h3>🗳 Vote</h3>

  <div
    style={{
      width: 300,
      height: 10,
      background: "#333",
      borderRadius: 5,
      overflow: "hidden",
      marginTop: 8,
    }}
  >
    <div
      style={{
        width: `${
          voteCount.a + voteCount.b === 0
            ? 50
            : (voteCount.a / (voteCount.a + voteCount.b)) * 100
        }%`,
        height: "100%",
        background: "blue",
        transition: "width 0.3s ease",
      }}
    />
  </div>
</div>
{canVote && (
  <>
    <button
      style={{ ...btn, background: "blue", color: "white" }}
      onClick={async () => {
        await fetch("/api/match/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            match_id: currentMatch.id,
            user_id: session.user.id,
            vote: "A",
          }),
        });

        setPopup("Voted Player A");
      }}
    >
      Vote {getUsername(currentMatch.creator)}
    </button>

    <button
      style={{ ...btn, background: "red", color: "white" }}
      onClick={async () => {
        await fetch("/api/match/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            match_id: currentMatch.id,
            user_id: session.user.id,
            vote: "B",
          }),
        });

        setPopup("Voted Player B");
      }}
    >
      Vote {getUsername(currentMatch.opponent)}
    </button>
  </>
)}
  </div>
)}


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
      {/* <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Set bounty amount"
        style={{
          padding: "10px",
          marginTop: "10px"
        }}
      /> */}
      <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search user..."
      style={{
        padding: "10px",
        borderRadius: 8,
        border: "1px solid #ccc",
        marginTop: 20,
        width: 300,
      }}
    />

<div style={{ marginTop: 30, textAlign: "center" }}>
  <h2>🏆 Leaderboard</h2>

    {search && myRank > 0 && (
      <p style={{ marginTop: 10, fontWeight: "bold" }}>
        Your rank #{myRank}
      </p>
    )}

  {filteredLeaderboard.map((user, index) => (
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
    #{user.realRank} {user.username}
      </span>
      <span>{user.points} pts</span>
    </div>
    ))}
  </div>

  {/* <button
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
  </button> */}

{/* <button
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
</button> */}


    {/* <button
      style={{
        ...btn,
        background: "orange",
        color: "black",
      }}
    onClick={async () => {
      if (!session?.user?.id) return;

      console.log("🧪 SIMULATING MATCH");

      const matchId = "debug-" + Date.now();

      const createRes = await fetch("/api/debug/create-fake-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: matchId,
          creator_id: session.user.id,
          opponent_id: "DEBUG_OPPONENT",
        }),
      });

      const createData = await createRes.json();

      if (!createData.data) return;

      await new Promise((r) => setTimeout(r, 300));

      await fetch("/api/match/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: matchId,
          winner_id: session.user.id,
        }),
      });

      await loadUser(session.user.id);

      setPopup("🧪 Debug match finished!");
      setCurrentMatch(null);
      setMatchId("");
      setDidCreateMatch(false);

      return;
    }}
    >
      🧪 SIMULATE MATCH WIN (DEBUG)
    </button> */}

<a
  href="https://www.buymeacoffee.com/justsojaded"
  target="_blank"
  rel="noopener noreferrer"
>
  <button
    style={{
      marginTop: "20px",
      padding: "10px 16px",
      background: "#FFDD00",
      color: "#000",
      borderRadius: "8px",
      fontWeight: "bold",
      border: "none",
      cursor: "pointer",
    }}
  >
    ☕ Buy me a coffee
  </button>
</a>

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