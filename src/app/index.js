const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { fetchMatches } = require("../data/matches");
const { fetchOwners } = require("../data/owners");
const { aggregatePlayerPoints } = require("../services/playerAggregation");
const { calculateOwnerLeaderboard } = require("../services/ownerLeaderboard");

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

function buildOwnersHtml(ownerLeaderboard) {
  const alphabeticalTeams = [...ownerLeaderboard].sort((firstOwner, secondOwner) =>
    firstOwner.name.localeCompare(secondOwner.name)
  );
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
  const nameColumnWidth = Math.min(82, Math.max(68, longestPlayerNameLength * 3.2));
  const sideColumnWidth = (100 - nameColumnWidth) / 2;

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

  const teamTables = alphabeticalTeams
    .map((owner) => {
      const selectedPlayerIds = new Set(owner.selectedPlayers.map((player) => player.id));
      const playerRows = Array.from({ length: maxSquadSize }, (_, index) => {
        const player = owner.squadPlayers[index];

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
            ? '<span class="overseas-badge" title="Overseas player">✈</span>'
            : "";

          return `
            <tr class="${isSelected ? "selected-player" : ""}">
              <td>${index + 1}</td>
              <td>${escapeHtml(player.name)} ${overseasBadge}</td>
              <td>${player.totalPoints}</td>
            </tr>
          `;
        }).join("");

      return `
        <table class="team-table">
          <colgroup>
            <col style="width: ${sideColumnWidth}%;" />
            <col style="width: ${nameColumnWidth}%;" />
            <col style="width: ${sideColumnWidth}%;" />
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
        content: "🥇";
      }

      .rank-2::before {
        content: "🥈";
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
      }

      .team-table tbody td {
        height: 20px;
        line-height: 1;
      }

      .selected-player td {
        background: var(--accent-soft);
        font-weight: 700;
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
        background: #ecfccb;
        font-weight: 700;
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
        ✈ = overseas player
      </section>
    </main>
  </body>
</html>`;
}

function writeOwnersHtml(ownerLeaderboard) {
  const htmlPath = path.resolve(__dirname, "../../owners.html");
  const html = buildOwnersHtml(ownerLeaderboard);
  fs.writeFileSync(htmlPath, html, "utf8");
  return htmlPath;
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

function printLeaderboard() {
  const matches = fetchMatches();
  const seasonLeaderboard = aggregatePlayerPoints(matches);
  const owners = fetchOwners();
  const teamSize = 11;
  const ownerLeaderboard = calculateOwnerLeaderboard(owners, seasonLeaderboard, teamSize);
  const htmlPath = writeOwnersHtml(ownerLeaderboard);
  const openedIn = openHtmlInBrowser(htmlPath);

  console.log(`Matches Processed: ${matches.length}`);
  console.log(`Owner Teams Processed: ${owners.length}`);
  console.log(`Selected Team Size Per Owner: ${teamSize}`);
  console.log(`Owners HTML Generated: ${htmlPath}`);
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

printLeaderboard();
