const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { fetchOwners } = require("../data/owners");
const { calculateOwnerLeaderboard } = require("../services/ownerLeaderboard");

const rootDir = path.resolve(__dirname, "../..");
const envPath = path.join(rootDir, ".env");
const scoreFiles = {
  default: {
    playersJson: path.join(rootDir, "src/data/generated/player-points.json"),
    html: path.join(rootDir, "owners.html")
  },
  alt12: {
    playersJson: path.join(rootDir, "src/data/generated/player-points-alt12.json"),
    html: path.join(rootDir, "owners-alt12.html")
  }
};
const commandMap = {
  "/score": {
    script: "score:official",
    ownerSet: "default",
    teamSize: 11,
    label: "default official"
  },
  "/last": {
    script: "score:official:last",
    ownerSet: "default",
    teamSize: 11,
    label: "default cached"
  },
  "/alt12": {
    script: "score:official:alt12",
    ownerSet: "alt12",
    teamSize: 12,
    label: "alt12 official"
  },
  "/last_alt12": {
    script: "score:official:last:alt12",
    ownerSet: "alt12",
    teamSize: 12,
    label: "alt12 cached"
  }
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  });
}

function escapeTelegram(text) {
  return String(text || "").replace(/[&_<>]/g, (char) => {
    if (char === "&") {
      return "&amp;";
    }

    if (char === "<") {
      return "&lt;";
    }

    return "&gt;";
  });
}

function getBotConfig() {
  loadEnvFile(envPath);

  const token = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = String(process.env.TELEGRAM_CHAT_ID || "").trim();

  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN. Add it to .env in the project root.");
  }

  return {
    token,
    chatId
  };
}

function buildApiUrl(token, method) {
  return `https://api.telegram.org/bot${token}/${method}`;
}

async function telegramRequest(token, method, payload) {
  const response = await fetch(buildApiUrl(token, method), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.description || `Telegram API request failed for ${method}.`);
  }

  return data.result;
}

async function sendMessage(token, chatId, text) {
  return telegramRequest(token, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true
  });
}

async function sendDocument(token, chatId, filePath, caption) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const form = new FormData();
  const fileBuffer = fs.readFileSync(filePath);

  form.append("chat_id", chatId);
  form.append("caption", caption);
  form.append("document", new Blob([fileBuffer]), path.basename(filePath));

  const response = await fetch(buildApiUrl(token, "sendDocument"), {
    method: "POST",
    body: form
  });
  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.description || `Telegram document upload failed for ${path.basename(filePath)}.`);
  }

  return data.result;
}

function readPlayers(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing generated points file: ${filePath}`);
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return parsed.players || [];
}

function buildLeaderboardSummary(ownerSet, teamSize) {
  const previousOwnerSet = process.env.OWNER_SET;
  process.env.OWNER_SET = ownerSet;

  try {
    const owners = fetchOwners();
    const players = readPlayers(scoreFiles[ownerSet].playersJson);
    const leaderboard = calculateOwnerLeaderboard(owners, players, teamSize);
    const pointsUpdatedAt = JSON.parse(
      fs.readFileSync(scoreFiles[ownerSet].playersJson, "utf8")
    ).updatedAt;

    const header = [
      `<b>Fantasy IPL ${ownerSet === "alt12" ? "Alt12" : "Default"} Update</b>`,
      `Top ${teamSize} scoring players per owner`,
      pointsUpdatedAt ? `Updated: ${escapeTelegram(new Date(pointsUpdatedAt).toLocaleString("en-IN", { timeZone: "Asia/Calcutta" }))}` : ""
    ]
      .filter(Boolean)
      .join("\n");

    const rows = leaderboard
      .map((owner, index) => `${index + 1}. ${escapeTelegram(owner.name)} - <b>${owner.totalPoints}</b> pts`)
      .join("\n");

    return `${header}\n\n${rows}`;
  } finally {
    if (typeof previousOwnerSet === "undefined") {
      delete process.env.OWNER_SET;
    } else {
      process.env.OWNER_SET = previousOwnerSet;
    }
  }
}

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const command = process.platform === "win32" ? "cmd.exe" : "npm";
    const args =
      process.platform === "win32"
        ? ["/d", "/s", "/c", "npm", "run", scriptName]
        : ["run", scriptName];
    const child = spawn(command, args, {
      cwd: rootDir,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({
          stdout,
          stderr
        });
        return;
      }

      const combinedOutput = [stdout, stderr].filter(Boolean).join("\n").trim();
      reject(new Error(combinedOutput || `npm run ${scriptName} failed with exit code ${code}.`));
    });
  });
}

function normalizeIncomingCommand(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)[0]
    .toLowerCase();
}

function helpMessage() {
  return [
    "<b>Fantasy IPL Telegram Commands</b>",
    "/score - fetch latest official default leaderboard",
    "/last - use last successful cached default leaderboard",
    "/alt12 - fetch latest official alt12 leaderboard",
    "/last_alt12 - use last successful cached alt12 leaderboard",
    "/chatid - show this chat id"
  ].join("\n");
}

let isBusy = false;

async function handleCommand(token, allowedChatId, update) {
  const message = update.message;

  if (!message || !message.chat || !message.text) {
    return;
  }

  const incomingChatId = String(message.chat.id);
  const command = normalizeIncomingCommand(message.text);

  if (command === "/chatid") {
    await sendMessage(token, incomingChatId, `This chat id is <b>${escapeTelegram(incomingChatId)}</b>.`);
    return;
  }

  if (allowedChatId && incomingChatId !== allowedChatId) {
    await sendMessage(token, incomingChatId, "This bot is restricted to one authorized chat.");
    return;
  }

  if (command === "/start" || command === "/help") {
    await sendMessage(token, incomingChatId, helpMessage());
    return;
  }

  const selectedCommand = commandMap[command];

  if (!selectedCommand) {
    await sendMessage(token, incomingChatId, helpMessage());
    return;
  }

  if (!allowedChatId) {
    await sendMessage(
      token,
      incomingChatId,
      "Setup mode is active. First add this chat id to .env as TELEGRAM_CHAT_ID, then restart the bot."
    );
    return;
  }

  if (isBusy) {
    await sendMessage(token, incomingChatId, "A scoring run is already in progress. Wait for it to finish, then try again.");
    return;
  }

  isBusy = true;

  try {
    await sendMessage(
      token,
      incomingChatId,
      `Running <b>${escapeTelegram(selectedCommand.label)}</b> update...`
    );
    await runScript(selectedCommand.script);

    const summary = buildLeaderboardSummary(selectedCommand.ownerSet, selectedCommand.teamSize);
    await sendMessage(token, incomingChatId, summary);

    const htmlPath = scoreFiles[selectedCommand.ownerSet].html;
    if (fs.existsSync(htmlPath)) {
      await sendDocument(token, incomingChatId, htmlPath, `${selectedCommand.ownerSet} leaderboard`);
    }
  } catch (error) {
    const messageText = String(error.message || error);
    const trimmed = messageText.length > 3500 ? `${messageText.slice(0, 3500)}...` : messageText;
    await sendMessage(
      token,
      incomingChatId,
      `<b>Run failed</b>\n<pre>${escapeTelegram(trimmed)}</pre>`
    );
  } finally {
    isBusy = false;
  }
}

async function pollLoop(token, allowedChatId) {
  let offset = 0;

  while (true) {
    try {
      const response = await fetch(
        `${buildApiUrl(token, "getUpdates")}?timeout=25&offset=${offset}`
      );
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.description || "Telegram getUpdates failed.");
      }

      for (const update of data.result || []) {
        offset = update.update_id + 1;
        await handleCommand(token, allowedChatId, update);
      }
    } catch (error) {
      console.error(`Telegram polling error: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 4000));
    }
  }
}

async function main() {
  const { token, chatId } = getBotConfig();

  console.log("Telegram bot starting...");
  console.log(`Allowed chat id: ${chatId || "not set (setup mode)"}`);
  console.log("Available commands: /score, /last, /alt12, /last_alt12, /chatid");

  await pollLoop(token, chatId);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
