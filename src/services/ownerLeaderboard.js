const { calculateTeamPoints } = require("./teamSelector");

const playerAliases = {
  bumrah: "Jasprit Bumrah",
  dhoni: "MS Dhoni",
  jadeja: "Ravindra Jadeja",
  jaiswal: "Yashasvi Jaiswal",
  kohli: "Virat Kohli",
  rohit: "Rohit Sharma",
  ruturaj: "Ruturaj Gaikwad",
  samsun: "Sanju Samson",
  sky: "Suryakumar Yadav"
};

function normalizePlayerName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function calculateOwnerLeaderboard(owners, players, teamSize) {
  const playersByName = new Map();

  players.forEach((player) => {
    playersByName.set(normalizePlayerName(player.name), player);
  });

  return owners
    .map((owner) => {
      const squadPlayers = owner.squadPlayerNames.map((playerName) => {
        const normalizedInputName = normalizePlayerName(playerName);
        const aliasName = playerAliases[normalizedInputName];
        const matchedPlayer =
          playersByName.get(normalizedInputName) ||
          (aliasName ? playersByName.get(normalizePlayerName(aliasName)) : undefined);

        return (
          matchedPlayer || {
            id: `missing-${owner.id}-${normalizedInputName}`,
            name: playerName,
            team: "Unknown",
            totalPoints: 0,
            matchesPlayed: 0,
            isMissingStat: true
          }
        );
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
