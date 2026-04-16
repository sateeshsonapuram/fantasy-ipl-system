const { calculateTeamPoints } = require("./teamSelector");
const { resolveTeamPlayerName, teamPlayerRegistry } = require("./playerRegistry");

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

  return owners
    .map((owner) => {
      const squadPlayers = owner.squadPlayerNames.map((playerName) => {
        const resolved = resolveOwnerSquadPlayer(playerName, players);

        if (resolved.matchedPlayer) {
          return resolved.matchedPlayer;
        }

        const indexKey = `${resolved.team}|${normalizePlayerName(resolved.canonicalName)}`;
        const matchedPlayer = playerIndex.byTeamAndName.get(indexKey);

        if (matchedPlayer) {
          return matchedPlayer;
        }

        return {
          id: `missing-${owner.id}-${normalizePlayerName(playerName)}`,
          name: playerName,
          team: resolved.team,
          totalPoints: 0,
          matchesPlayed: 0,
          isMissingStat: true
        };
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
        selectedPlayers: teamSelection.selectedPlayers,
        totalPoints: teamSelection.totalPoints
      };
    })
    .sort((firstOwner, secondOwner) => secondOwner.totalPoints - firstOwner.totalPoints);
}

module.exports = {
  calculateOwnerLeaderboard
};
