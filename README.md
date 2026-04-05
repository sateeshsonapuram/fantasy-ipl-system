# fantasy-ipl-system
Calculate points for a team you have selected
Owner buys 15 players from ongoing ipl 2026 squads with 100 credits given at the begining of auction.
Owners bid with those 100 credits and buy player min would be 11 players

## Project Guide

For a full explanation of each file and the execution flow, see:

- [PROJECT_GUIDE.md](e:/Sateesh%20Project/fantasy-ipl-system/PROJECT_GUIDE.md)

## Automation

The app can now use generated match data instead of only the seeded sample data.

### Commands

- `npm start`
  Builds the leaderboard and opens `owners.html`.
- `npm run update:matches`
  Fetches latest match data from the configured source and writes `src/data/generated/matches.json`.
- `npm run refresh`
  Runs the match update and then rebuilds the leaderboard HTML.
- `npm run score`
  Fetches the latest completed IPL 2026 matches from CREX, rebuilds the leaderboard, and opens `owners.html`.

### Live data source

Supported environment variables:

Or for a future API integration:

- `LIVE_MATCH_SOURCE=http-json`
- `LIVE_MATCH_URL=https://your-endpoint.example.com/matches`

Or for the Playwright scraper prototype:

- `LIVE_MATCH_SOURCE=playwright-crex`
- `LIVE_MATCH_URL=https://crex.com/cricket-live-score/.../match-scorecard`

Example:

```powershell
$env:LIVE_MATCH_SOURCE="playwright-crex"
$env:LIVE_MATCH_URL="https://crex.com/cricket-live-score/kkr-vs-mi-2nd-match-ipl-2026-10Y0/match-scorecard"
npm run update:matches
```

Notes:

- Run `npm install` first so Playwright is available.
- This scraper is a best-effort fallback for public scorecard pages, not a stable API.
- It reads the visible CREX scorecard, toggles innings, and derives batting, bowling, and some fielding events from dismissal text.
- Cricbuzz blocked headless browser access during validation in this environment, so CREX is the working fallback target here.
