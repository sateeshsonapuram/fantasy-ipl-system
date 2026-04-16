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

- `npm run fantasy:login`
  Opens IPL Fantasy login once and saves the authenticated browser session locally in `.auth/ipl-fantasy-session.json`.
- `npm run score:all`
  Fetches all available IPL 2026 matches from CREX (including live), rebuilds the leaderboard, and opens `owners.html`.
- `npm run score:completed`
  Checks only the latest match from CREX, updates stored data for that match, then rebuilds the leaderboard using completed matches only.
- `npm run score:live`
  Fetches only the latest match from CREX, merges it into the existing data, rebuilds the leaderboard, and opens `owners.html`.
- `npm run score:official`
  One-command official mode. It reuses the saved IPL Fantasy session if available, otherwise opens login once, saves the session, fetches official player points from `fantasy.iplt20.com`, and rebuilds the leaderboard HTML.
- `npm run score:official:last`
  Rebuilds the leaderboard HTML from the last successful stored official IPL Fantasy points file without fetching from the website.

### Live data source

Supported environment variables:

- `LIVE_MATCH_URL_CREX=https://crex.com/series/indian-premier-league-2026-1PW/matches`
- `LIVE_MATCH_URL=https://crex.com/cricket-live-score/.../match-scorecard` (optional single-match input)

Example:

```powershell
$env:LIVE_MATCH_URL_CREX="https://crex.com/series/indian-premier-league-2026-1PW/matches"
npm run score:live
```

Notes:

- Run `npm install` first so Playwright is available.
- This scraper is a best-effort fallback for public scorecard pages, not a stable API.
- It reads the visible CREX scorecard, toggles innings, and derives batting, bowling, and some fielding events from dismissal text.
