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

function resolveOwnerSquadPlayer(playerName) {
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
        const resolved = resolveOwnerSquadPlayer(playerName);
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
