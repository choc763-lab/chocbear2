// src/Admin.jsx
import React, { useEffect, useState } from "react";

function Admin({ teams, players, emit, maxPlayersPerTeam }) {
  const [teamForm, setTeamForm] = useState([]);
  const [playerForm, setPlayerForm] = useState([]);
  const [capacity, setCapacity] = useState(3);

  // 서버에서 받은 최신 데이터 반영
  useEffect(() => {
    setTeamForm(teams.map((t) => ({ ...t })));
    setPlayerForm(players.map((p) => ({ ...p })));
  }, [teams, players]);

  useEffect(() => {
    if (maxPlayersPerTeam) setCapacity(maxPlayersPerTeam);
  }, [maxPlayersPerTeam]);

  // ======================================================
  // TEAM MODIFY
  // ======================================================
  const updateTeamField = (id, field, value) => {
    setTeamForm((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );

    emit("adminUpdateTeam", {
      id,
      [field]: field === "budget" ? Number(value) || 0 : value,
    });
  };

  // ======================================================
  // PLAYER MODIFY
  // ======================================================
  const updatePlayerField = (id, field, value) => {
    setPlayerForm((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );

    emit("adminUpdatePlayer", {
      id,
      [field]: value,
    });
  };

  // ======================================================
  // IMAGE UPLOAD
  // ======================================================
  const uploadImage = async (file, type, id) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("http://localhost:3000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!data.url) return alert("업로드 실패!");

      const url = data.url.startsWith("http")
        ? data.url
        : `http://localhost:3000${data.url}`;

      if (type === "team") updateTeamField(id, "logo", url);
      else updatePlayerField(id, "image", url);
    } catch (e) {
      console.log(e);
      alert("이미지 업로드 실패");
    }
  };

  // ======================================================
  // TEAM ADD / DELETE
  // ======================================================
  const handleAddTeam = () => {
    if (teams.length >= 10) return alert("팀은 최대 10개까지 가능!");

    const name =
      window.prompt("새 팀 이름을 입력하세요.", `팀 ${teams.length + 1}`) ||
      `팀 ${teams.length + 1}`;

    emit("adminAddTeam", { name });
  };

  const handleDeleteTeam = (team) => {
    if (team.picks.length > 0)
      return alert("선수 보유 중인 팀은 삭제 불가!");

    if (!window.confirm(`${team.name} 팀을 삭제할까요?`)) return;

    emit("adminDeleteTeam", team.id);
  };

  // ======================================================
  // PLAYER ADD / DELETE
  // ======================================================
  const handleAddPlayer = () => {
    if (players.length >= 40)
      return alert("선수는 최대 40명까지 가능합니다.");

    const name =
      window.prompt(
        "새 선수 이름을 입력하세요.",
        `선수 ${players.length + 1}`
      ) || `선수 ${players.length + 1}`;

    emit("adminAddPlayer", { name });
  };

  const handleDeletePlayer = (player) => {
    const used = teams.some((t) =>
      t.picks.some((p) => p.id === player.id)
    );

    if (used) return alert("이미 낙찰된 선수는 삭제할 수 없습니다.");
    if (!window.confirm(`${player.name} 선수를 삭제할까요?`)) return;

    emit("adminDeletePlayer", player.id);
  };

  // ======================================================
  // UI
  // ======================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-6 py-8">
      {/* HEADER */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-yellow-300">🛠 CK Admin Room</h1>
        <a
          href="/"
          className="text-sm text-cyan-300 underline hover:text-cyan-200"
        >
          ← 참가자 화면으로 이동
        </a>
      </header>

      {/* ======================================================
              AUCTION CONFIG
      ====================================================== */}
      <section className="rounded-2xl bg-slate-900/90 border border-slate-700 p-4 mb-6">
        <h2 className="text-lg font-semibold text-pink-300 mb-3">
          경매 설정 (팀 최대 정원)
        </h2>

        <div className="flex items-center gap-4">
          <span className="text-sm">팀 당 최대 낙찰 인원:</span>

          {[3, 4].map((v) => (
            <button
              key={v}
              onClick={() => {
                setCapacity(v);
                emit("adminSetConfig", { maxPlayersPerTeam: v });
              }}
              className={`px-3 py-1 rounded-full text-sm border ${
                capacity === v
                  ? "bg-emerald-500 text-black border-emerald-400"
                  : "bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700"
              }`}
            >
              {v}명
            </button>
          ))}
        </div>
      </section>

      {/* ======================================================
              TEAM SETTINGS
      ====================================================== */}
      <section className="rounded-2xl bg-slate-900/90 border border-slate-700 p-5 mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-emerald-300">
            팀 설정 (이름 / 예산 / 로고)
          </h2>
          <button
            onClick={handleAddTeam}
            className="text-xs px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500"
          >
            + 팀 추가
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-3">
          현재 팀: {teams.length} / 10
        </p>

        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
          {teamForm.map((team) => {
            const logoSrc = team.logo || `/images/teams/team${team.id}.png`;

            return (
              <div
                key={team.id}
                className="grid grid-cols-[auto,1fr,1fr,auto,auto] gap-4 bg-slate-800/60 rounded-xl p-3 items-center"
              >
                <div className="text-xs text-slate-400">ID {team.id}</div>

                {/* 팀 이름 */}
                <div>
                  <label className="text-xs text-slate-400">팀 이름</label>
                  <input
                    type="text"
                    value={team.name}
                    onChange={(e) =>
                      updateTeamField(team.id, "name", e.target.value)
                    }
                    className="mt-1 w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm"
                  />
                </div>

                {/* 예산 */}
                <div>
                  <label className="text-xs text-slate-400">예산</label>
                  <input
                    type="number"
                    value={team.budget}
                    onChange={(e) =>
                      updateTeamField(team.id, "budget", e.target.value)
                    }
                    className="mt-1 w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm"
                  />
                </div>

                {/* 이미지 */}
                <div className="flex items-center gap-2">
                  <img
                    src={logoSrc}
                    className="w-10 h-10 rounded-full border border-slate-600"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                  <label className="text-xs cursor-pointer bg-slate-700 hover:bg-slate-600 rounded px-2 py-1">
                    이미지 변경
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        uploadImage(e.target.files[0], "team", team.id)
                      }
                    />
                  </label>
                </div>

                {/* 삭제 */}
                <button
                  onClick={() => handleDeleteTeam(team)}
                  className="text-xs px-2 py-1 rounded bg-rose-600 hover:bg-rose-500"
                >
                  삭제
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ======================================================
              PLAYER SETTINGS
      ====================================================== */}
      <section className="rounded-2xl bg-slate-900/90 border border-slate-700 p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-cyan-300">
            선수 설정 (이름 / 이미지)
          </h2>
          <button
            onClick={handleAddPlayer}
            className="text-xs px-3 py-1 rounded-full bg-cyan-600 hover:bg-cyan-500"
          >
            + 선수 추가
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-3">
          현재 선수: {players.length} / 40
        </p>

        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
          {playerForm.map((player) => {
            const imgSrc =
              player.image || `/images/players/player${player.id}.png`;

            return (
              <div
                key={player.id}
                className="grid grid-cols-[auto,1fr,auto,auto] gap-4 bg-slate-800/60 rounded-xl p-3 items-center"
              >
                <div className="text-xs text-slate-400">ID {player.id}</div>

                {/* 이름 */}
                <div>
                  <label className="text-xs text-slate-400">선수 이름</label>
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) =>
                      updatePlayerField(player.id, "name", e.target.value)
                    }
                    className="mt-1 w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm"
                  />
                </div>

                {/* 이미지 */}
                <div className="flex items-center gap-2">
                  <img
                    src={imgSrc}
                    className="w-10 h-10 rounded-full border border-slate-600"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                  <label className="text-xs cursor-pointer bg-slate-700 hover:bg-slate-600 rounded px-2 py-1">
                    이미지 변경
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        uploadImage(e.target.files[0], "player", player.id)
                      }
                    />
                  </label>
                </div>

                {/* 삭제 */}
                <button
                  onClick={() => handleDeletePlayer(player)}
                  className="text-xs px-2 py-1 rounded bg-rose-600 hover:bg-rose-500"
                >
                  삭제
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default Admin;
