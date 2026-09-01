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
      {canCancelMatch && (
        <button
          onClick={handleCancelMatch}
          style={{
            ...btn,
            background: "#ff4444",
            color: "white",
            marginTop: 10,
          }}
        >

          ❌ Cancel Match
        </button>
      )}
      {mode && showModeSelect && (
        <button
          onClick={() => {
            setCurrentMatch(null);
            setMatchId("");
            setDidCreateMatch(false);
            setMode(null);
          }}
          style={{
            ...btn,
            background: "#333",
            color: "white",
            marginTop: 10,
          }}
        >
          ⬅ Back
        </button>
      )}
      {!mode && showModeSelect && (
        <div>
          <h2>Choose Mode</h2>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              marginTop: 10,
            }}
          >
            <button
              onClick={() => setMode("pvp")}
              style={{
                ...btn,
                background: "#1e90ff",
                color: "white",
                minWidth: 140,
              }}
            >
              🆚 PvP
            </button>

            <button
              onClick={() => setMode("solo")}
              style={{
                ...btn,
                background: "#ff9800",
                color: "white",
                minWidth: 140,
              }}
            >
              🎲 Solo
            </button>
          </div>
        </div>
      )}
      {mode && showModeSelect && (
        <div
          style={{
            marginTop: 15,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <p style={{ marginBottom: 2 }}>Input bet:</p>

          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Number(e.target.value))}
            placeholder="Enter bounty bet"
            style={{
              padding: "10px",
              borderRadius: 8,
              border: "1px solid #ccc",
              width: 200,
              textAlign: "center",
            }}
          />

          <button
            style={{
              ...btn,
              background: "#444",
              color: "white",
              width: 200,
            }}
            onClick={async () => {
              const res = await fetch("/api/match/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  user_id: session.user.id,
                  mode,
                  bet_amount: betAmount,
                }),
              });

              const result = await res.json();

              setMode(null);

              if (result.data) {
                const full = await fetch(`/api/match/get?id=${result.data.id}`)
                  .then(r => r.json());

                setCurrentMatch(full.data);
                setMatchId(full.data.id);
                setDidCreateMatch(true);
                setBounty((prev) => prev - betAmount);
              }
            }}
          >
            🎮 Create Match
          </button>
        </div>
      )}
      {currentMatch && !showModeSelect && (
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
              const res = await fetch(`/api/match/get?id=${matchId}`);
              const data = await res.json();

              const match = data.data;
              if (!match) {
                showPopup("Match not found");
                return;
              }

              const userId = session?.user?.id;

              const isCreator = userId === match.creator_id;
              const isOpponent = userId === match.opponent_id;
              const isParticipant = isCreator || isOpponent;

              const isPvPFull = match.mode === "pvp" && match.opponent_id;

              // 🟢 CASE 1: already participant → open match
              if (isParticipant) {
                setCurrentMatch(match);
                setMatchId("");
                setPendingJoin(null);
                return;
              }

              // 🎲 CASE 2: solo → skip everything
              if (match.mode === "solo") {
                setCurrentMatch(match);
                setMatchId("");
                setPendingJoin(null);
                return;
              }

              // 👀 CASE 3: PvP already full → spectator (no join UI)
              if (isPvPFull) {
                setCurrentMatch(match);
                setMatchId("");
                setPendingJoin(null);
                return;
              }

              // 🆕 CASE 4: PvP not full → THIS is join window
              setPendingJoin({
                matchId: match.id,
                betAmount: match.bounty_pool ?? 0,
                mode: match.mode,
                isParticipant: false,
              });
            }}
          >
            Join Match
          </button>
        </div>
      )}

      {shouldShowJoinPrompt && (
        <div
          style={{
            marginTop: 15,
            padding: 12,
            border: "1px solid #444",
            borderRadius: 8,
            width: 300,
            textAlign: "center",
            background: "#111",
          }}
        >
          <p style={{ marginBottom: 10 }}>
            Join match for <b>{previewCost}</b> bounty?
          </p>

          <div style={{ fontSize: 13, color: "#aaa", marginBottom: 10 }}>
            <div>You have: {previewCurrent}</div>
            <div>Cost: -{previewCost}</div>
            <div style={{ marginTop: 4 }}>
              After: <b>{previewAfter}</b>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              style={{ ...btn, background: "green", color: "white" }}
              onClick={async () => {
                if (!pendingJoin) return;

                const joinRes = await fetch("/api/match/join", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    user_id: session.user.id,
                    match_id: pendingJoin.matchId,
                  }),
                });

                const joinData = await joinRes.json();

                if (!joinRes.ok) {
                  showPopup(joinData.error || "Failed to join match");
                  return;
                }

                setCurrentMatch(joinData.data);
                setMatchId("");
                setPendingJoin(null);

                // ✅ ADD THIS
                await loadUser(session.user.id);

                showPopup(
                  joinData.alreadyJoined
                    ? "👀 You're already in this match"
                    : "✅ Joined match!"
                );
              }}
            >
              Confirm Join
            </button>

            <button
              style={{ ...btn, background: "red", color: "white" }}
              onClick={() => setPendingJoin(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {
        currentMatch?.mode === "pvp" && canFinishMatch && (
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
        )
      }


      {
        currentMatch?.mode === "solo" && canFinishMatch && (
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
        )
      }
      {
        isMatchVisible && (
          <MatchView
            currentMatch={currentMatch}
            isMatchVisible={isMatchVisible}
            canViewVotes={canViewVotes}
            myVote={myVote}
            voteCount={voteCount}
            handleVote={handleVote}
            isSolo={isSolo}
            getUserColor={getUserColor}
            getSideName={getSideName}
            totalVotes={totalVotes}
            fillPercent={fillPercent}
            canVote={canVote}
            getVoteLabel={getVoteLabel}
            isCoolingDown={isCoolingDown}
            isSoloCreator={isSoloCreator}
            pendingVote={pendingVote}
            sides={sides}
            btn={btn}
          />
        )
      }

      {
        popup && (
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
        )
      }