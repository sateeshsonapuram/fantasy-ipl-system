const { chromium } = require("playwright");
const { buildMatchFromCrexInnings, parseVisibleCrexScorecard } = require("./cricbuzzTextParser");

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

async function scrapeSingleCrexScorecard(page, url) {
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });

  await page.waitForLoadState("networkidle", {
    timeout: 15000
  }).catch(() => {});

  const firstText = await page.locator("body").innerText();
  const pageMetadata = parseVisibleCrexScorecard(firstText, url);
  const innings = [];

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

    if (!innings.some((entry) => entry.battingTeam === inningsData.battingTeam)) {
      innings.push(inningsData);
    }
  }

  return buildMatchFromCrexInnings(innings, url);
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

        return (
          / won by | tied | no result | abandoned | match abandoned /i.test(cardText) &&
          !/ on /i.test(cardText)
        );
      })
      .map(({ href }) => href)
  );

  return Array.from(new Set(discoveredUrls)).map(toScorecardUrl);
}

async function scrapeCricbuzzScorecard(url) {
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

    const matches = [];
    for (const matchUrl of matchUrls) {
      matches.push(await scrapeSingleCrexScorecard(page, matchUrl));
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
  scrapeCricbuzzScorecard
};
