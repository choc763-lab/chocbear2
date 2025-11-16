// src/App.jsx
import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import Admin from "./Admin";

const socket = io("https://chocbear.onrender.com", {
  transports: ["websocket"],
  autoConnect: true,
});


function App() {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [auctionState, setAuctionState] = useState("idle");
  const [remainingTime, setRemainingTime] = useState(180);
  const [bid, setBid] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [bidLogs, setBidLogs] = useState([]);
  const [maxPlayersPerTeam, setMaxPlayersPerTeam] = useState(3);

  // 🔊 전체 볼륨
  const [volume, setVolume] = useState(1);

  // ============================================================
  // 🔊 효과음 파일 (public/sounds)
  // ============================================================
  const bidSound = useRef(new Audio("/sounds/bid.mp3"));
  const winSound = useRef(new Audio("/sounds/win.mp3"));
  const beep10Sound = useRef(new Audio("/sounds/10sec.mp3"));

  useEffect(() => {
    bidSound.current.volume = volume;
    winSound.current.volume = volume;
    beep10Sound.current.volume = volume;
  }, [volume]);

  // ============================================================
  // SOCKET 연결
  // ============================================================
  useEffect(() => {
    socket.on("state", (data) => {
      setTeams(data.teams || []);
      setPlayers(data.players || []);
      setCurrentPlayer(data.currentPlayer || null);
      setAuctionState(data.auctionState || "idle");
      setRemainingTime(data.remainingTime ?? 180);

      if (data.maxPlayersPerTeam) {
        setMaxPlayersPerTeam(data.maxPlayersPerTeam);
      }

      if (!selectedTeam && data.teams?.length > 0) {
        setSelectedTeam(String(data.teams[0].id));
      }
    });

    socket.on("timer", (t) => {
      // 🔊 딱 10초 남았을 때만 비프음
      if (t === 10) {
        beep10Sound.current.currentTime = 0;
        beep10Sound.current.play();
      }

      setRemainingTime(t);
    });

    socket.on("errorMessage", (msg) => {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(""), 2500);
    });

    socket.on("bidLog", (log) => {
      setBidLogs((prev) => [log, ...prev]);

      // 🔊 입찰 발생 시 기본 입찰음
      bidSound.current.currentTime = 0;
      bidSound.current.play();
    });

    socket.on("clearBidLog", () => setBidLogs([]));

    return () => socket.disconnect();
  }, []);

  const emit = (event, payload) => socket.emit(event, payload);

  // ============================================================
  // 서버 명령
  // ============================================================
  const startAuction = () => emit("startAuction");

  const confirmAndNext = () => {
    // 🔊 낙찰 확정 시 효과음
    winSound.current.currentTime = 0;
    winSound.current.play();
    emit("confirmAndNext");
  };

  const nextPlayer = () => emit("nextPlayer");
  const reset = () => emit("reset");
  const restartUnsold = () => emit("restartUnsold");

  const placeBid = () => {
    emit("placeBid", {
      teamId: Number(selectedTeam),
      amount: bid,
    });
  };

  // ============================================================
  // 팀 카드
  // ============================================================
  const renderTeamCard = (team) => {
    const isFull = team.picks.length >= maxPlayersPerTeam;
    const logoSrc = team.logo || `/images/teams/team${team.id}.png`;

    return (
      <div
        key={team.id}
        className="rounded-3xl bg-slate-900/80 border border-slate-600 p-6 shadow-2xl flex flex-col h-[360px] min-w-[240px]"
      >
        <div className="flex items-center gap-4 mb-4">
          <img
            src={logoSrc}
            alt={team.name}
            className="w-16 h-16 rounded-full border border-slate-500 object-cover"
          />
          <h2 className="text-2xl font-bold">{team.name}</h2>
        </div>

        <p
          className={`text-lg px-3 py-1 text-center rounded-full mb-4 ${
            isFull
              ? "bg-red-600/20 text-red-300 border border-red-500"
              : "bg-emerald-600/20 text-emerald-300 border border-emerald-400"
          }`}
        >
          정원 {team.picks.length}/{maxPlayersPerTeam}
        </p>

        <p className="text-xl text-center mb-4">
          💸 {team.budget.toLocaleString()}P
        </p>

        <div className="grid gap-2 text-lg flex-1">
          {team.picks.length === 0 ? (
            <p className="text-gray-400 text-center">선수 없음</p>
          ) : (
            team.picks.slice(0, 4).map((p) => (
              <div
                key={p.id}
                className="flex justify-between bg-slate-800/60 px-4 py-2 rounded-xl"
              >
                <span>{p.name}</span>
                <span className="text-amber-300 font-semibold">{p.price}P</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // ============================================================
  // Admin 페이지 분기
  // ============================================================
  if (window.location.pathname === "/admin") {
    return (
      <Admin
        teams={teams}
        players={players}
        emit={emit}
        maxPlayersPerTeam={maxPlayersPerTeam}
      />
    );
  }

  // ============================================================
  // 메인 UI
  // ============================================================
  const currentPlayerImage =
    currentPlayer &&
    (currentPlayer.image ||
      `/images/players/player${currentPlayer.id}.png`);

  const leftIndices = [0, 1, 4, 5, 8];
  const rightIndices = [2, 3, 6, 7, 9];
  const leftTeams = teams.filter((_, idx) => leftIndices.includes(idx));
  const rightTeams = teams.filter((_, idx) => rightIndices.includes(idx));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 text-slate-50 px-4 py-4 flex justify-center">
      
      {/* 에러 메시지 */}
      {errorMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded shadow-lg z-50">
          {errorMessage}
        </div>
      )}

      <div className="w-full max-w-[1600px] grid grid-cols-12 gap-6">

        {/* LEFT TEAMS */}
        <div className="col-span-4 grid grid-cols-2 gap-4">
          {leftTeams.map((team) => renderTeamCard(team))}
        </div>

        {/* CENTER PANEL */}
        <div className="col-span-4 bg-slate-900/90 rounded-3xl border border-slate-700 p-5 shadow-2xl flex flex-col">

          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="flex items-center gap-3">
              <img
                src="/images/pubg-banner.png"
                className="w-12 h-10 object-cover rounded shadow"
                alt="PUBG"
              />
              <h1 className="text-3xl font-extrabold text-yellow-400">
                실시간 경매
              </h1>
            </div>

            {currentPlayerImage && (
              <div className="flex flex-col items-center mt-2">
                <img
                  src={currentPlayerImage}
                  className="w-[65%] rounded-xl border-4 border-yellow-400 shadow-lg"
                />
                <p className="text-xl font-semibold text-yellow-300 mt-2">
                  {currentPlayer?.name}
                </p>
              </div>
            )}
          </div>

          <div className="h-px bg-slate-700 my-2" />

          {/* 선수정보 */}
          <div className="grid grid-cols-2 gap-y-2 text-lg">
            <p>👤 선수: {currentPlayer?.name || "없음"}</p>
            <p>
              💸 현재가:{" "}
              <span className="text-emerald-300 font-semibold">
                {currentPlayer?.currentBid || 0}P
              </span>
            </p>
            <p>🏆 최고입찰자: {currentPlayer?.highestBidderId || "없음"}</p>
            <p>
              ⏱ 남은 시간:{" "}
              <span
                className={`font-bold ${
                  remainingTime <= 30 ? "text-red-300" : "text-pink-300"
                }`}
              >
                {remainingTime}s
              </span>
            </p>
          </div>

          {/* 버튼 */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={startAuction}
              className="bg-blue-600 hover:bg-blue-500 py-2 rounded font-bold"
            >
              경매 시작
            </button>
            <button
              onClick={confirmAndNext}
              className="bg-emerald-600 hover:bg-emerald-500 py-2 rounded font-bold"
            >
              낙찰 확정
            </button>
            <button
              onClick={nextPlayer}
              className="bg-amber-500 hover:bg-amber-400 py-2 rounded font-bold"
            >
              다음 선수
            </button>
            <button
              onClick={reset}
              className="bg-red-600 hover:bg-red-500 py-2 rounded font-bold"
            >
              초기화
            </button>
            <button
              onClick={restartUnsold}
              className="bg-purple-600 hover:bg-purple-500 py-2 rounded font-bold col-span-2"
            >
              미낙찰 재경매
            </button>
          </div>

          {/* 팀 선택 */}
          <div className="mt-4">
            <label className="text-sm text-slate-400">팀 선택</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded mt-1"
            >
              <option value="">-- 팀 선택 --</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (정원 {t.picks.length}/{maxPlayersPerTeam})
                </option>
              ))}
            </select>

            <div className="flex gap-2 mt-3">
              <input
                type="number"
                value={bid}
                onChange={(e) => setBid(Number(e.target.value))}
                className="flex-1 bg-slate-900 border border-slate-700 px-3 py-2 rounded"
                placeholder="입찰가"
              />
              <button
                onClick={placeBid}
                className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded font-semibold"
              >
                입찰
              </button>
            </div>
          </div>

          {/* 빠른입찰 */}
          <div className="flex gap-2 justify-center mt-3">
            {[5, 10, 50, 100].map((v) => (
              <button
                key={v}
                onClick={() => setBid((prev) => prev + v)}
                className="px-3 py-1 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded"
              >
                +{v}
              </button>
            ))}
          </div>

          {/* 입찰 로그 */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 mt-4 flex-1">
            <h2 className="font-semibold text-cyan-300 mb-2 text-lg">
              📢 입찰 로그
            </h2>

            <div className="max-h-40 overflow-y-auto space-y-1 text-base pr-1">
              {bidLogs.map((log, idx) => (
                <div
                  key={idx}
                  className="flex justify-between bg-slate-800/60 px-4 py-2 rounded"
                >
                  <span>
                    <b className="text-cyan-300">{log.teamName}</b> 팀 입찰
                  </span>
                  <span className="text-amber-300 font-semibold">
                    {log.amount}P
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 🔊 전체 볼륨 슬라이더 */}
          <div className="mt-4 bg-slate-800/70 p-3 rounded-xl border border-slate-700">
            <label className="text-sm text-slate-300">
              🔊 전체 볼륨 ({Math.round(volume * 100)}%)
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full mt-2 accent-yellow-400 cursor-pointer"
            />
          </div>
        </div>

        {/* RIGHT TEAMS */}
        <div className="col-span-4 grid grid-cols-2 gap-4">
          {rightTeams.map((team) => renderTeamCard(team))}
        </div>
      </div>
    </div>
  );
}

export default App;
