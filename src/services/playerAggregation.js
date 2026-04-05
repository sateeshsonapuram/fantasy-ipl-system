const { calculatePlayerPoints, calculatePlayerPointBreakdown } = require("./pointsCalculator");

function normalizePlayerName(name) {
  return String(name)
    .toLowerCase()
    .replace(/\((wk|c)\)/g, " ")
    .replace(/\bimpact\b/g, " ")
    .replace(/\bnot out\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildCanonicalPlayerKey(player) {
  return `${player.team}|${normalizePlayerName(player.name)}`;
}

function createMatchBreakdown(match, pointBreakdown) {
  return {
    matchId: match.id,
    match: match.match,
    status: match.status,
    format: match.format,
    sourceUrl: match.sourceUrl,
    points: pointBreakdown.total,
    breakdown: pointBreakdown.breakdown
  };
}

function aggregatePlayerPoints(matches) {
  const playersByCanonicalKey = new Map();

  matches.forEach((match) => {
    match.players.forEach((player) => {
      const playerPoints = calculatePlayerPoints(player);
      const pointBreakdown = calculatePlayerPointBreakdown(player);
      const canonicalKey = buildCanonicalPlayerKey(player);
      const existingPlayer = playersByCanonicalKey.get(canonicalKey);

      if (existingPlayer) {
        existingPlayer.totalPoints += playerPoints;
        existingPlayer.matchesPlayed += 1;
        existingPlayer.matchBreakdowns.push(createMatchBreakdown(match, pointBreakdown));

        if (player.name.length > existingPlayer.name.length) {
          existingPlayer.id = player.id;
          existingPlayer.name = player.name;
        }
        return;
      }

      playersByCanonicalKey.set(canonicalKey, {
        id: player.id,
        name: player.name,
        team: player.team,
        totalPoints: playerPoints,
        matchesPlayed: 1,
        matchBreakdowns: [createMatchBreakdown(match, pointBreakdown)]
      });
    });
  });

  return Array.from(playersByCanonicalKey.values())
    .map((player) => ({
      ...player,
      matchBreakdowns: player.matchBreakdowns.sort((firstMatch, secondMatch) =>
        firstMatch.matchId.localeCompare(secondMatch.matchId)
      )
    }))
    .sort((firstPlayer, secondPlayer) => secondPlayer.totalPoints - firstPlayer.totalPoints);
}

function aggregatePlayerPointsIncrementally(existingPayload, matches) {
  const inferredProcessedMatchIds =
    existingPayload?.processedMatchIds ||
    Array.from(
      new Set(
        (existingPayload?.players || []).flatMap((player) =>
          (player.matchBreakdowns || []).map((matchBreakdown) => matchBreakdown.matchId)
        )
      )
    );
  const processedMatchIds = new Set(inferredProcessedMatchIds);
  const playersByCanonicalKey = new Map();

  (existingPayload?.players || []).forEach((player) => {
    const canonicalKey = `${player.team}|${normalizePlayerName(player.name)}`;
    playersByCanonicalKey.set(canonicalKey, {
      ...player,
      matchBreakdowns: [...(player.matchBreakdowns || [])]
    });
  });

  const newMatches = matches.filter((match) => !processedMatchIds.has(match.id));

  newMatches.forEach((match) => {
    match.players.forEach((player) => {
      const pointBreakdown = calculatePlayerPointBreakdown(player);
      const canonicalKey = buildCanonicalPlayerKey(player);
      const existingPlayer = playersByCanonicalKey.get(canonicalKey);

      if (existingPlayer) {
        existingPlayer.totalPoints += pointBreakdown.total;
        existingPlayer.matchesPlayed += 1;
        existingPlayer.matchBreakdowns.push(createMatchBreakdown(match, pointBreakdown));

        if (player.name.length > existingPlayer.name.length) {
          existingPlayer.id = player.id;
          existingPlayer.name = player.name;
        }
        return;
      }

      playersByCanonicalKey.set(canonicalKey, {
        id: player.id,
        name: player.name,
        team: player.team,
        totalPoints: pointBreakdown.total,
        matchesPlayed: 1,
        matchBreakdowns: [createMatchBreakdown(match, pointBreakdown)]
      });
    });

    processedMatchIds.add(match.id);
  });

  const players = Array.from(playersByCanonicalKey.values())
    .map((player) => ({
      ...player,
      matchBreakdowns: player.matchBreakdowns.sort((firstMatch, secondMatch) =>
        firstMatch.matchId.localeCompare(secondMatch.matchId)
      )
    }))
    .sort((firstPlayer, secondPlayer) => secondPlayer.totalPoints - firstPlayer.totalPoints);

  return {
    processedMatchIds: Array.from(processedMatchIds).sort(),
    newMatchIds: newMatches.map((match) => match.id),
    players
  };
}

module.exports = {
  aggregatePlayerPoints,
  aggregatePlayerPointsIncrementally
};
