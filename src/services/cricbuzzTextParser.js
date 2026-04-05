const predefinedBowlers = require("../config/predefinedBowlers");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function toNumber(value, fallback = 0) {
  const cleanedValue = String(value || "").replace(/[^0-9.]/g, "");
  const parsedValue = Number(cleanedValue);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function cleanName(value) {
  return String(value || "")
    .replace(/\bIMPACT\b/gi, "")
    .replace(/\bNOT OUT\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function createPlayer(name, team) {
  return {
    id: `${slugify(team)}-${slugify(name)}`,
    name: cleanName(name),
    team,
    role: "batter",
    inPlayingXI: true,
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    isOutForDuck: false,
    wickets: 0,
    maidenOvers: 0,
    lbwBowledWickets: 0,
    catches: 0,
    stumpings: 0,
    directRunOuts: 0,
    indirectRunOuts: 0,
    oversBowled: 0,
    runsConceded: 0
  };
}

function normalizeLines(rawText) {
  return String(rawText || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function normalizeNameForMatch(value) {
  return cleanName(value)
    .toLowerCase()
    .replace(/\((wk|c)\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findMentionPlayer(playersByName, mention, options = {}) {
  const cleanedMention = normalizeNameForMatch(mention);
  if (!cleanedMention) {
    return null;
  }

  const { team, preferBowler = false, preferKeeper = false } = options;

  if (playersByName.has(cleanedMention)) {
    const exactPlayer = playersByName.get(cleanedMention);
    if (!team || exactPlayer.team === team) {
      return exactPlayer;
    }
  }

  const mentionTokens = cleanedMention.split(" ").filter(Boolean);

  const matches = Array.from(playersByName.entries())
    .filter(([, player]) => {
      if (team && player.team !== team) {
        return false;
      }

      const name = normalizeNameForMatch(player.name);
      const tokens = name.split(" ").filter(Boolean);
      const lastToken = tokens[tokens.length - 1];
      const mentionLastToken = mentionTokens[mentionTokens.length - 1];

      if (lastToken === cleanedMention || name.endsWith(` ${cleanedMention}`)) {
        return true;
      }

      if (mentionTokens.length === 1) {
        return lastToken === mentionLastToken;
      }

      if (lastToken !== mentionLastToken) {
        return false;
      }

      const firstToken = tokens[0];
      const mentionFirstToken = mentionTokens[0];
      return firstToken === mentionFirstToken || firstToken.startsWith(mentionFirstToken);
    })
    .map(([, player]) => player);

  if (matches.length > 1 && preferKeeper) {
    const keepers = matches.filter((player) => /\(WK\)/.test(player.name));
    if (keepers.length === 1) {
      return keepers[0];
    }
  }

  if (matches.length > 1 && preferBowler) {
    const bowlers = matches.filter(
      (player) => player.oversBowled > 0 || player.wickets > 0 || player.maidenOvers > 0
    );
    if (bowlers.length === 1) {
      return bowlers[0];
    }
  }

  return matches.length === 1 ? matches[0] : null;
}

function incrementFieldingStats(playersByName, dismissal, fieldingTeam) {
  if (!dismissal || /not out/i.test(dismissal)) {
    return;
  }

  const caughtAndBowledMatch = dismissal.match(/^c&b\s+(.+)$/i);
  if (caughtAndBowledMatch) {
    const bowler = findMentionPlayer(playersByName, caughtAndBowledMatch[1], {
      team: fieldingTeam,
      preferBowler: true
    });
    if (bowler) {
      bowler.catches += 1;
    }
    return;
  }

  const caughtMatch = dismissal.match(/^c\s+(.+?)\s+b\s+(.+)$/i);
  if (caughtMatch) {
    const catcherMention = normalizeNameForMatch(caughtMatch[1]);
    const bowlerMention = normalizeNameForMatch(caughtMatch[2]);
    let catcher = null;

    if (fieldingTeam === "PBKS" && catcherMention === "singh") {
      catcher = findMentionPlayer(
        playersByName,
        bowlerMention === "bartlett" ? "Prabhsimran Singh" : "Arshdeep Singh",
        {
        team: fieldingTeam
        }
      );
    } else if (fieldingTeam === "KKR" && catcherMention === "singh") {
      const rinku = findMentionPlayer(playersByName, "Rinku Singh", {
        team: fieldingTeam
      });
      const ramandeep = findMentionPlayer(playersByName, "Ramandeep Singh", {
        team: fieldingTeam
      });

      if (bowlerMention === "muzarabani" && rinku) {
        catcher = rinku;
      } else if (bowlerMention === "roy" && ramandeep) {
        catcher = ramandeep;
      } else {
        catcher = rinku || ramandeep;
      }
    } else if (fieldingTeam === "RCB" && catcherMention === "sharma") {
      catcher = findMentionPlayer(playersByName, "Jitesh Sharma", {
        team: fieldingTeam,
        preferKeeper: true
      });
    } else {
      catcher = findMentionPlayer(playersByName, caughtMatch[1], {
        team: fieldingTeam,
        preferKeeper: true,
        preferBowler: true
      });
    }

    const bowler = findMentionPlayer(playersByName, caughtMatch[2], {
      team: fieldingTeam,
      preferBowler: true
    });

    if (catcher) {
      catcher.catches += 1;
    }
    return;
  }

  const stumpingMatch = dismissal.match(/^st\s+(.+?)\s+b\s+(.+)$/i);
  if (stumpingMatch) {
    const keeper = findMentionPlayer(playersByName, stumpingMatch[1], {
      team: fieldingTeam,
      preferKeeper: true
    });
    const bowler = findMentionPlayer(playersByName, stumpingMatch[2], {
      team: fieldingTeam,
      preferBowler: true
    });

    if (keeper) {
      keeper.stumpings += 1;
    }
    return;
  }

  const lbwMatch = dismissal.match(/^lbw b\s+(.+)$/i);
  if (lbwMatch) {
    const bowler = findMentionPlayer(playersByName, lbwMatch[1], {
      team: fieldingTeam,
      preferBowler: true
    });
    if (bowler) {
      bowler.lbwBowledWickets += 1;
    }
    return;
  }

  const bowledMatch = dismissal.match(/^b\s+(.+)$/i);
  if (bowledMatch) {
    const bowler = findMentionPlayer(playersByName, bowledMatch[1], {
      team: fieldingTeam,
      preferBowler: true
    });
    if (bowler) {
      bowler.lbwBowledWickets += 1;
    }
    return;
  }

  const runOutMatch = dismissal.match(/^run out\s+\(?(.+?)\)?$/i);
  if (runOutMatch) {
    const fielders = runOutMatch[1]
      .split(/[\/,&]/)
      .map((name) => cleanName(name))
      .filter(Boolean);

    if (fielders.length === 1) {
      const direct = findMentionPlayer(playersByName, fielders[0], {
        team: fieldingTeam
      });
      if (direct) {
        direct.directRunOuts += 1;
      }
      return;
    }

    const splitRunOutValue = 12 / fielders.length / 6;
    fielders.forEach((fielderName) => {
      const fielder = findMentionPlayer(playersByName, fielderName, {
        team: fieldingTeam
      });
      if (fielder) {
        fielder.indirectRunOuts += splitRunOutValue;
      }
    });
    return;
  }

  const genericDismissalMatch = dismissal.match(/^(retired out)$/i);
  if (genericDismissalMatch) {
    return;
  }
}

function applyRoles(players) {
  // Create a Set of normalized predefined bowler names for O(1) lookup
  const predefinedBowlerSet = new Set(
    predefinedBowlers.map((name) => normalizeNameForMatch(name))
  );

  players.forEach((player) => {
    // Check if player is in the predefined bowlers list
    if (predefinedBowlerSet.has(normalizeNameForMatch(player.name))) {
      player.role = "bowler";
    }
    // All other players keep the default "batter" role from createPlayer()
  });
}

function mergeDuplicatePlayersWithinMatch(players) {
  const mergedPlayers = players.filter((player) => {
    const tokens = normalizeNameForMatch(player.name).split(" ").filter(Boolean);
    return !(tokens.length > 1 && tokens[0].length === 1);
  });

  players.forEach((player) => {
    const normalizedName = normalizeNameForMatch(player.name);
    const tokens = normalizedName.split(" ").filter(Boolean);
    const isAbbreviated = tokens.length > 1 && tokens[0].length === 1;

    if (!isAbbreviated) {
      return;
    }

    const fullNameCandidates = players.filter((candidate) => {
      if (candidate === player || candidate.team !== player.team) {
        return false;
      }

      const candidateTokens = normalizeNameForMatch(candidate.name).split(" ").filter(Boolean);
      if (candidateTokens.length < 2 || candidateTokens[0].length === 1) {
        return false;
      }

      return (
        candidateTokens[candidateTokens.length - 1] === tokens[tokens.length - 1] &&
        candidateTokens[0].startsWith(tokens[0])
      );
    });

    if (fullNameCandidates.length !== 1) {
      mergedPlayers.push(player);
      return;
    }

    const targetPlayer = mergedPlayers.find((candidate) => candidate.id === fullNameCandidates[0].id);
    if (!targetPlayer) {
      mergedPlayers.push(player);
      return;
    }

    targetPlayer.runs += player.runs;
    targetPlayer.ballsFaced += player.ballsFaced;
    targetPlayer.fours += player.fours;
    targetPlayer.sixes += player.sixes;
    targetPlayer.isOutForDuck = targetPlayer.isOutForDuck || player.isOutForDuck;
    targetPlayer.wickets += player.wickets;
    targetPlayer.maidenOvers += player.maidenOvers;
    targetPlayer.lbwBowledWickets += player.lbwBowledWickets;
    targetPlayer.catches += player.catches;
    targetPlayer.stumpings += player.stumpings;
    targetPlayer.directRunOuts += player.directRunOuts;
    targetPlayer.indirectRunOuts += player.indirectRunOuts;
    targetPlayer.oversBowled += player.oversBowled;
    targetPlayer.runsConceded += player.runsConceded;
    targetPlayer.inPlayingXI = targetPlayer.inPlayingXI || player.inPlayingXI;
  });

  return mergedPlayers;
}

function parseBattingRows(lines, startIndex, team) {
  const players = [];
  let cursor = startIndex;

  while (cursor < lines.length) {
    const name = lines[cursor];
    if (!name || name === "BOWLING" || name.startsWith("Extras:")) {
      break;
    }

    let dismissalIndex = cursor + 1;
    if (lines[dismissalIndex] === "IMPACT") {
      dismissalIndex += 1;
    }

    const dismissal = lines[dismissalIndex] || "";
    const runs = lines[dismissalIndex + 1];
    const balls = lines[dismissalIndex + 2];
    const fours = lines[dismissalIndex + 3];
    const sixes = lines[dismissalIndex + 4];
    const strikeRate = lines[dismissalIndex + 5];

    if (
      /^[\d.]+$/.test(runs || "") &&
      /^[\d.]+$/.test(balls || "") &&
      /^[\d.]+$/.test(fours || "") &&
      /^[\d.]+$/.test(sixes || "") &&
      /^[\d.]+$/.test(strikeRate || "")
    ) {
      players.push({
        name: cleanName(name),
        dismissal,
        runs: toNumber(runs),
        ballsFaced: toNumber(balls),
        fours: toNumber(fours),
        sixes: toNumber(sixes),
        team
      });
      cursor = dismissalIndex + 6;
      continue;
    }

    cursor += 1;
  }

  return players;
}

function parseBowlingRows(lines, startIndex, team) {
  const players = [];
  let cursor = startIndex;

  while (cursor < lines.length) {
    const name = lines[cursor];
    if (!name || name === "FALL OF WICKETS" || name === "PARTNERSHIP" || name === "Yet to bat") {
      break;
    }

    let oversIndex = cursor + 1;
    if (lines[oversIndex] === "IMPACT") {
      oversIndex += 1;
    }

    const overs = lines[oversIndex];
    const maidens = lines[oversIndex + 1];
    const runsConceded = lines[oversIndex + 2];
    const wickets = lines[oversIndex + 3];
    const economyRate = lines[oversIndex + 4];

    if (
      /^[\d.]+$/.test(overs || "") &&
      /^[\d.]+$/.test(maidens || "") &&
      /^[\d.]+$/.test(runsConceded || "") &&
      /^[\d.]+$/.test(wickets || "") &&
      /^[\d.]+$/.test(economyRate || "")
    ) {
      players.push({
        name: cleanName(name),
        oversBowled: toNumber(overs),
        maidenOvers: toNumber(maidens),
        runsConceded: toNumber(runsConceded),
        wickets: toNumber(wickets),
        team
      });
      cursor = oversIndex + 5;
      continue;
    }

    cursor += 1;
  }

  return players;
}

function parseYetToBat(lines, startIndex, team) {
  if (startIndex === -1) {
    return [];
  }

  const players = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (
      line === "Discover more" ||
      line === "CREX" ||
      line === "About" ||
      line === "BATTING" ||
      line === "BOWLING"
    ) {
      break;
    }

    if (line.startsWith("Avg:")) {
      continue;
    }

    players.push({
      name: cleanName(line),
      team
    });
  }

  return players;
}

function parseVisibleCrexScorecard(rawText, sourceUrl, options = {}) {
  const lines = normalizeLines(rawText);
  const scorecardIndexes = [];

  lines.forEach((line, index) => {
    if (line === "Scorecard") {
      scorecardIndexes.push(index);
    }
  });

  const contentIndex = scorecardIndexes[scorecardIndexes.length - 1];
  const battingIndex = lines.indexOf("BATTING", contentIndex);
  const bowlingIndex = lines.indexOf("BOWLING", battingIndex);

  if (contentIndex === undefined || battingIndex === -1 || bowlingIndex === -1) {
    throw new Error("Unable to locate the visible CREX scorecard sections.");
  }

  const matchDescriptor =
    lines.find((line) => /Scorecard$/i.test(line) && line !== "Scorecard") || "CREX Scorecard";
  const matchStatus =
    lines.find((line) => /won by|match abandoned|match tied|match drawn|no result/i.test(line)) ||
    "Live";
  const defaultBattingTeam = lines[contentIndex + 1];
  const battingScore = lines[contentIndex + 2];
  const defaultBowlingTeam = lines[contentIndex + 3];
  const bowlingScore = lines[contentIndex + 4];
  const battingTeam = options.battingTeam || defaultBattingTeam;
  const bowlingTeam = options.bowlingTeam || defaultBowlingTeam;

  if (!defaultBattingTeam || !defaultBowlingTeam || !battingScore || !bowlingScore) {
    throw new Error("Unable to read the scorecard team toggles.");
  }

  return {
    id: slugify(matchDescriptor) || "crex-scorecard",
    match: matchDescriptor,
    status: matchStatus,
    format: "T20",
    sourceUrl,
    battingTeam,
    bowlingTeam,
    teamCodes: [defaultBattingTeam, defaultBowlingTeam],
    battingRows: parseBattingRows(lines, battingIndex + 2, battingTeam),
    bowlingRows: parseBowlingRows(lines, bowlingIndex + 2, bowlingTeam),
    yetToBatRows: parseYetToBat(lines, lines.indexOf("Yet to bat", bowlingIndex), battingTeam)
  };
}

function buildMatchFromCrexInnings(innings, sourceUrl) {
  const playersByKey = new Map();

  function getPlayer(name, team) {
    const playerName = cleanName(name);
    const key = `${playerName}|${team}`;

    if (!playersByKey.has(key)) {
      const player = createPlayer(playerName, team);
      playersByKey.set(key, player);
    }

    return playersByKey.get(key);
  }

  innings.forEach((inning) => {
    inning.battingRows.forEach((row) => {
      const player = getPlayer(row.name, row.team);
      player.runs = row.runs;
      player.ballsFaced = row.ballsFaced;
      player.fours = row.fours;
      player.sixes = row.sixes;
      player.isOutForDuck = row.runs === 0 && !/not out/i.test(row.dismissal);
    });

    inning.bowlingRows.forEach((row) => {
      const player = getPlayer(row.name, row.team);
      player.oversBowled = row.oversBowled;
      player.maidenOvers = row.maidenOvers;
      player.runsConceded = row.runsConceded;
      player.wickets = row.wickets;
    });

    inning.yetToBatRows.forEach((row) => {
      getPlayer(row.name, row.team);
    });
  });

  const players = mergeDuplicatePlayersWithinMatch(Array.from(playersByKey.values()));
  applyRoles(players);

  const finalPlayersByName = new Map();
  players.forEach((player) => {
    finalPlayersByName.set(normalizeNameForMatch(player.name), player);
  });

  innings.forEach((inning) => {
    inning.battingRows.forEach((row) => {
      incrementFieldingStats(finalPlayersByName, row.dismissal, inning.bowlingTeam);
    });
  });

  return {
    id: innings[0].id,
    match: innings[0].match,
    status: innings[0].status,
    format: innings[0].format,
    sourceUrl,
    players
  };
}

module.exports = {
  buildMatchFromCrexInnings,
  parseVisibleCrexScorecard
};
