const path = require("path");
const { spawnSync } = require("child_process");
const { saveFantasySession } = require("./loginSession");
const { fetchOfficialFantasyPlayers, hasSessionFile } = require("./iplFantasySource");

function runOfficialLeaderboard(playerPointsSource) {
  const result = spawnSync(process.execPath, [path.resolve(__dirname, "../../app/index.js")], {
    cwd: path.resolve(__dirname, "../.."),
    stdio: "inherit",
    env: {
      ...process.env,
      PLAYER_POINTS_SOURCE: playerPointsSource
    }
  });

  if (result.status !== 0) {
    throw new Error("Official leaderboard generation failed.");
  }
}

async function ensureOfficialAccess() {
  console.log("Official fetch: checking saved session...");
  try {
    await fetchOfficialFantasyPlayers();
    return "official";
  } catch (error) {
    const shouldLogin =
      !hasSessionFile() ||
      String(error.message || "").includes("missing or expired") ||
      String(error.message || "").includes("Unable to capture official IPL fantasy");

    if (!shouldLogin) {
      throw error;
    }
  }

  console.log("Official fetch: session missing or expired. Opening login browser...");
  await saveFantasySession();
  await fetchOfficialFantasyPlayers();
  return "official";
}

async function main() {
  const source = await ensureOfficialAccess();
  console.log(`Official fetch: rendering leaderboard with source "${source}"...`);
  runOfficialLeaderboard(source);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
