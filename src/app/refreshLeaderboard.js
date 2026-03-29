const { spawnSync } = require("child_process");
const path = require("path");

function runNodeScript(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: path.resolve(__dirname, "../.."),
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exitCode = result.status || 1;
    throw new Error(`Script failed: ${scriptPath}`);
  }
}

try {
  runNodeScript(path.resolve(__dirname, "./updateMatches.js"));
  runNodeScript(path.resolve(__dirname, "./index.js"));
} catch (error) {
  console.error(error.message);
}
