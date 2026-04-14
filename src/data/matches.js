const fs = require("fs");
const path = require("path");

const generatedMatchesPath = path.resolve(__dirname, "generated", "matches.json");

function isCompletedStatus(status) {
  const normalizedStatus = String(status || "").trim().toLowerCase();

  if (!normalizedStatus || normalizedStatus === "live") {
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

function readGeneratedMatches() {
  if (!fs.existsSync(generatedMatchesPath)) {
    return [];
  }

  try {
    const fileContents = fs.readFileSync(generatedMatchesPath, "utf8");
    const parsedData = JSON.parse(fileContents);

    return Array.isArray(parsedData.matches) ? parsedData.matches : [];
  } catch (error) {
    console.warn(`Unable to read generated matches: ${error.message}`);
    return [];
  }
}

function fetchMatches() {
  const matches = readGeneratedMatches();
  const leaderboardScope = String(process.env.LEADERBOARD_MATCH_SCOPE || "all")
    .trim()
    .toLowerCase();

  if (leaderboardScope === "completed") {
    return matches.filter((match) => isCompletedStatus(match.status));
  }

  return matches;
}

module.exports = {
  fetchMatches
};
