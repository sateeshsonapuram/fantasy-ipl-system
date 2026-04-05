const { calculateTeamPoints } = require("./teamSelector");

const playerAliases = {
  boult: "Trent Boult",
  bumrah: "Jasprit Bumrah",
  bhuvi: "Bhuvneshwar Kumar",
  curran: "Sam Curran",
  dhoni: "MS Dhoni",
  dube: "Shivam Dube",
  gill: "Shubman Gill",
  hardik: "Hardik Pandya",
  hazlewood: "Josh Hazlewood",
  head: "Travis Head",
  jacks: "Will Jacks",
  jadeja: "Ravindra Jadeja",
  jaiswal: "Yashasvi Jaiswal",
  jofra: "Jofra Archer",
  klaseen: "Heinrich Klaasen",
  kohli: "Virat Kohli",
  narine: "Sunil Narine",
  nattu: "T Natarajan",
  parag: "Riyan Parag",
  pathirana: "Matheesha Pathirana",
  rabada: "Kagiso Rabada",
  rashid: "Rashid Khan",
  rickelton: "Ryan Rickelton",
  rohit: "Rohit Sharma",
  ruturaj: "Ruturaj Gaikwad",
  salt: "Phil Salt",
  samad: "Abdul Samad",
  sandeep: "Sandeep Sharma",
  samsun: "Sanju Samson",
  siraj: "Mohammed Siraj",
  sky: "Suryakumar Yadav",
  starc: "Mitchell Starc",
  stubbs: "Tristan Stubbs",
  suryavanshi: "Vaibhav Sooryavanshi"
};

const playerTeamHints = {
  abhishek: "SRH",
  arshdeep: "PBKS",
  auqib: "DC",
  avesh: "LSG",
  badoni: "LSG",
  bishnoi: "RR",
  boult: "MI",
  brevis: "CSK",
  bhuvi: "RCB",
  bumrah: "MI",
  buttler: "GT",
  chahal: "PBKS",
  cummins: "SRH",
  dayal: "RCB",
  "de kock": "MI",
  deepak: "MI",
  dhoni: "CSK",
  digvesh: "LSG",
  dube: "CSK",
  ellis: "RR",
  ferguson: "PBKS",
  gill: "GT",
  green: "KKR",
  hardik: "MI",
  harshal: "SRH",
  hazlewood: "RCB",
  head: "SRH",
  henry: "CSK",
  hetmyer: "RR",
  holder: "GT",
  ishan: "SRH",
  jacks: "MI",
  jadeja: "RR",
  jaiswal: "RR",
  jansen: "PBKS",
  jitesh: "RCB",
  jofra: "RR",
  jurel: "RR",
  "kartik sharma": "CSK",
  khaleel: "CSK",
  klaseen: "SRH",
  kohli: "RCB",
  krunal: "RCB",
  kuldeep: "DC",
  "kl rahul": "DC",
  livingstone: "SRH",
  markram: "LSG",
  marsh: "LSG",
  miller: "DC",
  "mayank yadav": "LSG",
  narine: "KKR",
  nattu: "DC",
  "naman dhir": "MI",
  "nitish rana": "DC",
  "nitish reddy": "SRH",
  nissanka: "DC",
  noor: "CSK",
  padikkal: "RCB",
  pant: "LSG",
  parag: "RR",
  pathirana: "KKR",
  patidar: "RCB",
  phillips: "GT",
  porel: "DC",
  pooran: "LSG",
  prabhsimran: "PBKS",
  prasidh: "GT",
  "prashant veer": "CSK",
  priyansh: "PBKS",
  rabada: "GT",
  raghuvanshi: "KKR",
  rahane: "KKR",
  rashid: "GT",
  rickelton: "MI",
  rinku: "KKR",
  rohit: "MI",
  ruturaj: "CSK",
  "sai kishore": "GT",
  salt: "RCB",
  samad: "LSG",
  "sam curran": "RR",
  sandeep: "RR",
  samsun: "CSK",
  "sanju samson": "CSK",
  santner: "MI",
  seifert: "KKR",
  shami: "LSG",
  shahrukh: "GT",
  shashank: "PBKS",
  shepherd: "RCB",
  shreyas: "PBKS",
  siraj: "GT",
  sky: "MI",
  starc: "DC",
  stoinis: "PBKS",
  stubbs: "DC",
  sudharsan: "GT",
  suryavanshi: "RR",
  suyash: "RCB",
  "tim david": "RCB",
  tilak: "MI",
  tushar: "RR",
  "v arora": "KKR",
  "vaibhav arora": "KKR",
  "venkatesh iyer": "RCB",
  vipraj: "DC",
  wadhera: "PBKS",
  washington: "GT",
  "will jacks": "MI",
  yashasvi: "RR"
};

function normalizePlayerName(name) {
  return String(name)
    .toLowerCase()
    .replace(/\((wk|c)\)/g, " ")
    .replace(/\bimpact\b/g, " ")
    .replace(/\bnot out\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getNameVariants(name) {
  const normalizedName = normalizePlayerName(name);
  const tokens = normalizedName.split(" ").filter(Boolean);
  const variants = new Set();

  if (!normalizedName) {
    return variants;
  }

  variants.add(normalizedName);

  if (tokens.length > 1) {
    variants.add(tokens[0]);
    variants.add(tokens[tokens.length - 1]);
    variants.add(`${tokens[0]} ${tokens[tokens.length - 1]}`);
    variants.add(`${tokens[0][0]} ${tokens[tokens.length - 1]}`);
    variants.add(tokens.slice(-2).join(" "));
  }

  const aliasName = playerAliases[normalizedName];
  if (aliasName) {
    variants.add(normalizePlayerName(aliasName));
  }

  return variants;
}

function buildPlayerIndexes(players) {
  const playersByExactName = new Map();
  const playersByVariant = new Map();

  players.forEach((player) => {
    if (player.isMissingStat) {
      return;
    }

    const exactName = normalizePlayerName(player.name);
    playersByExactName.set(exactName, player);

    const variants = getNameVariants(player.name);
    variants.forEach((variant) => {
      const existingPlayers = playersByVariant.get(variant) || [];
      existingPlayers.push(player);
      playersByVariant.set(variant, existingPlayers);
    });
  });

  return {
    playersByExactName,
    playersByVariant
  };
}

function matchPlayer(playerName, indexes) {
  const normalizedInputName = normalizePlayerName(playerName);
  const inputTokens = normalizedInputName.split(" ").filter(Boolean);
  const hasInitialToken = inputTokens.some((token) => token.length === 1);
  const exactMatch = indexes.playersByExactName.get(normalizedInputName);
  if (exactMatch) {
    return exactMatch;
  }

  const variants = getNameVariants(playerName);

  for (const variant of variants) {
    if (inputTokens.length > 1 && !variant.includes(" ") && !hasInitialToken) {
      continue;
    }

    const candidates = indexes.playersByVariant.get(variant) || [];

    if (candidates.length === 1) {
      return candidates[0];
    }

    const preferredCandidate = candidates.find(
      (candidate) =>
        normalizePlayerName(candidate.name).includes(normalizedInputName) ||
        normalizedInputName.includes(normalizePlayerName(candidate.name))
    );

    if (preferredCandidate) {
      return preferredCandidate;
    }
  }

  return undefined;
}

function resolveMissingPlayerTeam(playerName) {
  const normalizedInputName = normalizePlayerName(playerName);

  if (playerTeamHints[normalizedInputName]) {
    return playerTeamHints[normalizedInputName];
  }

  const aliasName = playerAliases[normalizedInputName];
  if (aliasName) {
    const normalizedAliasName = normalizePlayerName(aliasName);
    return playerTeamHints[normalizedAliasName] || "Unknown";
  }

  return "Unknown";
}

function calculateOwnerLeaderboard(owners, players, teamSize) {
  const indexes = buildPlayerIndexes(players);

  return owners
    .map((owner) => {
      const squadPlayers = owner.squadPlayerNames.map((playerName) => {
        const normalizedInputName = normalizePlayerName(playerName);
        const matchedPlayer = matchPlayer(playerName, indexes);

        if (matchedPlayer) {
          return matchedPlayer;
        }

        return {
          id: `missing-${owner.id}-${normalizedInputName}`,
          name: playerName,
          team: resolveMissingPlayerTeam(playerName),
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
