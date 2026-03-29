function calculateTeamPoints(players, teamSize) {
  const selectedPlayers = [...players]
    .sort((firstPlayer, secondPlayer) => secondPlayer.totalPoints - firstPlayer.totalPoints)
    .slice(0, teamSize);

  const totalPoints = selectedPlayers.reduce(
    (runningTotal, player) => runningTotal + player.totalPoints,
    0
  );

  return {
    selectedPlayers,
    totalPoints
  };
}

module.exports = {
  calculateTeamPoints
};
