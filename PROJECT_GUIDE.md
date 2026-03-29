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

There are 3 common ways to run the project.

### 1. `npm start`

This runs:

- [index.js](e:/Sateesh%20Project/fantasy-ipl-system/src/app/index.js)

Flow:

1. Reads match data from [matches.js](e:/Sateesh%20Project/fantasy-ipl-system/src/data/matches.js)
2. Reads owner squads from [owners.js](e:/Sateesh%20Project/fantasy-ipl-system/src/data/owners.js)
3. Aggregates player points using [playerAggregation.js](e:/Sateesh%20Project/fantasy-ipl-system/src/services/playerAggregation.js)
4. Applies scoring rules from [pointsCalculator.js](e:/Sateesh%20Project/fantasy-ipl-system/src/services/pointsCalculator.js)
5. Builds owner rankings with [ownerLeaderboard.js](e:/Sateesh%20Project/fantasy-ipl-system/src/services/ownerLeaderboard.js)
6. Selects the top 11 players for each owner using [teamSelector.js](e:/Sateesh%20Project/fantasy-ipl-system/src/services/teamSelector.js)
7. Generates [owners.html](e:/Sateesh%20Project/fantasy-ipl-system/owners.html)
8. Opens the HTML in Chrome or the default browser

### 2. `npm run update:matches`

This runs:

- [updateMatches.js](e:/Sateesh%20Project/fantasy-ipl-system/src/app/updateMatches.js)

Flow:

1. Reads live/source match data using [liveMatchSource.js](e:/Sateesh%20Project/fantasy-ipl-system/src/services/liveMatchSource.js)
2. Normalizes the data into the project format
3. Writes the result into [matches.json](e:/Sateesh%20Project/fantasy-ipl-system/src/data/generated/matches.json)

### 3. `npm run refresh`

This runs:

- [refreshLeaderboard.js](e:/Sateesh%20Project/fantasy-ipl-system/src/app/refreshLeaderboard.js)

Flow:

1. Runs the match updater
2. Rebuilds the leaderboard page
3. Opens the refreshed HTML

This is the best command for daily use.

## File-by-File Guide

### App files

- [index.js](e:/Sateesh%20Project/fantasy-ipl-system/src/app/index.js)
  Main app entry.
  Builds the page, calculates the leaderboard, writes `owners.html`, and opens it in the browser.

- [updateMatches.js](e:/Sateesh%20Project/fantasy-ipl-system/src/app/updateMatches.js)
  Fetches latest match data from the configured source and writes generated match JSON.

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

- [matches.json](e:/Sateesh%20Project/fantasy-ipl-system/live-data/matches.json)
  Input file for live/daily updates.
  This is the file you replace with the latest match payload.

- [matches.example.json](e:/Sateesh%20Project/fantasy-ipl-system/live-data/matches.example.json)
  Example format showing how the live input JSON should look.

### Service files

- [pointsCalculator.js](e:/Sateesh%20Project/fantasy-ipl-system/src/services/pointsCalculator.js)
  Defines fantasy scoring rules for batting, bowling, fielding, strike rate, economy, and XI bonus.

- [playerAggregation.js](e:/Sateesh%20Project/fantasy-ipl-system/src/services/playerAggregation.js)
  Combines the same player’s performance across matches and calculates season total points.

- [ownerLeaderboard.js](e:/Sateesh%20Project/fantasy-ipl-system/src/services/ownerLeaderboard.js)
  Matches owner squad names to player stats, handles aliases, marks missing players, and computes owner totals.

- [teamSelector.js](e:/Sateesh%20Project/fantasy-ipl-system/src/services/teamSelector.js)
  Picks the highest-scoring `teamSize` players for each owner.

- [liveMatchSource.js](e:/Sateesh%20Project/fantasy-ipl-system/src/services/liveMatchSource.js)
  Reads and normalizes live match data from a local JSON file or an HTTP JSON source.

## Data Flow

The project’s data flow is:

`live-data/matches.json`
-> [updateMatches.js](e:/Sateesh%20Project/fantasy-ipl-system/src/app/updateMatches.js)
-> [liveMatchSource.js](e:/Sateesh%20Project/fantasy-ipl-system/src/services/liveMatchSource.js)
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

1. Replace [matches.json](e:/Sateesh%20Project/fantasy-ipl-system/live-data/matches.json) with the latest match payload
2. Run `npm run refresh`
3. Check [owners.html](e:/Sateesh%20Project/fantasy-ipl-system/owners.html)

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
