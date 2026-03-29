function getBattingBonusPoints(runs) {
  if (runs >= 100) {
    return 16;
  }

  if (runs >= 50) {
    return 8;
  }

  if (runs >= 30) {
    return 4;
  }

  return 0;
}

function getWicketHaulBonus(wickets) {
  if (wickets >= 5) {
    return 16;
  }

  if (wickets >= 4) {
    return 8;
  }

  if (wickets >= 3) {
    return 4;
  }

  return 0;
}

function getCatchBonus(catches) {
  return catches >= 3 ? 4 : 0;
}

function getEconomyRatePoints(player) {
  if (!player.oversBowled || player.oversBowled < 2) {
    return 0;
  }

  const economyRate = player.runsConceded / player.oversBowled;

  if (economyRate < 5) {
    return 6;
  }

  if (economyRate < 6) {
    return 4;
  }

  if (economyRate < 7) {
    return 2;
  }

  if (economyRate < 10) {
    return 0;
  }

  if (economyRate < 11) {
    return -2;
  }

  if (economyRate < 12) {
    return -4;
  }

  return -6;
}

function getStrikeRatePoints(player) {
  if (player.role === "bowler") {
    return 0;
  }

  if ((player.ballsFaced || 0) < 10 && (player.runs || 0) < 20) {
    return 0;
  }

  if (!player.ballsFaced) {
    return 0;
  }

  const strikeRate = (player.runs / player.ballsFaced) * 100;

  if (strikeRate < 50) {
    return -6;
  }

  if (strikeRate < 60) {
    return -4;
  }

  if (strikeRate < 70) {
    return -2;
  }

  if (strikeRate < 130) {
    return 0;
  }

  if (strikeRate < 150) {
    return 2;
  }

  if (strikeRate < 170) {
    return 4;
  }

  return 6;
}

function calculatePlayerPoints(player) {
  const battingPoints =
    player.runs +
    player.fours +
    player.sixes * 2 +
    getBattingBonusPoints(player.runs) +
    (player.isOutForDuck && player.role !== "bowler" ? -2 : 0);

  const bowlingPoints =
    player.wickets * 25 +
    player.maidenOvers * 12 +
    player.lbwBowledWickets * 8 +
    getWicketHaulBonus(player.wickets);

  const fieldingPoints =
    player.catches * 8 +
    getCatchBonus(player.catches) +
    player.stumpings * 12 +
    player.directRunOuts * 12 +
    player.indirectRunOuts * 6;

  const otherPoints = player.inPlayingXI ? 4 : 0;
  const strikeRatePoints = getStrikeRatePoints(player);
  const economyRatePoints = getEconomyRatePoints(player);

  return (
    battingPoints +
    bowlingPoints +
    fieldingPoints +
    otherPoints +
    strikeRatePoints +
    economyRatePoints
  );
}

module.exports = {
  calculatePlayerPoints
};
