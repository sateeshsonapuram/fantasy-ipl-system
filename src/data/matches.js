const fs = require("fs");
const path = require("path");

const generatedMatchesPath = path.resolve(__dirname, "generated", "matches.json");

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
  return readGeneratedMatches();
}

module.exports = {
  fetchMatches
};
