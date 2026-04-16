const fs = require("fs");
const path = require("path");
const {
  scrapeCrexScorecard,
  scrapeLatestCrexMatch
} = require("../sources/crex/playwrightCrexSource");
const { scorecardCorrections } = require("../data/scorecardCorrections");

function normalizeScope(rawScope) {
  const scope = String(rawScope || "all").trim().toLowerCase();
  if (scope === "completed" || scope === "all" || scope === "latest") {
    return scope;
  }
  return "all";
}

function isCompletedStatus(status) {
  const normalizedStatus = String(status || "").trim().toLowerCase();
  if (!normalizedStatus) {
    return false;
  }

  if (normalizedStatus === "live") {
    return false;
  }

  const liveSignals = [
    "live",
    "stumps",
    "innings break",
    "scheduled",
    "starts",
    "yet to start",
    "toss"
  ];
  if (liveSignals.some((signal) => normalizedStatus.includes(signal))) {
    return false;
  }

  const completedSignals = ["won by", "abandoned", "no result", "match tied", "tied"];
  return completedSignals.some((signal) => normalizedStatus.includes(signal));
}

function applyScorecardCorrections(matches) {
  if (!Array.isArray(matches) || matches.length === 0) {
    return matches;
  }

  const correctionsByMatchId = scorecardCorrections.reduce((map, correction) => {
    if (!map.has(correction.matchId)) {
      map.set(correction.matchId, []);
    }
    map.get(correction.matchId).push(correction);
    return map;
  }, new Map());

  matches.forEach((match) => {
    const matchCorrections = correctionsByMatchId.get(match.id);
    if (!matchCorrections || !Array.isArray(match.players)) {
      return;
    }

    matchCorrections.forEach((correction) => {
      const player = match.players.find((entry) => entry.id === correction.playerId);
      if (!player) {
        return;
      }

      Object.assign(player, correction.updates || {});
    });
  });

  return matches;
}

async function updateMatches() {
  const outputDirectory = path.resolve(__dirname, "../data/generated");
  const outputPath = path.join(outputDirectory, "matches.json");
  const scope = normalizeScope(process.env.MATCH_SCOPE);
  const existingPayload = fs.existsSync(outputPath)
    ? JSON.parse(fs.readFileSync(outputPath, "utf8"))
    : null;
  const existingMatches = Array.isArray(existingPayload?.matches) ? existingPayload.matches : [];

  const url = process.env.LIVE_MATCH_URL_CREX || process.env.LIVE_MATCH_URL;
  const crexResult =
    scope === "latest"
      ? await scrapeLatestCrexMatch(url, existingMatches)
      : await scrapeCrexScorecard(url);
  const { source, matches } = crexResult;
  applyScorecardCorrections(matches);
  const mergedMatches =
    scope === "latest"
      ? [...existingMatches].reduce((acc, existingMatch) => {
          acc.set(existingMatch.id, existingMatch);
          return acc;
        }, new Map())
      : matches;

  if (scope === "latest") {
    matches.forEach((match) => {
      mergedMatches.set(match.id, match);
    });
  }
  const scopedMatches =
    scope === "completed"
      ? (scope === "latest" ? Array.from(mergedMatches.values()) : mergedMatches).filter((match) =>
          isCompletedStatus(match.status)
        )
      : scope === "latest"
        ? Array.from(mergedMatches.values())
        : mergedMatches;

  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        source,
        scope,
        updatedAt: new Date().toISOString(),
        matchCount: scopedMatches.length,
        matches: scopedMatches
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`Updated generated matches from ${source}`);
  console.log(`Match scope: ${scope}`);
  console.log(`Stored Matches Written: ${scopedMatches.length}`);
  console.log(`Output file: ${outputPath}`);
}

updateMatches().catch((error) => {
  console.error(`Match update failed: ${error.message}`);
  process.exitCode = 1;
});
