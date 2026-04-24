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
  mode?: "pvp" | "solo";
  id: string;
  status: MatchStatus;
  creator_id?: string;
  opponent_id?: string;
  creator?: any;
  opponent?: any;
  created_at?: string; // ✅ add this
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
  const showPopup = (msg: string, duration = 1500) => {
    setPopup(msg);

    setTimeout(() => {
      setPopup(null);
    }, duration);
  };
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
    if (!user) return null; // 👈 CHANGE THIS
    if (Array.isArray(user)) return user[0]?.username || null;
    return user.username || null;
  };

  const [voteCount, setVoteCount] = useState({
    a: 0,
    b: 0,
  });
  const creator = currentMatch?.creator;
  const opponent = currentMatch?.opponent;

  const VOTE_CREATOR = "A";
  const VOTE_OPPONENT = "B";

  const creatorVotes = voteCount.a;
  const opponentVotes = voteCount.b;
  const totalVotes = creatorVotes + opponentVotes || 1;

  const creatorColor = "blue";
  const opponentColor = "red";
  const isParticipant =
    session?.user?.id === currentMatch?.creator_id ||
    session?.user?.id === currentMatch?.opponent_id;
    
  const isCreator = session?.user?.id === currentMatch?.creator_id;

  const leftUser = currentMatch?.creator;
  const rightUser = currentMatch?.opponent;

  const leftColor =
    leftUser?.id === currentMatch?.creator_id ? "red" : "blue";

  const rightColor =
    rightUser?.id === currentMatch?.creator_id ? "red" : "blue";
  const leftVotes = creatorVotes;
  const rightVotes = opponentVotes;
  const [myVote, setMyVote] = useState<"A" | "B" | null>(null);
  const [mode, setMode] = useState<"pvp" | "solo" | null>(null);
  const isSolo = currentMatch?.mode === "solo";
  const canFinishMatch =
    currentMatch?.mode === "pvp"
      ? isParticipant
      : session?.user?.id === currentMatch?.creator_id;

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

    const interval = setInterval(async () => {
      await fetch("/api/match/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: currentMatch.id,
          user_id: session.user.id,
        }),
      });
    }, 5000); // ping every 5 sec

    return () => clearInterval(interval);
  }, [currentMatch?.id, session?.user?.id]);

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
    if (!currentMatch?.id || !session?.user?.id) return;

    const interval = setInterval(async () => {
      const res = await fetch(`/api/match/get?id=${currentMatch.id}`);
      const data = await res.json();

      const match = data.data;
      if (!match) return;

      if (match.status !== "active" && match.status !== "open") return;

      // prevent instant false triggers after creation
      if (!currentMatch.created_at) return;
      const createdAt = new Date(currentMatch.created_at).getTime();
      if (Date.now() - createdAt < 5000) return;

      const creatorLeft =
        currentMatch.creator_id !== null && match.creator_id === null;

      const opponentLeft =
        currentMatch.opponent_id !== null && match.opponent_id === null;

      if (creatorLeft || opponentLeft) {
        await fetch("/api/match/force-close", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            match_id: currentMatch.id,
            caller_id: session.user.id,
          }),
        });

        setCurrentMatch(null);
        setMatchId("");
        setDidCreateMatch(false);
        showPopup("⚠️ Match closed (player left)");
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentMatch, session?.user?.id]);


  useEffect(() => {
    if (!currentMatch?.id || currentMatch.status === "finished") return;
    if (!session?.user?.id) return;

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

          // 🔥 refresh user + leaderboard ONCE
          await loadUser(session.user.id);

          const updatedLeaderboard = await fetch("/api/leaderboard");
          const lb = await updatedLeaderboard.json();
          setLeaderboard(lb.data || []);

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
  }, [currentMatch?.id, session?.user?.id]);

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
      showPopup("🎉 LEVEL UP!");
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
        showPopup(`+${data.pointsAdded} XP 🎉`);
        const newPoints = points + data.pointsAdded;
        setPoints(newPoints);
        animateXP(newPoints);
      }

      if (data.unlocked?.length > 0) {
        data.unlocked.forEach((a: string) => {
          setTimeout(() => showPopup(`🏆 ${a}`), 500);
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
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        fontFamily: "Arial",
        textAlign: "center",
      }}>
        <h1>Bounty App</h1>

        <p style={{
          marginTop: 10,
          marginBottom: 20,
          color: "#ccc",
          fontSize: 14,
          maxWidth: 280,
          lineHeight: 1.4,
        }}>
          Create matches, earn XP, climb levels, and compete in live PvP battles.
          Vote, win, and build your bounty score.
        </p>

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
    (
      isSolo
        ? true
        : participantCount >= 2
    );

  const hasTwoPlayers =
    currentMatch?.creator_id && currentMatch?.opponent_id;

  const canViewVotes = !!currentMatch;
  const showOpponent =
    currentMatch?.mode === "pvp" && !!currentMatch?.opponent_id;
  const canVote =
    !!currentMatch &&
    votingUnlocked &&
    (
      isSolo
        ? true // everyone in solo match can vote
        : session.user.id !== currentMatch.creator_id &&
        session.user.id !== currentMatch.opponent_id
    );

  const filteredLeaderboard = leaderboard
    .map((user, index) => ({ ...user, realRank: index + 1 }))
    .filter((user) =>
      user.username?.toLowerCase().includes(search.toLowerCase())
    );

  // map LEFT side to correct vote source
  const leftWidth = isCreator
    ? voteCount.b / totalVotes   // creator sees opponent on left
    : voteCount.a / totalVotes;  // opponent sees creator on left

  const rightWidth = isCreator
    ? voteCount.a / totalVotes   // creator is right
    : voteCount.b / totalVotes;  // opponent is right

  const left = isCreator ? voteCount.b : voteCount.a;
  const right = isCreator ? voteCount.a : voteCount.b;

  const diff = left - right;

  // normalize between 0 - 100 (center = 50)
  const fillPercent = 50 + (diff / totalVotes) * 50;


  const soloWinnerId =
    isSolo && currentMatch
      ? voteCount.a >= voteCount.b
        ? currentMatch.creator_id // WIN
        : null // LOSE (no winner)
      : null;


const handleVote = async (voteKey: "A" | "B", targetUser: any) => {
  if (!currentMatch || !session?.user?.id) return;

  const res = await fetch("/api/match/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      match_id: currentMatch.id,
      user_id: session.user.id,
      vote: voteKey,
    }),
  });

  const result = await res.json();

  if (!res.ok) {
    if (result.remaining) {
      const mins = Math.floor(result.remaining / 60);
      const secs = result.remaining % 60;
      showPopup(`⏳ ${mins}m ${secs}s`);
    } else {
      showPopup(result.error || "Unable to vote");
    }
    return;
  }

  const data = await fetch(`/api/match/votes?match_id=${currentMatch.id}`)
    .then(r => r.json());

  setVoteCount({
    a: data.a ?? 0,
    b: data.b ?? 0,
  });

  setMyVote(voteKey);

  const targetName =
    voteKey === "A" ? getUsername(leftUser) : getUsername(rightUser);

  showPopup(`Voted ${targetName}`);
};
      
      

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

      {!mode && (
        <div>
          <h2>Choose Mode</h2>

          <button onClick={() => setMode("pvp")} style={btn}>
            🆚 1v1 PvP
          </button>

          <button onClick={() => setMode("solo")} style={btn}>
            🎲 Solo Prediction
          </button>
        </div>
      )}
      {mode && (
        <button
          style={{ ...btn, background: "#444", color: "white" }}
          onClick={async () => {
            const res = await fetch("/api/match/create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: session.user.id,
                mode,
              }),
            });
            setMode(null);
            const result = await res.json();

            if (result.data) {
              const full = await fetch(`/api/match/get?id=${result.data.id}`).then(r => r.json());

              setCurrentMatch(full.data);
              setMatchId(full.data.id);
              setDidCreateMatch(true);
            }
          }}
        >
          🎮 Create Match
        </button>
      )}

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
                showPopup(text);

              } else {
                showPopup("Joined match!");
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

      {currentMatch?.mode === "pvp" && canFinishMatch && (
        <button
          style={{ ...btn, background: "green", color: "white" }}
          onClick={async () => {
            const res = await fetch("/api/match/finish", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                match_id: currentMatch.id,
                winner_id: session.user.id,
                caller_id: session.user.id,
              }),
            });

            if (!res.ok) {
              showPopup("Failed to finish match");
              return;
            }

            await loadUser(session.user.id);

            const updatedLeaderboard = await fetch("/api/leaderboard");
            const data = await updatedLeaderboard.json();
            setLeaderboard(data.data || []);

            showPopup("🏆 Match finished!");
            setCurrentMatch(null);
            setMatchId("");
            setDidCreateMatch(false);
          }}
        >
          🏆 Declare Winner (Me)
        </button>
      )}


      {currentMatch?.mode === "solo" && canFinishMatch && (
        <>
          <button
            style={{ ...btn, background: "green", color: "white" }}
            onClick={async () => {
              const res = await fetch("/api/match/finish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  match_id: currentMatch.id,
                  winner_id: currentMatch.creator_id,
                  caller_id: session.user.id,
                }),
              });

              if (!res.ok) {
                showPopup("Failed to finish match");
                return;
              }

              await loadUser(session.user.id);
              showPopup("🏆 You WON");

              setCurrentMatch(null);
              setMatchId("");
              setDidCreateMatch(false);
            }}
          >
            🏆 Win
          </button>

          <button
            style={{ ...btn, background: "red", color: "white" }}
            onClick={async () => {
              const res = await fetch("/api/match/finish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  match_id: currentMatch.id,
                  winner_id: null,
                  caller_id: session.user.id,
                }),
              });

              if (!res.ok) {
                showPopup("Failed to finish match");
                return;
              }

              await loadUser(session.user.id);
              showPopup("💀 You LOST");

              setCurrentMatch(null);
              setMatchId("");
              setDidCreateMatch(false);
            }}
          >
            💀 Lose
          </button>
        </>
      )}

      {isMatchVisible && (
        <div style={{ marginTop: 20, padding: 10, border: "1px solid #ccc" }}>
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
                        margin: "5px auto",
                        color: "#ccc",
                        fontSize: 13,
                      }}
                    >
                      {/* LEFT = OPPONENT */}
                      <span>
                        {currentMatch.opponent_id
                          ? `${getUsername(leftUser)} — ${leftVotes}`
                          : "⏳ Waiting for opponent..."}
                      </span>

                      <span>
                        {getUsername(rightUser)} — {rightVotes}
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
                        You voted: {myVote === "A" ? "WIN" : "LOSE"}
                      </p>
                    )}
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
                {/* LEFT */}
                <button
                  style={{ ...btn, background: leftColor, color: "white" }}
                  onClick={() => handleVote("A", leftUser)}
                >
                  {isSolo ? "Vote LOSE" : `Vote ${getUsername(leftUser)}`}
                </button>

                {/* RIGHT */}
                <button
                  style={{ ...btn, background: rightColor, color: "white" }}
                  onClick={() => handleVote("B", rightUser)}
                >
                  {isSolo ? "Vote WIN" : `Vote ${getUsername(rightUser)}`}
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