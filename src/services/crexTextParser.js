const predefinedBowlers = require("../config/predefinedBowlers");
const { resolveTeamPlayerName, teamPlayerRegistry } = require("./playerRegistry");

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
  const cleaned = String(value || "")
    .replace(/\bIMPACT\b/gi, "")
    .replace(/\bNOT OUT\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Title case the name
  return cleaned.replace(/\b\w/g, l => l.toUpperCase()).replace(/\(Wk\)/g, "(WK)");
}

function resolvePlayerNameForTeam(name, team) {
  return resolveTeamPlayerName(team, name) || cleanName(name);
}

function createPlayer(name, team) {
  const canonicalName = resolvePlayerNameForTeam(name, team);
  return {
    id: `${slugify(team)}-${slugify(canonicalName)}`,
    name: canonicalName,
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

function isTeamCode(value) {
  return /^[A-Z]{2,4}$/.test(String(value || "").trim());
}

function extractTeamCodes(matchDescriptor, fallbackCodes = []) {
  const descriptorMatch = String(matchDescriptor || "").match(/\b([A-Z]{2,4})\s+Vs\s+([A-Z]{2,4})\b/i);
  if (descriptorMatch) {
    return [descriptorMatch[1].toUpperCase(), descriptorMatch[2].toUpperCase()];
  }

  const normalizedFallback = fallbackCodes
    .map((code) => String(code || "").trim().toUpperCase())
    .filter((code, index, list) => isTeamCode(code) && list.indexOf(code) === index);

  return normalizedFallback.slice(0, 2);
}

function normalizeNameForMatch(value) {
  return cleanName(value)
    .toLowerCase()
    .replace(/\((wk|c)\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toNameTokens(value) {
  return normalizeNameForMatch(value).split(" ").filter(Boolean);
}

function buildNameVariants(value) {
  const tokens = toNameTokens(value);
  const variants = new Set();

  if (tokens.length === 0) {
    return variants;
  }

  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  const firstInitial = first[0];

  variants.add(tokens.join(" "));
  variants.add(last);

  if (firstInitial) {
    variants.add(`${firstInitial} ${last}`);
    variants.add(`${firstInitial}${last}`);
  }

  return variants;
}

function getMatchPriority(player, mention, options = {}) {
  const mentionTokens = toNameTokens(mention);
  const playerTokens = toNameTokens(player.name);
  const mentionVariants = buildNameVariants(mention);
  const playerVariants = buildNameVariants(player.name);
  const { preferBowler = false, preferKeeper = false } = options;

  let score = 0;
  const normalizedMention = mentionTokens.join(" ");
  const normalizedPlayer = playerTokens.join(" ");

  if (!normalizedMention || !normalizedPlayer) {
    return score;
  }

  if (normalizedMention === normalizedPlayer) {
    score += 100;
  }

  if (normalizedPlayer.endsWith(` ${normalizedMention}`)) {
    score += 35;
  }

  if (playerVariants.has(normalizedMention)) {
    score += 30;
  }

  for (const variant of mentionVariants) {
    if (playerVariants.has(variant)) {
      score += 20;
      break;
    }
  }

  const mentionLast = mentionTokens[mentionTokens.length - 1];
  const playerLast = playerTokens[playerTokens.length - 1];
  if (mentionLast && playerLast && mentionLast === playerLast) {
    score += 15;
  }

  const mentionFirst = mentionTokens[0];
  const playerFirst = playerTokens[0];
  if (
    mentionFirst &&
    playerFirst &&
    (mentionFirst === playerFirst || playerFirst.startsWith(mentionFirst))
  ) {
    score += 10;
  }

  if (score > 0 && preferKeeper && /\(wk\)/i.test(player.name)) {
    score += 25;
  }

  if (
    score > 0 &&
    preferBowler &&
    (player.oversBowled > 0 || player.wickets > 0 || player.maidenOvers > 0)
  ) {
    score += 25;
  }

  return score;
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

  const matches = Array.from(playersByName.values()).filter((player) => {
      if (team && player.team !== team) {
        return false;
      }
      const score = getMatchPriority(player, cleanedMention, {
        preferBowler,
        preferKeeper
      });
      return score > 0;
    });

  if (matches.length === 0) {
    return null;
  }

  const rankedMatches = matches
    .map((player) => ({
      player,
      score: getMatchPriority(player, cleanedMention, {
        preferBowler,
        preferKeeper
      })
    }))
    .sort((first, second) => second.score - first.score);

  if (rankedMatches.length === 1) {
    return rankedMatches[0].player;
  }

  if (rankedMatches[0].score === rankedMatches[1].score) {
    return null;
  }

  return rankedMatches[0].player;
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
    const bowler = findMentionPlayer(playersByName, caughtMatch[2], {
      team: fieldingTeam,
      preferBowler: true
    });
    let catcher = null;

    if (fieldingTeam === "PBKS" && catcherMention === "singh") {
      catcher = findMentionPlayer(
        playersByName,
        bowlerMention === "bartlett" ? "Prabhsimran Singh" : "Arshdeep Singh",
        {
        team: fieldingTeam
        }
      );
    } else if (fieldingTeam === "GT" && catcherMention === "khan") {
      const shahrukh = findMentionPlayer(playersByName, "Shahrukh Khan", {
        team: fieldingTeam
      });
      const rashid = findMentionPlayer(playersByName, "Rashid Khan", {
        team: fieldingTeam
      });
      // GT has both Rashid Khan and Shahrukh Khan and CREX often shows only "c Khan".
      // Current verified mappings:
      // - "... b Krishna" -> Rashid Khan
      // - "... b Sharma"  -> Shahrukh Khan
      if (bowlerMention === "krishna") {
        catcher = rashid || shahrukh;
      } else if (bowlerMention === "sharma") {
        catcher = shahrukh || rashid;
      } else {
        catcher = rashid || shahrukh;
      }
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
    } else {
      catcher = findMentionPlayer(playersByName, caughtMatch[1], {
        team: fieldingTeam,
        preferKeeper: true
      });

      // If surname-only mention is ambiguous (for example "c Khan"),
      // resolve by last-name candidates and avoid assigning to the bowler.
      if (!catcher && /\s/.test(caughtMatch[1]) === false) {
        const teamPlayers = Array.from(playersByName.values()).filter(
          (player) => player.team === fieldingTeam
        );
        const surnameCandidates = teamPlayers.filter((player) => {
          const tokens = toNameTokens(player.name);
          return tokens.length > 0 && tokens[tokens.length - 1] === catcherMention;
        });
        const nonBowlerCandidates = bowler
          ? surnameCandidates.filter((player) => player.id !== bowler.id)
          : surnameCandidates;

        if (nonBowlerCandidates.length === 1) {
          catcher = nonBowlerCandidates[0];
        } else if (surnameCandidates.length === 1) {
          catcher = surnameCandidates[0];
        }
      }

      if (!catcher && /\s/.test(caughtMatch[1]) === false) {
        catcher = findMentionPlayer(playersByName, caughtMatch[1], {
          team: fieldingTeam
        });
      }
    }

    if (catcher) {
      catcher.catches += 1;
    }
    return;
  }

  const stumpingMatch = dismissal.match(/^(?:st|s)\s+(.+?)\s+b\s+(.+)$/i);
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

  const runOutMatch = dismissal.match(/^run[- ]out\s*(?:\((.+?)\)|(.+))$/i);
  if (runOutMatch) {
    const rawFielders = runOutMatch[1] || runOutMatch[2] || "";
    const fielders = rawFielders
      .split(/[\/,&]|(?:\s+\band\b\s+)/i)
      .map((name) => cleanName(name).replace(/^sub\s*/i, ""))
      .filter(Boolean);

    if (fielders.length === 1) {
      let direct = findMentionPlayer(playersByName, fielders[0], {
        team: fieldingTeam
      });
      if (!direct) {
        // CREX sometimes shows surname-only run-out fielder mentions.
        // Prefer keeper as a deterministic tie-break when available.
        direct = findMentionPlayer(playersByName, fielders[0], {
          team: fieldingTeam,
          preferKeeper: true
        });
      }
      if (direct) {
        direct.directRunOuts += 1;
      }
      return;
    }

    const splitRunOutValue = 12 / fielders.length / 6;
    fielders.forEach((fielderName) => {
      let fielder = findMentionPlayer(playersByName, fielderName, {
        team: fieldingTeam
      });
      if (!fielder) {
        // For multi-fielder run-outs, keeper is frequently listed as surname-only.
        fielder = findMentionPlayer(playersByName, fielderName, {
          team: fieldingTeam,
          preferKeeper: true
        });
      }
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
        name: resolvePlayerNameForTeam(name, team),
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
        name: resolvePlayerNameForTeam(name, team),
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

  const rawNames = [];
  const addNamesFromLine = (line) => {
    const segments = String(line || "")
      .replace(/^Yet to bat:?/i, "")
      .split(",")
      .map((segment) => segment.trim())
      .filter(Boolean);

    segments.forEach((segment) => {
      if (!segment || /^impact$/i.test(segment) || /^avg:/i.test(segment)) {
        return;
      }

      rawNames.push(segment);
    });
  };

  addNamesFromLine(lines[startIndex]);

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (
      line === "Discover more" ||
      line === "CREX" ||
      line === "About" ||
      line === "BATTING" ||
      line === "BOWLING" ||
      /^FALL OF WICKETS$/i.test(line) ||
      /^PARTNERSHIP$/i.test(line)
    ) {
      break;
    }

    if (!line || line.startsWith("Avg:")) {
      continue;
    }

    addNamesFromLine(line);
  }

  const roster = teamPlayerRegistry[String(team || "").toUpperCase()] || [];
  const usedRosterNames = new Set();

  const resolvedRows = rawNames.map((rawName) => {
    const resolvedName = resolveTeamPlayerName(team, rawName);
    if (resolvedName) {
      usedRosterNames.add(normalizeNameForMatch(resolvedName));
      return {
        name: resolvedName,
        team
      };
    }

    return {
      name: cleanName(rawName),
      team
    };
  });

  const unresolvedIndexes = resolvedRows
    .map((row, index) => ({
      row,
      index,
      isResolved: Boolean(resolveTeamPlayerName(team, row.name))
    }))
    .filter((entry) => !entry.isResolved)
    .map((entry) => entry.index);

  const groupedByMention = new Map();
  unresolvedIndexes.forEach((index) => {
    const mentionKey = normalizeNameForMatch(resolvedRows[index].name);
    if (!groupedByMention.has(mentionKey)) {
      groupedByMention.set(mentionKey, []);
    }
    groupedByMention.get(mentionKey).push(index);
  });

  groupedByMention.forEach((indexes, mentionKey) => {
    const mentionTokens = mentionKey.split(" ").filter(Boolean);
    if (mentionTokens.length < 2) {
      return;
    }

    const firstToken = mentionTokens[0];
    const lastToken = mentionTokens[mentionTokens.length - 1];
    const candidateRosterNames = roster.filter((rosterName) => {
      const rosterTokens = normalizeNameForMatch(rosterName).split(" ").filter(Boolean);
      if (rosterTokens.length < 2) {
        return false;
      }

      const rosterLast = rosterTokens[rosterTokens.length - 1];
      const rosterFirst = rosterTokens[0];
      const firstTokenMatches =
        firstToken.length === 1 ? rosterFirst.startsWith(firstToken) : rosterFirst === firstToken;

      if (!firstTokenMatches || rosterLast !== lastToken) {
        return false;
      }

      return !usedRosterNames.has(normalizeNameForMatch(rosterName));
    });

    if (candidateRosterNames.length !== indexes.length) {
      return;
    }

    const sortedCandidates = [...candidateRosterNames].sort((first, second) =>
      first.localeCompare(second)
    );
    indexes.forEach((rowIndex, candidateIndex) => {
      const resolvedName = resolvePlayerNameForTeam(sortedCandidates[candidateIndex], team);
      resolvedRows[rowIndex] = {
        name: resolvedName,
        team
      };
      usedRosterNames.add(normalizeNameForMatch(resolvedName));
    });
  });

  return resolvedRows;
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
  const detectedBattingTeam = isTeamCode(defaultBattingTeam) ? String(defaultBattingTeam).toUpperCase() : null;
  const detectedBowlingTeam = isTeamCode(defaultBowlingTeam) ? String(defaultBowlingTeam).toUpperCase() : null;
  const teamCodes = extractTeamCodes(matchDescriptor, [detectedBattingTeam, detectedBowlingTeam]);
  const battingTeam = options.battingTeam || detectedBattingTeam || teamCodes[0];
  const bowlingTeam =
    options.bowlingTeam ||
    detectedBowlingTeam ||
    teamCodes.find((team) => team !== battingTeam) ||
    teamCodes[1];

  if (!battingTeam || !bowlingTeam || !battingScore || !bowlingScore) {
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
    detectedBattingTeam,
    detectedBowlingTeam,
    teamCodes: [battingTeam, bowlingTeam],
    battingRows: parseBattingRows(lines, battingIndex + 2, battingTeam),
    bowlingRows: parseBowlingRows(lines, bowlingIndex + 2, bowlingTeam),
    yetToBatRows: parseYetToBat(
      lines,
      lines.findIndex((line, index) => index >= bowlingIndex && /^Yet to bat:?/i.test(line)),
      battingTeam
    )
  };
}

function buildMatchFromCrexInnings(innings, sourceUrl, options = {}) {
  const playingXIByTeam = options.playingXIByTeam || {};
  const playersByKey = new Map();

  function getPlayer(name, team) {
    const playerName = resolvePlayerNameForTeam(name, team);
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

  const matchStatus = String(innings[0]?.status || "");
  const isAbandonedOrNoResult = /(abandoned|no result|no play|without a ball bowled)/i.test(matchStatus);
  const isCompletedMatch = /(won by|match tied|tied)/i.test(matchStatus);
  const isLiveMatch = !isAbandonedOrNoResult && !isCompletedMatch;
  if (isAbandonedOrNoResult) {
    const teamsInMatch = Array.from(
      new Set(
        innings.flatMap((inning) => [inning.battingTeam, inning.bowlingTeam]).filter(Boolean)
      )
    );

    teamsInMatch.forEach((teamCode) => {
      const currentPlayers = Array.from(playersByKey.values()).filter((player) => player.team === teamCode);
      if (currentPlayers.length >= 11) {
        return;
      }

      const explicitPlayingXI = playingXIByTeam[String(teamCode || "").toUpperCase()] || [];
      const fallbackRoster = teamPlayerRegistry[String(teamCode || "").toUpperCase()] || [];
      const candidateNames =
        explicitPlayingXI.length > 0 ? explicitPlayingXI : fallbackRoster;

      candidateNames.forEach((rosterPlayerName) => {
        const playersForTeam = Array.from(playersByKey.values()).filter((player) => player.team === teamCode);
        if (playersForTeam.length >= 11) {
          return;
        }

        getPlayer(rosterPlayerName, teamCode);
      });
    });
  }

  const normalizedPlayingXISets = new Map();
  const resolvedPlayingXIByTeam = new Map();
  Object.entries(playingXIByTeam).forEach(([teamCode, names]) => {
    const team = String(teamCode || "").toUpperCase();
    const roster = teamPlayerRegistry[team] || [];
    const normalizedSet = new Set();
    const usedRosterNames = new Set();
    const unresolvedMentions = [];
    let resolvedCount = 0;
    const resolvedRosterNames = [];

    (names || []).forEach((name) => {
      const resolvedName = resolveTeamPlayerName(team, name);
      if (resolvedName) {
        const normalizedResolvedName = normalizeNameForMatch(resolvedName);
        if (!usedRosterNames.has(normalizedResolvedName)) {
          usedRosterNames.add(normalizedResolvedName);
          normalizedSet.add(normalizedResolvedName);
          resolvedRosterNames.push(resolvedName);
          resolvedCount += 1;
          return;
        }
      }

      unresolvedMentions.push(name);
    });

    const unresolvedByMention = new Map();
    unresolvedMentions.forEach((mention) => {
      const key = normalizeNameForMatch(mention);
      if (!key) {
        return;
      }

      if (!unresolvedByMention.has(key)) {
        unresolvedByMention.set(key, 0);
      }
      unresolvedByMention.set(key, unresolvedByMention.get(key) + 1);
    });

    unresolvedByMention.forEach((count, mentionKey) => {
      const mentionTokens = mentionKey.split(" ").filter(Boolean);
      if (mentionTokens.length < 2) {
        return;
      }

      const mentionFirst = mentionTokens[0];
      const mentionLast = mentionTokens[mentionTokens.length - 1];
      const candidateRoster = roster.filter((rosterName) => {
        const normalizedRosterName = normalizeNameForMatch(rosterName);
        if (usedRosterNames.has(normalizedRosterName)) {
          return false;
        }

        const rosterTokens = normalizedRosterName.split(" ").filter(Boolean);
        if (rosterTokens.length < 2) {
          return false;
        }

        const rosterFirst = rosterTokens[0];
        const rosterLast = rosterTokens[rosterTokens.length - 1];
        const firstMatches =
          mentionFirst.length === 1
            ? rosterFirst.startsWith(mentionFirst)
            : rosterFirst === mentionFirst;

        return firstMatches && rosterLast === mentionLast;
      });

      if (candidateRoster.length !== count) {
        return;
      }

      candidateRoster
        .sort((first, second) => first.localeCompare(second))
        .forEach((resolvedRosterName) => {
          const normalizedResolvedName = normalizeNameForMatch(resolvedRosterName);
          usedRosterNames.add(normalizedResolvedName);
          normalizedSet.add(normalizedResolvedName);
          resolvedRosterNames.push(resolvedRosterName);
          resolvedCount += 1;
        });
    });

    // Guardrail: only trust Match info XI when names mostly resolve to this team.
    // This prevents accidental cross-team extraction from UI tab glitches.
    if (resolvedCount < 9 || normalizedSet.size < 9) {
      return;
    }

    if (normalizedSet.size > 0) {
      normalizedPlayingXISets.set(String(teamCode || "").toUpperCase(), normalizedSet);
      resolvedPlayingXIByTeam.set(String(teamCode || "").toUpperCase(), resolvedRosterNames);
    }
  });

  if (isLiveMatch && resolvedPlayingXIByTeam.size > 0) {
    resolvedPlayingXIByTeam.forEach((names, teamCode) => {
      names.forEach((playerName) => {
        getPlayer(playerName, teamCode);
      });
    });
  }

  const players = mergeDuplicatePlayersWithinMatch(Array.from(playersByKey.values()));

  if (normalizedPlayingXISets.size > 0) {
    players.forEach((player) => {
      const teamSet = normalizedPlayingXISets.get(String(player.team || "").toUpperCase());
      if (teamSet && teamSet.size >= 10) {
        const hasMatchActivity =
          player.runs > 0 ||
          player.ballsFaced > 0 ||
          player.fours > 0 ||
          player.sixes > 0 ||
          player.wickets > 0 ||
          player.oversBowled > 0 ||
          player.maidenOvers > 0 ||
          player.runsConceded > 0 ||
          player.catches > 0 ||
          player.stumpings > 0 ||
          player.directRunOuts > 0 ||
          player.indirectRunOuts > 0 ||
          player.lbwBowledWickets > 0 ||
          player.isOutForDuck;

        player.inPlayingXI =
          teamSet.has(normalizeNameForMatch(player.name)) || hasMatchActivity;
      }
    });
  }

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
