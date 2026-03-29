const fs = require("fs");
const path = require("path");
const { fetchLatestMatches } = require("../services/liveMatchSource");

async function updateMatches() {
  const outputDirectory = path.resolve(__dirname, "../data/generated");
  const outputPath = path.join(outputDirectory, "matches.json");

  const { source, matches } = await fetchLatestMatches();

  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        source,
        updatedAt: new Date().toISOString(),
        matchCount: matches.length,
        matches
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`Updated generated matches from ${source}`);
  console.log(`Matches written: ${matches.length}`);
  console.log(`Output file: ${outputPath}`);
}

updateMatches().catch((error) => {
  console.error(`Match update failed: ${error.message}`);
  process.exitCode = 1;
});
