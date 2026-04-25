const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { fetchMatches } = require("../data/matches");
const { fetchOwners } = require("../data/owners");
const {
  aggregatePlayerPoints
} = require("../services/playerAggregation");
const { calculateOwnerLeaderboard } = require("../services/ownerLeaderboard");
const {
  fetchOfficialFantasyPlayers,
  readGeneratedOfficialPoints
} = require("../sources/ipl-fantasy/iplFantasySource");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizePlayerName(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildOutputSuffix(ownerSet) {
  const normalizedSet = String(ownerSet || "default").trim().toLowerCase();
  return normalizedSet === "default" ? "" : `-${slugify(normalizedSet)}`;
}

const overseasPlayers = new Set(
  [
    "Buttler",
    "Brevis",
    "Phillips",
    "Stoinis",
    "Santner",
    "Markram",
    "Hetmyer",
    "Stubbs",
    "Green",
    "Miller",
    "Rashid",
    "Starc",
    "Pathirana",
    "Ferguson",
    "Seifert",
    "Finn Allen",
    "Pooran",
    "Rabada",
    "Ellis",
    "De Kock",
    "Rickelton",
    "Tim David",
    "Henry",
    "Salt",
    "Jofra",
    "Klaseen",
    "Nissanka",
    "Will Jacks",
    "Sam curran",
    "Head",
    "Shepherd",
    "Jansen",
    "Ngidi",
    "Marsh",
    "Narine",
    "Noor",
    "Boult",
    "Hazlewood"
  ].map(normalizePlayerName)
);

function isOverseasPlayer(playerName) {
  return overseasPlayers.has(normalizePlayerName(playerName));
}

function buildTrackedPlayers(ownerLeaderboard) {
  const trackedPlayersByKey = new Map();

  ownerLeaderboard.forEach((owner) => {
    owner.squadPlayers.forEach((player) => {
      const playerKey =
        player.id && !String(player.id).startsWith("missing-")
          ? `id:${player.id}`
          : `name:${String(player.team || "UNKNOWN").toUpperCase()}|${normalizePlayerName(player.name)}`;

      if (trackedPlayersByKey.has(playerKey)) {
        return;
      }

        trackedPlayersByKey.set(playerKey, {
          id: player.id,
          name: player.name,
          team: player.team || "Unknown",
          totalPoints: player.totalPoints || 0,
          matchesPlayed: player.matchesPlayed || 0,
          matchBreakdowns: [...(player.matchBreakdowns || [])],
          isMissingStat: Boolean(player.isMissingStat)
        });
    });
  });

  return Array.from(trackedPlayersByKey.values()).sort(
    (firstPlayer, secondPlayer) => secondPlayer.totalPoints - firstPlayer.totalPoints
  );
}

function buildOwnersHtml(ownerLeaderboard, options = {}) {
  const playerDetailsFileName = options.playerDetailsFileName || "player-details.html";
  const alphabeticalTeams = [...ownerLeaderboard].sort((firstOwner, secondOwner) =>
    firstOwner.name.localeCompare(secondOwner.name)
  );
  const trackedPlayers = buildTrackedPlayers(ownerLeaderboard);
  const teamColorMap = {
    CSK: "#FFD700",
    MI: "#004B8D",
    RCB: "#EC1C24",
    SRH: "#EE7429",
    KKR: "#3A225D",
    RR: "#074EA2",
    GT: "#1B2133",
    PBKS: "#1B2133",
    DC: "#282968",
    LSG: "#0057E2"
  };
  const availableTeams = Array.from(
    new Set(
      ownerLeaderboard.flatMap((owner) =>
        owner.squadPlayers.map((player) => String(player.team || "").toUpperCase())
      )
    )
  )
    .filter((teamCode) => teamCode && teamCode !== "UNKNOWN")
    .sort();
  const longestPlayerNameLength = alphabeticalTeams.reduce((longestLength, owner) => {
    const ownerLongest = owner.squadPlayers.reduce(
      (teamLongest, player) => Math.max(teamLongest, player.name.length),
      0
    );
    return Math.max(longestLength, ownerLongest);
  }, 0);
  const maxSquadSize = alphabeticalTeams.reduce(
    (largestSquad, owner) => Math.max(largestSquad, owner.squadPlayers.length),
    0
  );
  const pointsColumnWidth = 24;
  const numberColumnWidth = 12;
  const nameColumnWidth = 100 - pointsColumnWidth - numberColumnWidth;

  const rankRows = ownerLeaderboard
    .map(
      (owner, index) => `
        <tr class="${index < 2 ? "winner-rank" : ""}">
          <td><span class="rank-pill rank-${index + 1}"></span></td>
          <td>${escapeHtml(owner.name)}</td>
          <td>${owner.totalPoints}</td>
        </tr>
      `
    )
    .join("");
  const playerPointRows = trackedPlayers
    .map(
      (player, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(player.team)}</td>
          <td>${escapeHtml(player.name)}</td>
          <td>${player.totalPoints}</td>
        </tr>
      `
    )
    .join("");
  const teamPointRows = Array.from(
    trackedPlayers.reduce((totalsByTeam, player) => {
      const teamCode = String(player.team || "Unknown").toUpperCase();
      const existing = totalsByTeam.get(teamCode) || {
        team: teamCode,
        points: 0,
        players: 0
      };
      existing.points += player.totalPoints || 0;
      existing.players += 1;
      totalsByTeam.set(teamCode, existing);
      return totalsByTeam;
    }, new Map()).values()
  )
    .sort((firstTeam, secondTeam) => secondTeam.points - firstTeam.points)
    .map(
      (teamEntry, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(teamEntry.team)}</td>
          <td>${teamEntry.players}</td>
          <td>${teamEntry.points}</td>
        </tr>
      `
    )
    .join("");

  const teamTables = alphabeticalTeams
    .map((owner) => {
      const selectedPlayerIds = new Set(owner.selectedPlayers.map((player) => player.id));
      const sortedSquadPlayers = [...owner.squadPlayers].sort(
        (firstPlayer, secondPlayer) => secondPlayer.totalPoints - firstPlayer.totalPoints
      );
      const playerRows = Array.from({ length: maxSquadSize }, (_, index) => {
        const player = sortedSquadPlayers[index];

        if (!player) {
          return `
            <tr class="empty-row">
              <td>${index + 1}</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
          `;
        }

          const isSelected = selectedPlayerIds.has(player.id);
          const overseasBadge = isOverseasPlayer(player.name)
            ? '<span class="overseas-badge" title="Overseas player">&#9992;</span>'
            : "";

          return `
            <tr class="${isSelected ? "selected-player" : ""}" data-team="${escapeHtml(
              String(player.team || "").toUpperCase()
            )}">
              <td>${index + 1}</td>
              <td><span>${escapeHtml(player.name)}</span> ${overseasBadge}</td>
              <td>${player.totalPoints}</td>
            </tr>
          `;
        }).join("");

      return `
        <table class="team-table">
          <colgroup>
            <col style="width: ${numberColumnWidth}%;" />
            <col style="width: ${nameColumnWidth}%;" />
            <col style="width: ${pointsColumnWidth}%;" />
          </colgroup>
          <thead>
            <tr>
              <th colspan="3">${escapeHtml(owner.name)}</th>
            </tr>
            <tr class="subhead">
              <th>#</th>
              <th>Player</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            ${playerRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2">Top 11 Total</td>
              <td>${owner.totalPoints}</td>
            </tr>
          </tfoot>
        </table>
      `;
    })
    .join("");
  const teamFilters = availableTeams
    .map((teamCode) => {
      const teamColor = teamColorMap[teamCode] || "#475569";
      return `<button class="team-filter" type="button" data-team-filter="${escapeHtml(
        teamCode
      )}" style="--team-filter-color: ${teamColor};">${escapeHtml(teamCode)}</button>`;
      })
      .join("");
  const teamColorScript = JSON.stringify(teamColorMap);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fantasy IPL Owners</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f8f5ef;
        --surface: #ffffff;
        --surface-soft: #fffaf2;
        --text: #1f2937;
        --muted: #6b7280;
        --accent: #8b5cf6;
        --accent-dark: #6d28d9;
        --accent-soft: #ede9fe;
        --border: #ddd6fe;
        --header: #f3f4f6;
        --rank: #f5f3ff;
        --gold: #f59e0b;
        --silver: #94a3b8;
        --winner-bg: #fff7ed;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: "Trebuchet MS", Arial, Helvetica, sans-serif;
        background:
          radial-gradient(circle at top left, #fef3c7 0%, transparent 22%),
          radial-gradient(circle at top right, #e9d5ff 0%, transparent 26%),
          linear-gradient(180deg, #fffaf5 0%, var(--bg) 100%);
        color: var(--text);
        min-height: 100vh;
      }

      .page {
        width: 100%;
        min-height: 100vh;
        padding: 8px 8px 10px;
      }

      .top-ribbon {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 10px;
        margin-bottom: 6px;
        padding: 7px 10px;
        border: 1px solid rgba(139, 92, 246, 0.16);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.86);
        backdrop-filter: blur(6px);
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
      }

      .ribbon-nav {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .ribbon-nav a {
        position: relative;
        color: var(--text);
        font-size: 0.68rem;
        font-weight: 700;
        text-decoration: none;
        padding: 2px 0;
      }

      .ribbon-nav a::after {
        content: "";
        position: absolute;
        left: 0;
        bottom: -2px;
        width: 100%;
        height: 2px;
        border-radius: 999px;
        background: linear-gradient(90deg, var(--accent-dark) 0%, var(--accent) 100%);
        transform: scaleX(0);
        transform-origin: left;
        transition: transform 0.2s ease;
      }

      .ribbon-nav a:hover::after {
        transform: scaleX(1);
      }

      .topbar {
        display: block;
        margin-bottom: 4px;
        padding: 6px 8px;
        border: 1px solid rgba(139, 92, 246, 0.16);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(6px);
        box-shadow: 0 10px 30px rgba(91, 33, 182, 0.08);
      }

      h1 {
        margin: 0;
        font-size: 1.05rem;
      }

      .intro {
        margin: 0;
        color: var(--muted);
        font-size: 0.66rem;
      }

      .rank-table,
      .team-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        background: var(--surface);
      }

      .rank-wrap {
        width: 138px;
        margin: 6px auto 0;
      }

      .rank-table {
        font-size: 0.62rem;
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: 7px;
        box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
      }

      .rank-table th,
      .rank-table td,
      .team-table th,
      .team-table td {
        border: 1px solid var(--border);
        padding: 3px;
      }

      .rank-table th,
      .rank-table td {
        padding: 1px 3px;
        line-height: 1.05;
      }

      .rank-table thead th {
        background: var(--rank);
        text-align: left;
      }

      .rank-table th:first-child,
      .rank-table td:first-child {
        width: 22px;
        text-align: center;
      }

      .winner-rank td {
        background: var(--winner-bg);
        font-weight: 700;
      }

      .rank-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        text-align: center;
        font-size: 0.6rem;
        font-weight: 700;
        line-height: 1;
        color: #111827;
        background: transparent;
        border: 0;
        box-shadow: none;
      }

      .rank-1,
      .rank-2 {
        width: 15px;
        height: 15px;
        font-size: 0.84rem;
      }

      .rank-1::before {
        content: "\\1F947";
      }

      .rank-2::before {
        content: "\\1F948";
      }

      .rank-3::before {
        content: "3";
      }

      .rank-4::before {
        content: "4";
      }

      .rank-5::before {
        content: "5";
      }

      .rank-6::before {
        content: "6";
      }

      .rank-7::before {
        content: "7";
      }

      .rank-8::before {
        content: "8";
      }

      .rank-medal {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        margin-right: 4px;
        border-radius: 999px;
        vertical-align: middle;
      }

      .rank-1 {
        color: inherit;
      }

      .rank-2 {
        color: inherit;
      }

      .rank-3,
      .rank-4,
      .rank-5,
      .rank-6,
      .rank-7,
      .rank-8 {
        color: #111827;
      }

      .teams-grid {
        display: grid;
        grid-template-columns: repeat(8, minmax(0, 1fr));
        gap: 6px;
        align-items: start;
      }

      .team-table {
        font-size: 0.64rem;
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: 11px;
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.07);
      }

      .team-table thead th {
        background: linear-gradient(135deg, var(--accent-dark) 0%, var(--accent) 100%);
        color: #fff;
        text-align: left;
      }

      .team-table thead .subhead th {
        background: var(--header);
        color: var(--text);
      }

      .team-table th:nth-child(1),
      .team-table td:nth-child(1) {
        text-align: center;
        white-space: nowrap;
      }

      .team-table th:nth-child(2),
      .team-table td:nth-child(2) {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: clip;
      }

      .team-table th:nth-child(3),
      .team-table td:nth-child(3) {
        text-align: right;
        white-space: nowrap;
        min-width: 62px;
        padding-right: 8px;
        font-size: 0.68rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }

      .team-table tbody td {
        height: 20px;
        line-height: 1;
      }

      .selected-player td {
        background: var(--accent-soft);
        font-weight: 700;
      }

      .team-highlight td {
        background: color-mix(in srgb, var(--team-highlight-color, #fde68a) 18%, white);
      }

      .team-highlight.selected-player td {
        background: color-mix(in srgb, var(--team-highlight-color, #fde68a) 28%, white);
      }

      .empty-row td {
        color: transparent;
      }

      .overseas-badge {
        color: #c2410c;
        font-size: 0.72rem;
        font-weight: 700;
        white-space: nowrap;
      }

      .team-table tfoot td {
        background: #dcfce7;
        color: #14532d;
        font-weight: 800;
        border-top: 2px solid #86efac;
      }

      .footer-note {
        margin-top: 6px;
        padding: 6px 8px;
        border: 1px solid rgba(139, 92, 246, 0.14);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.8);
        color: var(--muted);
        font-size: 0.64rem;
        text-align: right;
      }

      .team-filters {
        margin-top: 6px;
        padding: 7px 8px;
        border: 1px solid rgba(139, 92, 246, 0.14);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.82);
      }

      .team-filters-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 5px;
      }

      .team-filters-title {
        margin: 0;
        font-size: 0.72rem;
        font-weight: 700;
        color: var(--text);
      }

      .team-filters-help {
        margin: 0;
        font-size: 0.62rem;
        color: var(--muted);
      }

      .team-filters-grid {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
      }

      .team-filter {
        appearance: none;
        border: 2px solid var(--team-filter-color);
        background: #ffffff;
        color: var(--team-filter-color);
        border-radius: 999px;
        padding: 4px 9px;
        font-size: 0.62rem;
        font-weight: 800;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
      }

      .team-filter:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 14px rgba(15, 23, 42, 0.18);
      }

      .team-filter.active {
        background: var(--team-filter-color);
        border-color: var(--team-filter-color);
        color: white;
        box-shadow:
          0 0 0 3px color-mix(in srgb, var(--team-filter-color) 28%, white),
          0 8px 18px rgba(15, 23, 42, 0.22);
      }

      .clear-filters {
        appearance: none;
        border: 1px solid rgba(31, 41, 55, 0.16);
        background: white;
        color: var(--text);
        border-radius: 999px;
        padding: 4px 9px;
        font-size: 0.62rem;
        font-weight: 800;
        cursor: pointer;
      }

      .stats-section {
        margin-top: 8px;
        padding: 10px;
        border: 1px solid rgba(139, 92, 246, 0.14);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.82);
      }

      .stats-section h2 {
        margin: 0 0 8px;
        font-size: 0.82rem;
      }

      .stats-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.66rem;
        background: white;
      }

      .stats-table th,
      .stats-table td {
        border: 1px solid var(--border);
        padding: 4px 6px;
      }

      .stats-table thead th {
        background: var(--header);
        text-align: left;
      }

      .stats-table td:last-child,
      .stats-table th:last-child {
        text-align: right;
      }

      @media print {
        .page {
          padding: 6px;
        }
      }

      @media (max-width: 1500px) {
        .rank-wrap {
          width: 138px;
        }

        .teams-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }

      @media (max-width: 900px) {
        .teams-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 540px) {
        .top-ribbon {
          overflow-x: auto;
        }

        .ribbon-nav {
          flex-wrap: nowrap;
          gap: 10px;
        }

        .teams-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="topbar">
        <div>
          <h1 id="leaderboard">Fantasy IPL 2026</h1>
          <p class="intro">Teams shown alphabetically. Ranking is based on top 11 total points.</p>
        </div>
      </section>
      <section class="top-ribbon">
        <nav class="ribbon-nav" aria-label="Info links">
          <a href="./${escapeHtml(playerDetailsFileName)}">Player Points</a>
          <a href="#points-system">Points System</a>
          <a href="#rules">Rules</a>
          <a href="#injury-replacements">Injury Replacements</a>
        </nav>
      </section>
      <section id="teams" class="teams-grid">
        ${teamTables}
      </section>
      <section class="rank-wrap">
        <table class="rank-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Owner</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            ${rankRows}
          </tbody>
        </table>
      </section>
      <section id="overseas" class="footer-note">
        &#9992; = overseas player
      </section>
      <section class="team-filters">
        <div class="team-filters-header">
          <p class="team-filters-title">Highlight Teams</p>
          <p class="team-filters-help">Click one or more teams to highlight their players across all owners.</p>
        </div>
        <div class="team-filters-grid">
          ${teamFilters}
          <button class="clear-filters" type="button" id="clear-team-filters">Clear All</button>
        </div>
      </section>
    </main>
    <script>
      const TEAM_COLORS = ${teamColorScript};
      const activeTeams = new Set();
      const filterButtons = Array.from(document.querySelectorAll("[data-team-filter]"));
      const playerRows = Array.from(document.querySelectorAll("tr[data-team]"));
      const clearTeamFiltersButton = document.getElementById("clear-team-filters");

        function applyTeamHighlights() {
          playerRows.forEach((row) => {
            const teamCode = (row.dataset.team || "").toUpperCase();
          if (activeTeams.has(teamCode)) {
              row.classList.add("team-highlight");
              row.style.setProperty("--team-highlight-color", TEAM_COLORS[teamCode] || "#fde68a");
            } else {
            row.classList.remove("team-highlight");
            row.style.removeProperty("--team-highlight-color");
          }
        });

        filterButtons.forEach((button) => {
          const teamCode = (button.dataset.teamFilter || "").toUpperCase();
          button.classList.toggle("active", activeTeams.has(teamCode));
        });
      }

      filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const teamCode = (button.dataset.teamFilter || "").toUpperCase();
          if (!teamCode) {
            return;
          }

          if (activeTeams.has(teamCode)) {
            activeTeams.delete(teamCode);
          } else {
            activeTeams.add(teamCode);
          }

          applyTeamHighlights();
        });
      });

      if (clearTeamFiltersButton) {
        clearTeamFiltersButton.addEventListener("click", () => {
          activeTeams.clear();
          applyTeamHighlights();
        });
      }
    </script>
  </body>
</html>`;
}

function writeOwnersHtml(ownerLeaderboard, options = {}) {
  const fileName = options.fileName || "owners.html";
  const htmlPath = path.resolve(__dirname, `../../${fileName}`);
  const html = buildOwnersHtml(ownerLeaderboard, options);
  fs.writeFileSync(htmlPath, html, "utf8");
  return htmlPath;
}

function buildTrackedPlayers(ownerLeaderboard) {
  const trackedPlayersByKey = new Map();

  ownerLeaderboard.forEach((owner) => {
    owner.squadPlayers.forEach((player) => {
      const playerKey =
        player.id && !String(player.id).startsWith("missing-")
          ? `id:${player.id}`
          : `name:${String(player.team || "UNKNOWN").toUpperCase()}|${normalizePlayerName(player.name)}`;

      if (trackedPlayersByKey.has(playerKey)) {
        return;
      }

        trackedPlayersByKey.set(playerKey, {
          id: player.id,
          name: player.name,
          team: player.team || "Unknown",
          totalPoints: player.totalPoints || 0,
          matchesPlayed: player.matchesPlayed || 0,
          matchBreakdowns: [...(player.matchBreakdowns || [])],
          isMissingStat: Boolean(player.isMissingStat)
        });
    });
  });

  return Array.from(trackedPlayersByKey.values()).sort(
    (firstPlayer, secondPlayer) => secondPlayer.totalPoints - firstPlayer.totalPoints
  );
}

function buildPlayerOwnerMap(ownerLeaderboard) {
  const playerOwners = new Map();

  ownerLeaderboard.forEach((owner) => {
    owner.squadPlayers.forEach((player) => {
      const playerKey =
        player.id && !String(player.id).startsWith("missing-")
          ? `id:${player.id}`
          : `name:${String(player.team || "UNKNOWN").toUpperCase()}|${normalizePlayerName(player.name)}`;

      if (!playerOwners.has(playerKey)) {
        playerOwners.set(playerKey, []);
      }

      playerOwners.get(playerKey).push(owner.name);
    });
  });

  return playerOwners;
}

function buildPlayerDetailsHtml(players, options = {}) {
  const ownersFileName = options.ownersFileName || "owners.html";
  const ownerLeaderboard = options.ownerLeaderboard || [];
  const playerOwnerMap = buildPlayerOwnerMap(ownerLeaderboard);
  const ownerNames = ownerLeaderboard.map((owner) => owner.name);
  const ownerFilterButtons = ownerNames
    .map(
      (ownerName) =>
        `<button class="owner-filter" type="button" data-owner-filter="${escapeHtml(ownerName)}">${escapeHtml(ownerName)}</button>`
    )
    .join("");
  const playersByTeam = players.reduce((groupedPlayers, player) => {
    const teamCode = String(player.team || "Unknown").toUpperCase();
    if (!groupedPlayers.has(teamCode)) {
      groupedPlayers.set(teamCode, []);
    }
    groupedPlayers.get(teamCode).push(player);
    return groupedPlayers;
  }, new Map());

  const playerSections = Array.from(playersByTeam.entries())
    .map(([teamCode, teamPlayers]) => {
      const teamPlayerRows = teamPlayers
        .sort((firstPlayer, secondPlayer) => secondPlayer.totalPoints - firstPlayer.totalPoints)
        .map((player, index) => {
          const playerKey =
            player.id && !String(player.id).startsWith("missing-")
              ? `id:${player.id}`
              : `name:${String(player.team || "UNKNOWN").toUpperCase()}|${normalizePlayerName(player.name)}`;
          const playerOwners = playerOwnerMap.get(playerKey) || [];
          const matchCards = [...player.matchBreakdowns]
            .sort((firstMatch, secondMatch) => secondMatch.matchId.localeCompare(firstMatch.matchId))
            .map((matchBreakdown) => {
              const items = [
                ["Starting XI", matchBreakdown.breakdown.startingXI],
                ["Runs", matchBreakdown.breakdown.runs],
                ["4s", matchBreakdown.breakdown.fours],
                ["6s", matchBreakdown.breakdown.sixes],
                ["Bat Bonus", matchBreakdown.breakdown.battingBonus],
                ["Duck", matchBreakdown.breakdown.duckPenalty],
                ["Wickets", matchBreakdown.breakdown.wickets],
                ["LBW/Bowled", matchBreakdown.breakdown.lbwBowledBonus],
                ["Maiden", matchBreakdown.breakdown.maidenOvers],
                ["Wkt Bonus", matchBreakdown.breakdown.wicketBonus],
                ["Catches", matchBreakdown.breakdown.catches],
                ["3 Catch Bonus", matchBreakdown.breakdown.catchBonus],
                ["Stumpings", matchBreakdown.breakdown.stumpings],
                ["Direct RO", matchBreakdown.breakdown.directRunOuts],
                ["Indirect RO", matchBreakdown.breakdown.indirectRunOuts],
                ["S/R", matchBreakdown.breakdown.strikeRate],
                ["E/R", matchBreakdown.breakdown.economyRate]
              ]
                .filter(([, value]) => value !== 0)
                .map(
                  ([label, value]) =>
                    `<span class="breakdown-chip"><strong>${escapeHtml(label)}</strong> ${value}</span>`
                )
                .join("");

              return `
                <details class="match-card">
                  <summary>
                    <span class="match-name">${escapeHtml(matchBreakdown.match)}</span>
                    <span class="match-points">${matchBreakdown.points} pts</span>
                  </summary>
                  <div class="match-meta">${escapeHtml(matchBreakdown.status)}</div>
                  <div class="breakdown-grid">${items || '<span class="breakdown-chip">No scoring events</span>'}</div>
                </details>
              `;
            })
            .join("");

          return `
            <details
              id="${slugify(`${player.team}-${player.name}`)}"
              class="player-row-card"
              data-owners="${escapeHtml(playerOwners.join("|"))}"
            >
              <summary class="player-row-summary">
                <span class="player-rank">#${index + 1}</span>
                <span class="player-name">${escapeHtml(player.name)}</span>
                <span class="player-total">${player.totalPoints} pts</span>
              </summary>
              <div class="player-row-body">
                ${matchCards}
              </div>
            </details>
          `;
        })
        .join("");

      const sectionHtml = `
        <section class="team-section">
          <h2 class="team-heading">${escapeHtml(teamCode)}</h2>
          <div class="team-player-list">
            ${teamPlayerRows}
          </div>
        </section>
      `;
      return {
        teamCode,
        playerCount: teamPlayers.length,
        html: sectionHtml
      };
    })
    .sort((firstTeam, secondTeam) => {
      if (secondTeam.playerCount !== firstTeam.playerCount) {
        return secondTeam.playerCount - firstTeam.playerCount;
      }
      return firstTeam.teamCode.localeCompare(secondTeam.teamCode);
    });

  const columnCount = 5;
  const topRowTeams = playerSections.slice(0, columnCount);
  const bottomRowTeams = playerSections.slice(columnCount);
  const orderedSections = [...topRowTeams, ...bottomRowTeams];

  const playerGridItems = orderedSections
    .map((item) => item.html)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Player Match Points</title>
    <style>
      :root {
        --bg: #f6f2e8;
        --surface: #ffffff;
        --text: #172033;
        --muted: #667085;
        --accent: #0f766e;
        --accent-soft: #ccfbf1;
        --border: #d9e3ea;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Trebuchet MS", Arial, Helvetica, sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, #fef3c7 0%, transparent 22%),
          radial-gradient(circle at top right, #bfdbfe 0%, transparent 24%),
          linear-gradient(180deg, #fffaf4 0%, var(--bg) 100%);
      }
      .page { width: 100%; margin: 0 auto; padding: 6px 8px 8px; }
      .header {
        margin-bottom: 6px;
        padding: 7px 10px;
        border: 1px solid rgba(15, 118, 110, 0.15);
        border-radius: 10px;
        background: rgba(255,255,255,0.88);
      }
      .header h1 { margin: 0 0 1px; font-size: 0.96rem; }
      .header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .header p {
        margin: 0;
        color: var(--muted);
        font-size: 0.7rem;
        flex: 1 1 auto;
      }
      .nav-link {
        display: inline-block;
        color: var(--accent);
        font-weight: 700;
        text-decoration: none;
        font-size: 0.75rem;
        white-space: nowrap;
      }
      .players-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 4px;
        align-items: start;
      }
      .team-section { margin-top: 0; }
      .team-heading {
        margin: 0 0 3px;
        padding: 3px 6px;
        border-left: 4px solid var(--accent);
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.78);
        font-size: 0.72rem;
        line-height: 1.1;
      }
      .team-player-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .player-row-card {
        border: 1px solid var(--border);
        border-radius: 7px;
        background: var(--surface);
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
        overflow: hidden;
      }
      .player-row-summary {
        display: grid;
        grid-template-columns: 24px minmax(0, 1fr) auto;
        align-items: center;
        gap: 4px;
        padding: 3px 5px;
        cursor: pointer;
        list-style: none;
        font-weight: 700;
        font-size: 0.6rem;
        line-height: 1.1;
      }
      .player-rank {
        width: 24px;
        text-align: left;
        font-weight: 800;
        color: var(--accent);
      }
      .player-name {
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .player-total {
        min-width: 44px;
        padding: 2px 4px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: #115e59;
        font-weight: 800;
        text-align: center;
        font-size: 0.58rem;
      }
      .player-row-body {
        padding: 0 5px 5px;
      }
      .match-card {
        margin-top: 4px;
        border: 1px solid var(--border);
        border-radius: 8px;
        overflow: hidden;
        background: #fcfdfd;
      }
      .match-card summary {
        display: flex;
        justify-content: space-between;
        gap: 4px;
        padding: 4px 5px;
        cursor: pointer;
        list-style: none;
        font-weight: 700;
        font-size: 0.58rem;
        line-height: 1.1;
      }
      .match-meta {
        padding: 0 5px 4px;
        color: var(--muted);
        font-size: 0.56rem;
      }
      .breakdown-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
        padding: 0 5px 5px;
      }
      .breakdown-chip {
        display: inline-flex;
        gap: 3px;
        padding: 2px 4px;
        border-radius: 999px;
        background: #eef7f6;
        color: #164e63;
        font-size: 0.54rem;
      }
      .player-row-card.owner-highlight {
        border-color: #f59e0b;
        box-shadow:
          0 0 0 2px rgba(245, 158, 11, 0.24),
          0 6px 14px rgba(120, 53, 15, 0.08);
        background:
          linear-gradient(90deg, rgba(254, 243, 199, 0.78) 0%, rgba(255, 255, 255, 0.96) 18%),
          #ffffff;
      }
      .owner-filters {
        margin-top: 6px;
        padding: 6px 8px;
        border: 1px solid rgba(15, 118, 110, 0.14);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.82);
      }
      .owner-filters-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 4px;
      }
      .owner-filters-title {
        margin: 0;
        font-size: 0.72rem;
        font-weight: 700;
        color: var(--text);
      }
      .owner-filters-help {
        margin: 0;
        font-size: 0.6rem;
        color: var(--muted);
      }
      .owner-filters-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;
      }
      .owner-filter,
      .clear-owner-filters {
        appearance: none;
        border: 1px solid rgba(15, 118, 110, 0.2);
        background: #ffffff;
        color: #0f766e;
        border-radius: 999px;
        padding: 3px 8px;
        font-size: 0.62rem;
        font-weight: 800;
        cursor: pointer;
      }
      .owner-filter.active {
        background: #0f766e;
        color: #ffffff;
        border-color: #0f766e;
      }
      @media (max-width: 1450px) {
        .players-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }
      @media (max-width: 1100px) {
        .players-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
      @media (max-width: 820px) {
        .players-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 700px) {
        .players-grid {
          grid-template-columns: 1fr;
        }
        .player-row-summary {
          grid-template-columns: 26px 1fr auto;
          align-items: center;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="header">
        <h1>Player Match Points</h1>
        <div class="header-row">
          <p>Match-by-match fantasy points and scoring breakdown for every player processed so far.</p>
          <a class="nav-link" href="./${escapeHtml(ownersFileName)}">Back to Owners</a>
        </div>
      </section>
      <section class="players-grid">
        ${playerGridItems}
      </section>
      <section class="owner-filters">
        <div class="owner-filters-header">
          <p class="owner-filters-title">Highlight Owners</p>
          <p class="owner-filters-help">Select one owner to highlight their players on this page.</p>
        </div>
        <div class="owner-filters-grid">
          ${ownerFilterButtons}
          <button class="clear-owner-filters" type="button" id="clear-owner-filters">Clear All</button>
        </div>
      </section>
    </main>
    <script>
      let activeOwner = "";
      const ownerButtons = Array.from(document.querySelectorAll("[data-owner-filter]"));
      const playerCards = Array.from(document.querySelectorAll(".player-row-card[data-owners]"));
      const clearOwnerFiltersButton = document.getElementById("clear-owner-filters");

      function applyOwnerHighlights() {
        playerCards.forEach((card) => {
          const owners = String(card.dataset.owners || "")
            .split("|")
            .filter(Boolean);
          const isActive = activeOwner ? owners.includes(activeOwner) : false;
          card.classList.toggle("owner-highlight", isActive);
        });

        ownerButtons.forEach((button) => {
          const ownerName = button.dataset.ownerFilter || "";
          button.classList.toggle("active", activeOwner === ownerName);
        });
      }

      ownerButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const ownerName = button.dataset.ownerFilter || "";
          if (!ownerName) {
            return;
          }

          activeOwner = activeOwner === ownerName ? "" : ownerName;

          applyOwnerHighlights();
        });
      });

      if (clearOwnerFiltersButton) {
        clearOwnerFiltersButton.addEventListener("click", () => {
          activeOwner = "";
          applyOwnerHighlights();
        });
      }
    </script>
  </body>
</html>`;
}

function writePlayerDetailsHtml(players, options = {}) {
  const fileName = options.fileName || "player-details.html";
  const htmlPath = path.resolve(__dirname, `../../${fileName}`);
  const html = buildPlayerDetailsHtml(players, options);
  fs.writeFileSync(htmlPath, html, "utf8");
  return htmlPath;
}

function readExistingPlayerPointsJson() {
  const inputPath = path.resolve(__dirname, "../data/generated/player-points.json");

  if (!fs.existsSync(inputPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(inputPath, "utf8"));
  } catch (error) {
    console.warn(`Unable to read existing player points: ${error.message}`);
    return null;
  }
}

function writeIncrementalPlayerPointsJson(result, options = {}) {
  const fileName = options.fileName || "player-points.json";
  const outputPath = path.resolve(__dirname, `../data/generated/${fileName}`);
  const payload = {
    updatedAt: new Date().toISOString(),
    playerCount: result.players.length,
    processedMatchIds: result.processedMatchIds || [],
    players: result.players
  };

  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");
  return outputPath;
}

function openHtmlInBrowser(htmlPath) {
  const chromePaths = [
    path.join(
      process.env.PROGRAMFILES || "",
      "Google",
      "Chrome",
      "Application",
      "chrome.exe"
    ),
    path.join(
      process.env["PROGRAMFILES(X86)"] || "",
      "Google",
      "Chrome",
      "Application",
      "chrome.exe"
    ),
    path.join(
      process.env.LOCALAPPDATA || "",
      "Google",
      "Chrome",
      "Application",
      "chrome.exe"
    )
  ].filter(Boolean);

  const chromePath = chromePaths.find((candidatePath) => fs.existsSync(candidatePath));

  if (chromePath) {
    const chromeProcess = spawn(chromePath, [htmlPath], {
      detached: true,
      stdio: "ignore"
    });
    chromeProcess.unref();
    return "chrome";
  }

  const fallbackProcess = spawn("cmd", ["/c", "start", "", htmlPath], {
    detached: true,
    stdio: "ignore"
  });
  fallbackProcess.unref();
  return "default";
}

async function buildLeaderboardPlayers() {
  const playerPointsSource = String(process.env.PLAYER_POINTS_SOURCE || "derived")
    .trim()
    .toLowerCase();

  if (playerPointsSource === "official") {
    const officialPayload = await fetchOfficialFantasyPlayers();
    return {
      playerPointsSource,
      sourceDetail: officialPayload,
      players: officialPayload.players,
      matches: []
    };
  }

  if (playerPointsSource === "official-cache") {
    const officialPayload = readGeneratedOfficialPoints();
    return {
      playerPointsSource,
      sourceDetail: officialPayload,
      players: officialPayload.players,
      matches: []
    };
  }

  const matches = fetchMatches();
  return {
    playerPointsSource,
    sourceDetail: null,
    players: aggregatePlayerPoints(matches),
    matches
  };
}

async function printLeaderboard() {
  const leaderboardScope = String(process.env.LEADERBOARD_MATCH_SCOPE || "all")
    .trim()
    .toLowerCase();
  const { playerPointsSource, sourceDetail, players, matches } = await buildLeaderboardPlayers();
  const owners = fetchOwners();
  const teamSize = Math.max(1, Number(process.env.OWNER_TEAM_SIZE || 11));
  const ownerSet = String(process.env.OWNER_SET || "default").trim().toLowerCase();
  const outputSuffix = buildOutputSuffix(ownerSet);
  const ownersFileName = `owners${outputSuffix}.html`;
  const playerDetailsFileName = `player-details${outputSuffix}.html`;
  const playerPointsFileName = `player-points${outputSuffix}.json`;
  const ownerLeaderboard = calculateOwnerLeaderboard(owners, players, teamSize);
  const trackedPlayers = buildTrackedPlayers(ownerLeaderboard);
  const htmlPath = writeOwnersHtml(ownerLeaderboard, {
    fileName: ownersFileName,
    playerDetailsFileName
  });
  const playerPointsPath = writeIncrementalPlayerPointsJson({
    processedMatchIds: matches.map((match) => match.id),
    players: trackedPlayers
  }, {
    fileName: playerPointsFileName
  });
  const playerDetailsPath = writePlayerDetailsHtml(trackedPlayers, {
    fileName: playerDetailsFileName,
    ownersFileName,
    ownerLeaderboard
  });
  const openedIn = openHtmlInBrowser(htmlPath);

  console.log(
    `Player Points Source: ${
      playerPointsSource === "official"
        ? "official IPL fantasy"
        : playerPointsSource === "official-cache"
          ? "cached official IPL fantasy"
          : "derived from stored matches"
    }`
  );
  if (playerPointsSource === "official" || playerPointsSource === "official-cache") {
    console.log(`Official Points URL: ${sourceDetail.sourceUrl}`);
    console.log(`Official Player Feed Saved: ${sourceDetail.generatedFile}`);
    if (sourceDetail.feedTime?.ISTTime) {
      console.log(`Official Feed Time (IST): ${sourceDetail.feedTime.ISTTime}`);
    }
    if (playerPointsSource === "official-cache" && sourceDetail.updatedAt) {
      console.log(`Cached File Updated At: ${sourceDetail.updatedAt}`);
    }
  } else {
    console.log(
      `Leaderboard Scope: ${
        leaderboardScope === "completed" ? "completed matches only" : "all stored matches"
      }`
    );
    console.log(
      `${leaderboardScope === "completed" ? "Completed Matches Processed" : "Matches Processed"}: ${matches.length}`
    );
  }
  console.log(`Owner Teams Processed: ${owners.length}`);
  console.log(`Owner Set: ${ownerSet}`);
  console.log(`Selected Team Size Per Owner: ${teamSize}`);
  console.log(`Owners HTML Generated: ${htmlPath}`);
  console.log(`Player Points JSON Generated: ${playerPointsPath}`);
  console.log(`Player Details HTML Generated: ${playerDetailsPath}`);
  console.log(
    `Player Cache Mode: ${
      playerPointsSource === "official"
        ? "official fantasy fetch"
        : playerPointsSource === "official-cache"
          ? "official fantasy cache reuse"
          : "full recompute"
    }`
  );
  console.log(
    `Owners HTML Opened In: ${openedIn === "chrome" ? "Google Chrome" : "default browser"}`
  );

  console.log("\nOwner Leaderboard");
  console.log("----------------------------------------");

  ownerLeaderboard.forEach((owner, index) => {
    console.log(
      `${index + 1}. ${owner.name} - ${owner.totalPoints} pts ` +
        `(Squad: ${owner.squadSize}, Stats found: ${owner.playersWithStats})`
    );
  });

  ownerLeaderboard.forEach((owner) => {
    console.log(
      `\n${owner.name} ` +
        `(Squad: ${owner.squadSize}, Top ${Math.min(teamSize, owner.selectedPlayers.length)})`
    );
    console.log("----------------------------------------");

    owner.selectedPlayers.forEach((player, index) => {
      console.log(`${index + 1}. ${player.name} - ${player.totalPoints} pts`);
    });

    if (owner.missingPlayers.length > 0) {
      console.log(`Missing stats: ${owner.missingPlayers.join(", ")}`);
    }

    console.log(`Total: ${owner.totalPoints} pts`);
  });
}

printLeaderboard().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
