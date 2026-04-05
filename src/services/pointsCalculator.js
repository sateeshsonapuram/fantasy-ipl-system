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

function shouldSkipStrikeRate(player) {
  return player.role === "bowler";
}

function shouldSkipDuckPenalty(player) {
  return player.role === "bowler";
}

function getStrikeRatePoints(player) {
  if (shouldSkipStrikeRate(player)) {
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

function calculatePlayerPointBreakdown(player) {
  const startingXI = player.inPlayingXI ? 4 : 0;
  const runs = player.runs;
  const fours = player.fours;
  const sixes = player.sixes * 2;
  const battingBonus = getBattingBonusPoints(player.runs);
  const duckPenalty = player.isOutForDuck && !shouldSkipDuckPenalty(player) ? -2 : 0;
  const wickets = player.wickets * 25;
  const maidenOvers = player.maidenOvers * 12;
  const lbwBowledBonus = player.lbwBowledWickets * 8;
  const wicketBonus = getWicketHaulBonus(player.wickets);
  const catches = player.catches * 8;
  const catchBonus = getCatchBonus(player.catches);
  const stumpings = player.stumpings * 12;
  const directRunOuts = player.directRunOuts * 12;
  const indirectRunOuts = player.indirectRunOuts * 6;
  const strikeRate = getStrikeRatePoints(player);
  const economyRate = getEconomyRatePoints(player);

  const total =
    startingXI +
    runs +
    fours +
    sixes +
    battingBonus +
    duckPenalty +
    wickets +
    maidenOvers +
    lbwBowledBonus +
    wicketBonus +
    catches +
    catchBonus +
    stumpings +
    directRunOuts +
    indirectRunOuts +
    strikeRate +
    economyRate;

  return {
    total,
    breakdown: {
      startingXI,
      runs,
      fours,
      sixes,
      battingBonus,
      duckPenalty,
      wickets,
      maidenOvers,
      lbwBowledBonus,
      wicketBonus,
      catches,
      catchBonus,
      stumpings,
      directRunOuts,
      indirectRunOuts,
      strikeRate,
      economyRate
    }
  };
}

function calculatePlayerPoints(player) {
  return calculatePlayerPointBreakdown(player).total;
}

module.exports = {
  calculatePlayerPoints,
  calculatePlayerPointBreakdown
};
