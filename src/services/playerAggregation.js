const { calculatePlayerPoints } = require("./pointsCalculator");

function aggregatePlayerPoints(matches) {
  const playersById = new Map();

  matches.forEach((match) => {
    match.players.forEach((player) => {
      const playerPoints = calculatePlayerPoints(player);
      const existingPlayer = playersById.get(player.id);

      if (existingPlayer) {
        existingPlayer.totalPoints += playerPoints;
        existingPlayer.matchesPlayed += 1;
        return;
      }

      playersById.set(player.id, {
        id: player.id,
        name: player.name,
        team: player.team,
        totalPoints: playerPoints,
        matchesPlayed: 1
      });
    });
  });

  return Array.from(playersById.values()).sort(
    (firstPlayer, secondPlayer) => secondPlayer.totalPoints - firstPlayer.totalPoints
  );
}

module.exports = {
  aggregatePlayerPoints
};
