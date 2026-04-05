function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return fallback;
}

function normalizeNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizePlayer(player, index) {
  return {
    id: player.id || `generated-player-${index + 1}`,
    name: player.name || "Unknown Player",
    team: player.team || "Unknown Team",
    role: player.role || "batter",
    inPlayingXI: normalizeBoolean(player.inPlayingXI, true),
    runs: normalizeNumber(player.runs),
    ballsFaced: normalizeNumber(player.ballsFaced),
    fours: normalizeNumber(player.fours),
    sixes: normalizeNumber(player.sixes),
    isOutForDuck: normalizeBoolean(player.isOutForDuck, false),
    wickets: normalizeNumber(player.wickets),
    maidenOvers: normalizeNumber(player.maidenOvers),
    lbwBowledWickets: normalizeNumber(player.lbwBowledWickets),
    catches: normalizeNumber(player.catches),
    stumpings: normalizeNumber(player.stumpings),
    directRunOuts: normalizeNumber(player.directRunOuts),
    indirectRunOuts: normalizeNumber(player.indirectRunOuts),
    oversBowled: normalizeNumber(player.oversBowled),
    runsConceded: normalizeNumber(player.runsConceded)
  };
}

function normalizeMatch(match, index) {
  const players = Array.isArray(match.players) ? match.players : [];

  return {
    id: match.id || `generated-match-${index + 1}`,
    match: match.match || `Match ${index + 1}`,
    status: match.status || "Completed",
    format: match.format || "T20",
    players: players.map(normalizePlayer)
  };
}

function parseMatchesPayload(payload) {
  if (Array.isArray(payload)) {
    return payload.map(normalizeMatch);
  }

  if (Array.isArray(payload.matches)) {
    return payload.matches.map(normalizeMatch);
  }

  throw new Error("Payload must be an array of matches or an object with a matches array.");
}

async function loadFromHttpJson(url) {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available in this Node runtime.");
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }

  return parseMatchesPayload(await response.json());
}

async function fetchLatestMatches() {
  const mode = process.env.LIVE_MATCH_SOURCE || "playwright-crex";

  if (mode === "http-json") {
    const url = process.env.LIVE_MATCH_URL;

    if (!url) {
      throw new Error("Set LIVE_MATCH_URL when LIVE_MATCH_SOURCE=http-json.");
    }

    const matches = await loadFromHttpJson(url);
    return {
      source: `http-json:${url}`,
      matches
    };
  }

  if (mode === "playwright-crex") {
    const url = process.env.LIVE_MATCH_URL;
    const { scrapeCricbuzzScorecard } = require("./playwrightCricbuzzSource");
    return scrapeCricbuzzScorecard(url);
  }

  throw new Error(
    `Unsupported LIVE_MATCH_SOURCE "${mode}". Use "http-json" or "playwright-crex".`
  );
}

module.exports = {
  fetchLatestMatches
};
