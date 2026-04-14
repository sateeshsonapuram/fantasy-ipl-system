const teamPlayerRegistry = require("../data/teamPlayerRegistry");

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\((wk|c)\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toTitleCase(value) {
  const titled = String(value || "").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return titled.replace(/\(Wk\)/g, "(WK)").replace(/\(C\)/g, "(C)");
}

function tokenize(value) {
  return normalizeName(value).split(" ").filter(Boolean);
}

function buildTeamIndex(roster) {
  return (roster || []).map((name) => {
    const displayName = toTitleCase(name);
    const tokens = tokenize(name);
    return {
      displayName,
      normalized: tokens.join(" "),
      tokens,
      first: tokens[0] || "",
      last: tokens[tokens.length - 1] || ""
    };
  });
}

function resolveTeamPlayerName(teamCode, rawName) {
  const team = String(teamCode || "").toUpperCase();
  const roster = buildTeamIndex(teamPlayerRegistry[team]);
  const mentionTokens = tokenize(rawName);

  if (roster.length === 0 || mentionTokens.length === 0) {
    return null;
  }

  const mention = mentionTokens.join(" ");

  const exact = roster.find((player) => player.normalized === mention);
  if (exact) {
    return exact.displayName;
  }

  if (mentionTokens.length >= 2) {
    const mentionFirst = mentionTokens[0];
    const mentionLast = mentionTokens[mentionTokens.length - 1];
    const fullCandidates = roster.filter((player) => {
      if (!player.last || player.last !== mentionLast) {
        return false;
      }

      return player.first === mentionFirst || player.first.startsWith(mentionFirst);
    });

    if (fullCandidates.length === 1) {
      return fullCandidates[0].displayName;
    }
  }

  if (mentionTokens.length === 1) {
    const token = mentionTokens[0];
    const lastNameCandidates = roster.filter((player) => player.last === token);
    if (lastNameCandidates.length === 1) {
      return lastNameCandidates[0].displayName;
    }

    const tokenCandidates = roster.filter((player) => player.tokens.includes(token));
    if (tokenCandidates.length === 1) {
      return tokenCandidates[0].displayName;
    }
  }

  return null;
}

module.exports = {
  resolveTeamPlayerName,
  teamPlayerRegistry
};