async function fetchLatestMatches(options = {}) {
  const mode = process.env.LIVE_MATCH_SOURCE || "playwright-crex";
  const scope = String(options.scope || "all").toLowerCase();

  if (mode !== "playwright-crex") {
    throw new Error(`Unsupported LIVE_MATCH_SOURCE "${mode}". Use "playwright-crex".`);
  }

  const url = process.env.LIVE_MATCH_URL_CREX || process.env.LIVE_MATCH_URL;
  const { scrapeCrexScorecard, scrapeLatestCrexMatch } = require("./playwrightCrexSource");

  if (scope === "latest") {
    return scrapeLatestCrexMatch(url, options.existingMatches || []);
  }

  return scrapeCrexScorecard(url);
}

module.exports = {
  fetchLatestMatches
};
