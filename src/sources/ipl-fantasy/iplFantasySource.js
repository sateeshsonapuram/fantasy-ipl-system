const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const STATS_URL =
  process.env.IPL_FANTASY_STATS_URL || "https://fantasy.iplt20.com/classic/stats";
const SESSION_FILE =
  process.env.IPL_FANTASY_SESSION_FILE ||
  path.resolve(__dirname, "../../../.auth/ipl-fantasy-session.json");
const GENERATED_FILE = path.resolve(
  __dirname,
  "../../data/generated/ipl-fantasy-points.json"
);

function hasSessionFile() {
  return fs.existsSync(SESSION_FILE);
}

function toBreakdown() {
  return {
    startingXI: 0,
    runs: 0,
    fours: 0,
    sixes: 0,
    battingBonus: 0,
    duckPenalty: 0,
    wickets: 0,
    lbwBowledBonus: 0,
    maidenOvers: 0,
    wicketBonus: 0,
    catches: 0,
    catchBonus: 0,
    stumpings: 0,
    directRunOuts: 0,
    indirectRunOuts: 0,
    strikeRate: 0,
    economyRate: 0
  };
}

function mapOfficialPlayer(player) {
  return {
    id: `ipl-${player.Id}`,
    officialPlayerId: player.Id,
    name: player.Name,
    team: player.TeamShortName,
    role: player.SkillName,
    totalPoints: Number(player.OverallPoints || 0),
    gamedayPoints: Number(player.GamedayPoints || 0),
    credit: Number(player.Value || 0),
    matchesPlayed: 0,
    isMissingStat: false,
    matchBreakdowns: [
      {
        matchId: "ipl-fantasy-total",
        match: "Official IPL Fantasy Total",
        status: "Official IPL Fantasy",
        format: "T20",
        sourceUrl: STATS_URL,
        points: Number(player.OverallPoints || 0),
        breakdown: toBreakdown()
      }
    ]
  };
}

function writeGeneratedOfficialPoints(payload) {
  fs.mkdirSync(path.dirname(GENERATED_FILE), { recursive: true });
  fs.writeFileSync(GENERATED_FILE, JSON.stringify(payload, null, 2), "utf8");
  return GENERATED_FILE;
}

function readGeneratedOfficialPoints() {
  if (!fs.existsSync(GENERATED_FILE)) {
    throw new Error(
      `No cached official IPL fantasy points found at ${GENERATED_FILE}. Run "npm run score:official" once first.`
    );
  }

  const payload = JSON.parse(fs.readFileSync(GENERATED_FILE, "utf8"));
  const players = Array.isArray(payload.players) ? payload.players : [];

  if (players.length === 0) {
    throw new Error("Cached official IPL fantasy points file is empty.");
  }

  return {
    source: "ipl-fantasy-cache",
    sourceUrl: payload.sourceUrl || STATS_URL,
    generatedFile: GENERATED_FILE,
    players,
    feedTime: payload.feedTime || null,
    updatedAt: payload.updatedAt || null
  };
}

async function fetchOfficialFantasyPlayers() {
  console.log("Official fetch: opening IPL fantasy stats page...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(
    hasSessionFile() ? { storageState: SESSION_FILE } : undefined
  );
  const page = await context.newPage();
  let statsResponse = null;

  page.on("response", (response) => {
    if (
      response.url().includes("/api/feed/live/gamedayplayers") ||
      response.url().includes("/api/feed/gamedayplayers")
    ) {
      statsResponse = response;
    }
  });

  try {
    await page.goto(STATS_URL, { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForTimeout(4000);

    if (!page.url().includes("/classic/stats")) {
      throw new Error("IPL fantasy session is missing or expired.");
    }

    if (!statsResponse) {
      throw new Error("Unable to capture official IPL fantasy player stats response.");
    }

    const payload = await statsResponse.json();
    const rawPlayers = payload?.Data?.Value?.Players;

    if (!Array.isArray(rawPlayers) || rawPlayers.length === 0) {
      throw new Error("Official IPL fantasy player stats response was empty.");
    }

    const players = rawPlayers
      .map(mapOfficialPlayer)
      .sort((firstPlayer, secondPlayer) => secondPlayer.totalPoints - firstPlayer.totalPoints);

    console.log(`Official fetch: received ${players.length} players.`);

    const generatedFile = writeGeneratedOfficialPoints({
      updatedAt: new Date().toISOString(),
      source: "ipl-fantasy",
      sourceUrl: STATS_URL,
      playerCount: players.length,
      feedTime: payload?.Data?.FeedTime || null,
      players
    });

    return {
      source: "ipl-fantasy",
      sourceUrl: STATS_URL,
      generatedFile,
      players,
      feedTime: payload?.Data?.FeedTime || null
    };
  } finally {
    await browser.close();
  }
}

module.exports = {
  fetchOfficialFantasyPlayers,
  hasSessionFile,
  readGeneratedOfficialPoints
};
