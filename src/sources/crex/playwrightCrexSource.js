const { chromium } = require("playwright");
const { buildMatchFromCrexInnings, parseVisibleCrexScorecard } = require("./crexTextParser");
const { resolveTeamPlayerName } = require("../../services/playerRegistry");

function normalizeLines(rawText) {
  return String(rawText || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseMatchHeaderFromText(rawText, fallbackUrl) {
  const lines = normalizeLines(rawText);
  const descriptorLine = lines.find((line) => /Vs/i.test(line) && /Scorecard$/i.test(line)) || "CREX Live Match";
  const teamMatch = descriptorLine.match(/\b([A-Z]{2,4})\s+Vs\s+([A-Z]{2,4})\b/i);
  const teamCodes = teamMatch ? [teamMatch[1].toUpperCase(), teamMatch[2].toUpperCase()] : [];
  const statusLine =
    lines.find((line) => /\blive\b|\bwon by\b|\babandoned\b|\bno result\b|\bball\b/i.test(line)) ||
    "Live";

  return {
    id: slugify(descriptorLine) || slugify(fallbackUrl) || "crex-live-match",
    match: descriptorLine,
    status: /live/i.test(statusLine) ? "Live" : statusLine,
    format: "T20",
    teamCodes
  };
}

function createLiveXIPlayer(name, team) {
  const canonicalName = resolveTeamPlayerName(team, name) || String(name || "").trim();
  return {
    id: `${slugify(team)}-${slugify(canonicalName)}`,
    name: canonicalName,
    team,
    role: "batter",
    inPlayingXI: true,
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    isOutForDuck: false,
    wickets: 0,
    maidenOvers: 0,
    lbwBowledWickets: 0,
    catches: 0,
    stumpings: 0,
    directRunOuts: 0,
    indirectRunOuts: 0,
    oversBowled: 0,
    runsConceded: 0
  };
}

function buildMinimalLiveMatch(rawText, url, teamCodes, playingXIByTeam) {
  const header = parseMatchHeaderFromText(rawText, url);
  const resolvedTeamCodes = teamCodes && teamCodes.length === 2 ? teamCodes : header.teamCodes;
  const playersByKey = new Map();

  resolvedTeamCodes.forEach((teamCode) => {
    const xi = playingXIByTeam[teamCode] || [];
    xi.forEach((name) => {
      const player = createLiveXIPlayer(name, teamCode);
      const key = `${player.team}|${player.name.toLowerCase()}`;
      if (!playersByKey.has(key)) {
        playersByKey.set(key, player);
      }
    });
  });

  return {
    id: header.id,
    match: header.match,
    status: "Live",
    format: header.format,
    sourceUrl: url,
    players: Array.from(playersByKey.values())
  };
}

function extractPlayingXIFromMatchInfo(rawText, teamCode, teamCodes = []) {
  const lines = normalizeLines(rawText);
  const start = lines.findIndex((line) => /^Playing XI$/i.test(line));
  if (start === -1) {
    return [];
  }

  const stop = lines.findIndex((line, index) => index > start && /^On Bench$/i.test(line));
  const section = lines.slice(start + 1, stop === -1 ? lines.length : stop);
  const ignore = new Set([
    "BATTER",
    "BOWLER",
    "ALL ROUNDER",
    "WICKET KEEPER",
    "(WK)",
    "(C)",
    "✈️"
  ]);

  return section
    .filter((line) => {
      const upper = line.toUpperCase();
      if (ignore.has(upper)) {
        return false;
      }
      if (teamCodes.includes(upper)) {
        return false;
      }
      if (/^On Bench$/i.test(line)) {
        return false;
      }
      if (/[0-9]/.test(line)) {
        return false;
      }

      const tokens = line.split(" ").filter(Boolean);
      if (tokens.length === 0 || tokens.length > 4) {
        return false;
      }

      return /^[A-Za-z .'-]+$/.test(line);
    })
    // Keep duplicate short aliases like "R Singh" because they can represent
    // different players in the same XI and are resolved later using the roster.
    .map((line) => line.trim());
}

async function extractPlayingXIByTeam(page, teamCodes) {
  const playingXIByTeam = {};
  const matchInfoTab = page.getByText("Match info", {
    exact: true
  }).first();

  if (!(await matchInfoTab.isVisible().catch(() => false))) {
    return playingXIByTeam;
  }

  await matchInfoTab.click().catch(() => {});
  await page.waitForTimeout(1200);

  const normalizedTeamCodes = (teamCodes || []).map((team) => String(team || "").toUpperCase());
  for (const teamCode of normalizedTeamCodes) {
    const toggle = page.getByText(teamCode, {
      exact: true
    }).last();

    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    const matchInfoText = await page.locator("body").innerText();
    const extracted = extractPlayingXIFromMatchInfo(matchInfoText, teamCode, normalizedTeamCodes);
    if (extracted.length > 0) {
      playingXIByTeam[teamCode] = extracted;
    }
  }

  const scorecardTab = page.getByText("Scorecard", {
    exact: true
  }).first();
  if (await scorecardTab.isVisible().catch(() => false)) {
    await scorecardTab.click().catch(() => {});
    await page.waitForTimeout(800);
  }

  return playingXIByTeam;
}

function toAbsoluteUrl(url) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `https://crex.com${url.startsWith("/") ? url : `/${url}`}`;
}

function toScorecardUrl(url) {
  const absoluteUrl = toAbsoluteUrl(url);

  if (absoluteUrl.includes("/match-scorecard")) {
    return absoluteUrl;
  }

  return absoluteUrl.replace(/-match-updates-([a-z0-9]+)$/i, "-$1/match-scorecard");
}

function buildInningsSignature(inningsData) {
  const battingSignature = (inningsData.battingRows || [])
    .map((row) => `${row.name}|${row.runs}|${row.ballsFaced}|${row.dismissal}`)
    .join("~");
  const bowlingSignature = (inningsData.bowlingRows || [])
    .map((row) => `${row.name}|${row.oversBowled}|${row.runsConceded}|${row.wickets}`)
    .join("~");

  return `${battingSignature}::${bowlingSignature}`;
}

function hasStrongRosterAlignment(inningsData, battingTeam) {
  const battingRows = inningsData.battingRows || [];

  if (battingRows.length === 0) {
    return true;
  }

  const resolvedCount = battingRows.filter((row) =>
    Boolean(resolveTeamPlayerName(battingTeam, row.name))
  ).length;

  return resolvedCount >= Math.max(2, Math.ceil(battingRows.length / 2));
}

async function scrapeSingleCrexScorecard(page, url) {
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });

  await page.waitForLoadState("networkidle", {
    timeout: 15000
  }).catch(() => {});

  const scorecardTab = page.getByText("Scorecard", {
    exact: true
  }).first();
  if (await scorecardTab.isVisible().catch(() => false)) {
    await scorecardTab.click().catch(() => {});
    await page.waitForTimeout(1000);
  }

  const firstText = await page.locator("body").innerText();
  const headerMeta = parseMatchHeaderFromText(firstText, url);
  const inferredTeams = headerMeta.teamCodes;

  try {
    const pageMetadata = parseVisibleCrexScorecard(firstText, url);
    const innings = [];
    const inningsSignatures = new Set();
    const playingXIByTeam = await extractPlayingXIByTeam(page, pageMetadata.teamCodes || inferredTeams);
    const isAbandonedOrNoResult = /(abandoned|no result|no play|without a ball bowled)/i.test(
      String(pageMetadata.status || "")
    );

    for (const battingTeam of pageMetadata.teamCodes) {
      const bowlingTeam = pageMetadata.teamCodes.find((team) => team !== battingTeam);
      const toggle = page.getByText(battingTeam, {
        exact: true
      }).last();

      if (await toggle.isVisible().catch(() => false)) {
        await toggle.click().catch(() => {});
        await page.waitForTimeout(1500);
      }

      const inningsText = await page.locator("body").innerText();
      const inningsData = parseVisibleCrexScorecard(inningsText, url, {
        battingTeam,
        bowlingTeam
      });

      if (!hasStrongRosterAlignment(inningsData, battingTeam)) {
        continue;
      }

      const inningsSignature = buildInningsSignature(inningsData);
      if (inningsSignatures.has(inningsSignature)) {
        continue;
      }

      if (!innings.some((entry) => entry.battingTeam === inningsData.battingTeam)) {
        inningsSignatures.add(inningsSignature);
        innings.push(inningsData);
      }
    }

    return buildMatchFromCrexInnings(innings, url, {
      playingXIByTeam
    });
  } catch (error) {
    const playingXIByTeam = await extractPlayingXIByTeam(page, inferredTeams);
    const minimalLiveMatch = buildMinimalLiveMatch(firstText, url, inferredTeams, playingXIByTeam);
    if (minimalLiveMatch.players.length > 0) {
      return minimalLiveMatch;
    }
    throw error;
  }
}

async function extractCompletedCrexMatchUrls(page, url) {
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });

  await page.waitForLoadState("networkidle", {
    timeout: 15000
  }).catch(() => {});

  const discoveredUrls = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a[href*='/cricket-live-score/']"))
      .map((anchor) => {
        const href = anchor.getAttribute("href");
        const cardText = (anchor.textContent || "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();

        return {
          href,
          cardText
        };
      })
      .filter(({ href, cardText }) => {
        if (!href) {
          return false;
        }

        const isCompleted =
          /(won by|tied|no result|abandoned|match abandoned|no play|without a ball bowled)/i.test(
            cardText
          ) && !/ on /i.test(cardText);

        // Consider in-progress scorecards as live if card text contains score patterns.
        // Example: "161-4", "120/3", "12.4 ov", "20.0"
        const hasLiveScoreSignal =
          /\b\d{1,3}\s*[-/]\s*\d{1,2}\b/.test(cardText) ||
          /\b\d{1,2}\.\d\s*(ov|overs)?\b/.test(cardText);
        const hasLiveStateSignal = /\blive\b|\byet to bat\b|\binning break\b|\binnings break\b/i.test(
          cardText
        );

        const isClearlyUpcoming =
          /(starts at|yet to begin|upcoming|scheduled|tomorrow|today at|\bvs\b.*\bon\b)/i.test(
            cardText
          );

        return isCompleted || ((hasLiveScoreSignal || hasLiveStateSignal) && !isClearlyUpcoming);
      })
      .map(({ href }) => href)
  );

  return Array.from(new Set(discoveredUrls)).map(toScorecardUrl);
}

async function scrapeLatestCrexMatch(url, existingMatches = []) {
  if (!url) {
    throw new Error(
      "Set LIVE_MATCH_URL to either a CREX match-scorecard URL or the IPL matches page."
    );
  }

  const browser = await chromium.launch({
    headless: true
  });

  try {
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
      locale: "en-US",
      viewport: {
        width: 1440,
        height: 1600
      }
    });

    const sourceUrl = toAbsoluteUrl(url);
    let matchUrls = [];

    if (/\/series\/.+\/matches$/i.test(sourceUrl)) {
      matchUrls = await extractCompletedCrexMatchUrls(page, sourceUrl);
    } else {
      matchUrls = [toScorecardUrl(sourceUrl)];
    }

    if (matchUrls.length === 0) {
      throw new Error("No completed CREX match scorecards were found from the supplied URL.");
    }

    const existingUrlSet = new Set(
      (existingMatches || [])
        .map((match) => match.sourceUrl)
        .filter(Boolean)
        .map((matchUrl) => toScorecardUrl(matchUrl))
    );

    const unseenUrls = matchUrls.filter((matchUrl) => !existingUrlSet.has(matchUrl));
    const urlsToScrape = unseenUrls.length > 0 ? unseenUrls : [matchUrls[matchUrls.length - 1]];
    const matches = [];

    for (const matchUrl of urlsToScrape) {
      try {
        matches.push(await scrapeSingleCrexScorecard(page, matchUrl));
      } catch (error) {
        console.warn(`Skipping match URL due to parse error: ${matchUrl} (${error.message})`);
      }
    }

    if (matches.length === 0) {
      throw new Error("No CREX scorecards could be parsed from discovered latest match URLs.");
    }

    return {
      source: `playwright-crex:${sourceUrl}`,
      matches
    };
  } finally {
    await browser.close();
  }
}

async function scrapeCrexScorecard(url) {
  if (!url) {
    throw new Error(
      "Set LIVE_MATCH_URL to either a CREX match-scorecard URL or the IPL matches page."
    );
  }

  const browser = await chromium.launch({
    headless: true
  });

  try {
    const listPage = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
      locale: "en-US",
      viewport: {
        width: 1440,
        height: 1600
      }
    });

    const sourceUrl = toAbsoluteUrl(url);
    let matchUrls = [];

    if (/\/series\/.+\/matches$/i.test(sourceUrl)) {
      matchUrls = await extractCompletedCrexMatchUrls(listPage, sourceUrl);
    } else {
      matchUrls = [toScorecardUrl(sourceUrl)];
    }

    if (matchUrls.length === 0) {
      throw new Error("No completed CREX match scorecards were found from the supplied URL.");
    }

    const matches = [];
    for (const matchUrl of matchUrls) {
      const detailPage = await browser.newPage({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        locale: "en-US",
        viewport: {
          width: 1440,
          height: 1600
        }
      });

      try {
        matches.push(await scrapeSingleCrexScorecard(detailPage, matchUrl));
      } catch (error) {
        console.warn(`Skipping match URL due to parse error: ${matchUrl} (${error.message})`);
      } finally {
        await detailPage.close().catch(() => {});
      }
    }

    if (matches.length === 0) {
      throw new Error("No CREX scorecards could be parsed from discovered match URLs.");
    }

    return {
      source: `playwright-crex:${sourceUrl}`,
      matches
    };
  } finally {
    await browser.close();
  }
}

module.exports = {
  scrapeCrexScorecard,
  scrapeLatestCrexMatch
};
