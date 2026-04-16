const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const LOGIN_TARGET_URL =
  process.env.IPL_FANTASY_LOGIN_URL || "https://fantasy.iplt20.com/classic/stats";
const SESSION_FILE =
  process.env.IPL_FANTASY_SESSION_FILE ||
  path.resolve(__dirname, "../../../.auth/ipl-fantasy-session.json");
const WAIT_TIMEOUT_MS = Number(process.env.IPL_FANTASY_LOGIN_TIMEOUT_MS || 10 * 60 * 1000);

function ensureSessionDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function isLoggedInUrl(currentUrl) {
  if (!currentUrl) {
    return false;
  }

  return currentUrl.includes("fantasy.iplt20.com/classic");
}

async function hasFantasySession(context) {
  const cookies = await context.cookies();
  return cookies.some((cookie) => cookie.domain.includes("fantasy.iplt20.com"));
}

async function waitForLogin(page, context) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < WAIT_TIMEOUT_MS) {
    const currentUrl = page.url();
    const loggedIn = isLoggedInUrl(currentUrl) && (await hasFantasySession(context));

    if (loggedIn) {
      return currentUrl;
    }

    await page.waitForTimeout(1500);
  }

  throw new Error(
    `Login was not detected within ${Math.round(WAIT_TIMEOUT_MS / 1000)} seconds.`
  );
}

async function saveFantasySession() {
  ensureSessionDirectory(SESSION_FILE);

  console.log(`Opening IPL Fantasy login in a headed browser...`);
  console.log(`Target URL: ${LOGIN_TARGET_URL}`);
  console.log(`Session file: ${SESSION_FILE}`);
  console.log(`Finish login in the browser window. The session will save automatically.`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(LOGIN_TARGET_URL, { waitUntil: "domcontentloaded", timeout: 120000 });
    const finalUrl = await waitForLogin(page, context);
    await context.storageState({ path: SESSION_FILE });

    console.log(`Login detected at: ${finalUrl}`);
    console.log(`Saved session to ${SESSION_FILE}`);
  } finally {
    await browser.close();
  }
}

async function main() {
  await saveFantasySession();
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Failed to store IPL Fantasy login session.");
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  saveFantasySession
};
