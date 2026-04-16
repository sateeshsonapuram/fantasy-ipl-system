# Project Guide

This guide explains what each file does, how the app runs, and how match data moves through the system.

## What This Project Does

This project calculates fantasy IPL points for each owner based on player performances from matches.
It then:

- calculates player points
- builds owner totals from their squads
- selects the best 11 players for each owner
- generates `owners.html`
- opens the HTML in the browser

## Main Execution Flow

There are 2 common flows now.

### 1. `npm run score:official`

This runs:

- [scoreOfficialAuto.js](e:/Sateesh%20Project/fantasy-ipl-system/src/sources/ipl-fantasy/scoreOfficialAuto.js)
- [index.js](e:/Sateesh%20Project/fantasy-ipl-system/src/app/index.js)

Flow:

1. Reuses the saved IPL fantasy login session or opens login if needed
2. Fetches official player points from the IPL fantasy website
3. Writes the cached official feed to [ipl-fantasy-points.json](e:/Sateesh%20Project/fantasy-ipl-system/src/data/generated/ipl-fantasy-points.json)
4. Builds owner rankings and generates [owners.html](e:/Sateesh%20Project/fantasy-ipl-system/owners.html)

### 2. `npm run score:live` / `npm run score:completed`

These run:

- [refreshLeaderboard.js](e:/Sateesh%20Project/fantasy-ipl-system/src/app/refreshLeaderboard.js)
- [updateMatches.js](e:/Sateesh%20Project/fantasy-ipl-system/src/app/updateMatches.js)

Flow:

1. Scrapes CREX scorecards from the configured series or match URL
2. Writes normalized matches to [matches.json](e:/Sateesh%20Project/fantasy-ipl-system/src/data/generated/matches.json)
3. Rebuilds the leaderboard page from those stored matches

## File-by-File Guide

### App files

- [index.js](e:/Sateesh%20Project/fantasy-ipl-system/src/app/index.js)
  Main app entry.
  Builds the page, calculates the leaderboard, writes `owners.html`, and opens it in the browser.

- [updateMatches.js](e:/Sateesh%20Project/fantasy-ipl-system/src/app/updateMatches.js)
  Fetches CREX match data and writes generated match JSON.

- [refreshLeaderboard.js](e:/Sateesh%20Project/fantasy-ipl-system/src/app/refreshLeaderboard.js)
  Convenience runner that updates matches first and then rebuilds the leaderboard.

### Data files

- [owners.js](e:/Sateesh%20Project/fantasy-ipl-system/src/data/owners.js)
  Contains the fantasy owners and their squad player names.

- [matches.js](e:/Sateesh%20Project/fantasy-ipl-system/src/data/matches.js)
  Match-data loader.
  It first checks generated match data, and if none exists, it falls back to the seeded sample matches.

- [matches.json](e:/Sateesh%20Project/fantasy-ipl-system/src/data/generated/matches.json)
  Auto-generated normalized match data used by the app when available.

### Service files

- [pointsCalculator.js](e:/Sateesh%20Project/fantasy-ipl-system/src/services/pointsCalculator.js)
  Defines fantasy scoring rules for batting, bowling, fielding, strike rate, economy, and XI bonus.

- [playerAggregation.js](e:/Sateesh%20Project/fantasy-ipl-system/src/services/playerAggregation.js)
  Combines the same player's performance across matches and calculates season total points.

- [ownerLeaderboard.js](e:/Sateesh%20Project/fantasy-ipl-system/src/services/ownerLeaderboard.js)
  Matches owner squad names to player stats, handles aliases, marks missing players, and computes owner totals.

- [teamSelector.js](e:/Sateesh%20Project/fantasy-ipl-system/src/services/teamSelector.js)
  Picks the highest-scoring `teamSize` players for each owner.

### Source folders

- [src/sources/crex](e:/Sateesh%20Project/fantasy-ipl-system/src/sources/crex)
  CREX scraper/parser files used by `score:live`, `score:completed`, and `score:all`.

- [src/sources/ipl-fantasy](e:/Sateesh%20Project/fantasy-ipl-system/src/sources/ipl-fantasy)
  Official IPL fantasy login/session and points-fetch files used by `score:official`.

## Data Flow

The project's data flow is:

`CREX matches page`
-> [updateMatches.js](e:/Sateesh%20Project/fantasy-ipl-system/src/app/updateMatches.js)
-> [playwrightCrexSource.js](e:/Sateesh%20Project/fantasy-ipl-system/src/sources/crex/playwrightCrexSource.js)
-> [matches.json](e:/Sateesh%20Project/fantasy-ipl-system/src/data/generated/matches.json)
-> [matches.js](e:/Sateesh%20Project/fantasy-ipl-system/src/data/matches.js)
-> [playerAggregation.js](e:/Sateesh%20Project/fantasy-ipl-system/src/services/playerAggregation.js)
-> [ownerLeaderboard.js](e:/Sateesh%20Project/fantasy-ipl-system/src/services/ownerLeaderboard.js)
-> [index.js](e:/Sateesh%20Project/fantasy-ipl-system/src/app/index.js)
-> [owners.html](e:/Sateesh%20Project/fantasy-ipl-system/owners.html)

## Why Some Players Show 0 Points

If a player is not present in the current match data, that player gets:

- `0` points
- marked as missing stats

This usually means the latest match payload does not include that player yet.

## Daily Usage

For daily updates after each match:

1. Preferred: run `npm run score:official`
2. If official fetch fails and you want the last successful official result, run `npm run score:official:last`
3. If you still want scorecard-derived numbers, run `npm run score:live` or `npm run score:completed`
2. Check [owners.html](e:/Sateesh%20Project/fantasy-ipl-system/owners.html)

## Future Automation

The project is ready for the next automation step:

- connect a real cricket API
- schedule `npm run refresh`
- auto-save fresh match data every day

## Quick Summary

If someone is new to this repo, the most important files are:

- [index.js](e:/Sateesh%20Project/fantasy-ipl-system/src/app/index.js)
- [matches.js](e:/Sateesh%20Project/fantasy-ipl-system/src/data/matches.js)
- [owners.js](e:/Sateesh%20Project/fantasy-ipl-system/src/data/owners.js)
- [pointsCalculator.js](e:/Sateesh%20Project/fantasy-ipl-system/src/services/pointsCalculator.js)
- [ownerLeaderboard.js](e:/Sateesh%20Project/fantasy-ipl-system/src/services/ownerLeaderboard.js)
- [updateMatches.js](e:/Sateesh%20Project/fantasy-ipl-system/src/app/updateMatches.js)

