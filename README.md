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

### Live data source

By default the updater expects a local JSON file at `live-data/matches.json`.
You can copy `live-data/matches.example.json` and replace it with your latest match payload.

Supported environment variables:

- `LIVE_MATCH_SOURCE=local-json`
- `LIVE_MATCH_FILE=path-to-your-json-file`

Or for a future API integration:

- `LIVE_MATCH_SOURCE=http-json`
- `LIVE_MATCH_URL=https://your-endpoint.example.com/matches`
