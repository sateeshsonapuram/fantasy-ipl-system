const { calculateTeamPoints } = require("./teamSelector");
const { resolveTeamPlayerName, teamPlayerRegistry } = require("./playerRegistry");
const injuryReplacements = require("../data/injuryReplacements");

function normalizePlayerName(name) {
  return String(name)
    .toLowerCase()
    .replace(/\((wk|c)\)/g, " ")
    .replace(/\bimpact\b/g, " ")
    .replace(/\bnot out\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toTitleCase(name) {
  return String(name || "").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toShortDisplayName(name) {
  const tokens = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length < 2) {
    return toTitleCase(name);
  }

  return `${tokens[0].charAt(0).toUpperCase()} ${tokens[tokens.length - 1]}`;
}

function clonePlayerRecord(player) {
  return {
    ...player,
    matchBreakdowns: [...(player.matchBreakdowns || [])]
  };
}

function buildPlayerIndex(players) {
  const byTeamAndName = new Map();

  players.forEach((player) => {
    if (player.isMissingStat) {
      return;
    }

    const key = `${String(player.team || "").toUpperCase()}|${normalizePlayerName(player.name)}`;
    byTeamAndName.set(key, player);
  });

  return {
    byTeamAndName
  };
}

function tokenizePlayerName(name) {
  return normalizePlayerName(name).split(" ").filter(Boolean);
}

function removeLeadingInitials(tokens) {
  const trimmed = [...tokens];

  while (trimmed.length > 2 && trimmed[0] && trimmed[0].length === 1) {
    trimmed.shift();
  }

  return trimmed;
}

function findUniqueCandidate(candidates) {
  if (candidates.length !== 1) {
    return null;
  }

  return candidates[0];
}

function buildInjuryReplacementMap() {
  return injuryReplacements.reduce((map, rule) => {
    const injuredKey = normalizePlayerName(rule.injuredPlayer);
    if (!injuredKey) {
      return map;
    }

    map.set(injuredKey, {
      injuredPlayer: rule.injuredPlayer,
      replacementPlayer: rule.replacementPlayer
    });
    return map;
  }, new Map());
}

function mergeReplacementIntoSlot(basePlayer, replacementPlayer) {
  const mergedBase = clonePlayerRecord(basePlayer);

  if (!replacementPlayer || replacementPlayer.isMissingStat) {
    return mergedBase;
  }

  mergedBase.totalPoints = (mergedBase.totalPoints || 0) + (replacementPlayer.totalPoints || 0);
  mergedBase.matchesPlayed = (mergedBase.matchesPlayed || 0) + (replacementPlayer.matchesPlayed || 0);
  mergedBase.matchBreakdowns = [
    ...(mergedBase.matchBreakdowns || []),
    ...(replacementPlayer.matchBreakdowns || [])
  ];
  mergedBase.replacementPlayers = [
    ...(mergedBase.replacementPlayers || []),
    replacementPlayer.name
  ];
  mergedBase.name = `${mergedBase.name} / ${toShortDisplayName(replacementPlayer.name)}`;

  return mergedBase;
}

function resolveOwnerPlayerFromPool(playerName, players) {
  const inputTokens = tokenizePlayerName(playerName);

  if (inputTokens.length === 0) {
    return null;
  }

  const normalizedInput = inputTokens.join(" ");
  const trimmedInput = removeLeadingInitials(inputTokens).join(" ");
  const exactCandidates = players.filter(
    (player) => normalizePlayerName(player.name) === normalizedInput
  );
  const exactMatch = findUniqueCandidate(exactCandidates);

  if (exactMatch) {
    return exactMatch;
  }

  if (trimmedInput && trimmedInput !== normalizedInput) {
    const trimmedCandidates = players.filter((player) => {
      const playerTokens = tokenizePlayerName(player.name);
      return (
        normalizePlayerName(player.name) === trimmedInput ||
        removeLeadingInitials(playerTokens).join(" ") === trimmedInput
      );
    });
    const trimmedMatch = findUniqueCandidate(trimmedCandidates);

    if (trimmedMatch) {
      return trimmedMatch;
    }
  }

  const inputFirst = inputTokens[0];
  const inputLast = inputTokens[inputTokens.length - 1];
  const flexibleCandidates = players.filter((player) => {
    const playerTokens = tokenizePlayerName(player.name);
    const playerFirst = playerTokens[0] || "";
    const playerLast = playerTokens[playerTokens.length - 1] || "";

    if (!playerLast || playerLast !== inputLast) {
      return false;
    }

    return (
      playerFirst === inputFirst ||
      playerFirst.startsWith(inputFirst) ||
      inputFirst.startsWith(playerFirst) ||
      playerFirst.charAt(0) === inputFirst.charAt(0)
    );
  });
  const flexibleMatch = findUniqueCandidate(flexibleCandidates);

  if (flexibleMatch) {
    return flexibleMatch;
  }

  const subsetCandidates = players.filter((player) => {
    const playerTokens = tokenizePlayerName(player.name);

    if (playerTokens.length < 2 || inputTokens.length < playerTokens.length) {
      return false;
    }

    return playerTokens.every((token) => inputTokens.includes(token));
  });
  const subsetMatch = findUniqueCandidate(subsetCandidates);

  if (subsetMatch) {
    return subsetMatch;
  }

  return null;
}

function resolveOwnerSquadPlayer(playerName, players) {
  const poolMatch = resolveOwnerPlayerFromPool(playerName, players);
  if (poolMatch) {
    return {
      team: poolMatch.team,
      canonicalName: poolMatch.name,
      matchedPlayer: poolMatch
    };
  }

  const normalizedInput = normalizePlayerName(playerName);
  const exactCrossTeamMatches = Object.keys(teamPlayerRegistry)
    .map((teamCode) => {
      const roster = teamPlayerRegistry[teamCode] || [];
      const exactName = roster.find((name) => normalizePlayerName(name) === normalizedInput);
      return exactName
        ? {
            teamCode,
            canonicalName: exactName
          }
        : null;
    })
    .filter(Boolean);

  if (exactCrossTeamMatches.length === 1) {
    return {
      team: exactCrossTeamMatches[0].teamCode,
      canonicalName: exactCrossTeamMatches[0].canonicalName
    };
  }

  const crossTeamMatches = Object.keys(teamPlayerRegistry)
    .map((teamCode) => ({
      teamCode,
      canonicalName: resolveTeamPlayerName(teamCode, playerName)
    }))
    .filter((entry) => Boolean(entry.canonicalName));

  if (crossTeamMatches.length === 1) {
    return {
      team: crossTeamMatches[0].teamCode,
      canonicalName: crossTeamMatches[0].canonicalName
    };
  }

  return {
    team: "Unknown",
    canonicalName: toTitleCase(playerName)
  };
}

function calculateOwnerLeaderboard(owners, players, teamSize) {
  const playerIndex = buildPlayerIndex(players);
  const injuryReplacementMap = buildInjuryReplacementMap();

  return owners
    .map((owner) => {
      const trackedPlayers = [];
      const squadPlayers = owner.squadPlayerNames.map((playerName) => {
        const resolved = resolveOwnerSquadPlayer(playerName, players);

        if (resolved.matchedPlayer) {
          trackedPlayers.push(resolved.matchedPlayer);
        }

        const normalizedPlayerName = normalizePlayerName(playerName);
        let basePlayer;

        if (resolved.matchedPlayer) {
          basePlayer = clonePlayerRecord(resolved.matchedPlayer);
        } else {
          const indexKey = `${resolved.team}|${normalizePlayerName(resolved.canonicalName)}`;
          const matchedPlayer = playerIndex.byTeamAndName.get(indexKey);

          if (matchedPlayer) {
            trackedPlayers.push(matchedPlayer);
            basePlayer = clonePlayerRecord(matchedPlayer);
          }
        }

        if (!basePlayer) {
          basePlayer = {
            id: `missing-${owner.id}-${normalizePlayerName(playerName)}`,
            name: playerName,
            team: resolved.team,
            totalPoints: 0,
            matchesPlayed: 0,
            isMissingStat: true,
            matchBreakdowns: []
          };
        }

        const replacementRule =
          injuryReplacementMap.get(normalizedPlayerName) ||
          injuryReplacementMap.get(normalizePlayerName(basePlayer.name)) ||
          injuryReplacementMap.get(normalizePlayerName(resolved.canonicalName));
        if (replacementRule) {
          const replacementResolved = resolveOwnerSquadPlayer(replacementRule.replacementPlayer, players);
          let replacementMatch = replacementResolved.matchedPlayer;

          if (!replacementMatch) {
            const replacementKey = `${replacementResolved.team}|${normalizePlayerName(
              replacementResolved.canonicalName
            )}`;
            replacementMatch = playerIndex.byTeamAndName.get(replacementKey) || null;
          }

          if (replacementMatch) {
            trackedPlayers.push(replacementMatch);
            basePlayer = mergeReplacementIntoSlot(basePlayer, replacementMatch);
          }
        }

        return basePlayer;
      });

      const teamSelection = calculateTeamPoints(squadPlayers, teamSize);
      const missingPlayers = squadPlayers.filter((player) => player.isMissingStat).map((player) => player.name);
      const playersWithStats = squadPlayers.length - missingPlayers.length;

      return {
        id: owner.id,
        name: owner.name,
        squadSize: squadPlayers.length,
        playersWithStats,
        missingPlayers,
        squadPlayers,
        trackedPlayers,
        selectedPlayers: teamSelection.selectedPlayers,
        totalPoints: teamSelection.totalPoints
      };
    })
    .sort((firstOwner, secondOwner) => secondOwner.totalPoints - firstOwner.totalPoints);
}

module.exports = {
  calculateOwnerLeaderboard
};
