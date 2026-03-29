const fs = require("fs");
const path = require("path");

const generatedMatchesPath = path.resolve(__dirname, "generated", "matches.json");

const seededMatches = [
  {
    id: 1,
    match: "Mumbai Indians vs Chennai Super Kings",
    status: "Completed",
    format: "T20",
    players: [
      {
        id: 1,
        name: "Rohit Sharma",
        team: "Mumbai Indians",
        role: "batter",
        inPlayingXI: true,
        runs: 42,
        ballsFaced: 28,
        fours: 5,
        sixes: 2,
        isOutForDuck: false,
        wickets: 0,
        maidenOvers: 0,
        lbwBowledWickets: 0,
        catches: 1,
        stumpings: 0,
        directRunOuts: 0,
        indirectRunOuts: 0,
        oversBowled: 0,
        runsConceded: 0
      },
      {
        id: 2,
        name: "Suryakumar Yadav",
        team: "Mumbai Indians",
        role: "batter",
        inPlayingXI: true,
        runs: 63,
        ballsFaced: 36,
        fours: 7,
        sixes: 3,
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
      },
      {
        id: 3,
        name: "Jasprit Bumrah",
        team: "Mumbai Indians",
        role: "bowler",
        inPlayingXI: true,
        runs: 5,
        ballsFaced: 4,
        fours: 1,
        sixes: 0,
        isOutForDuck: false,
        wickets: 3,
        maidenOvers: 1,
        lbwBowledWickets: 1,
        catches: 0,
        stumpings: 0,
        directRunOuts: 0,
        indirectRunOuts: 0,
        oversBowled: 4,
        runsConceded: 18
      },
      {
        id: 4,
        name: "Ruturaj Gaikwad",
        team: "Chennai Super Kings",
        role: "batter",
        inPlayingXI: true,
        runs: 51,
        ballsFaced: 40,
        fours: 4,
        sixes: 2,
        isOutForDuck: false,
        wickets: 0,
        maidenOvers: 0,
        lbwBowledWickets: 0,
        catches: 1,
        stumpings: 0,
        directRunOuts: 0,
        indirectRunOuts: 0,
        oversBowled: 0,
        runsConceded: 0
      },
      {
        id: 5,
        name: "Ravindra Jadeja",
        team: "Chennai Super Kings",
        role: "all-rounder",
        inPlayingXI: true,
        runs: 18,
        ballsFaced: 12,
        fours: 1,
        sixes: 1,
        isOutForDuck: false,
        wickets: 2,
        maidenOvers: 0,
        lbwBowledWickets: 1,
        catches: 2,
        stumpings: 0,
        directRunOuts: 1,
        indirectRunOuts: 0,
        oversBowled: 4,
        runsConceded: 24
      },
      {
        id: 6,
        name: "MS Dhoni",
        team: "Chennai Super Kings",
        role: "wicketkeeper",
        inPlayingXI: true,
        runs: 12,
        ballsFaced: 6,
        fours: 1,
        sixes: 1,
        isOutForDuck: false,
        wickets: 0,
        maidenOvers: 0,
        lbwBowledWickets: 0,
        catches: 1,
        stumpings: 1,
        directRunOuts: 0,
        indirectRunOuts: 0,
        oversBowled: 0,
        runsConceded: 0
      }
    ]
  },
  {
    id: 2,
    match: "Royal Challengers Bengaluru vs Rajasthan Royals",
    status: "Completed",
    format: "T20",
    players: [
      {
        id: 8,
        name: "Virat Kohli",
        team: "Royal Challengers Bengaluru",
        role: "batter",
        inPlayingXI: true,
        runs: 69,
        ballsFaced: 38,
        fours: 5,
        sixes: 5,
        isOutForDuck: false,
        wickets: 0,
        maidenOvers: 0,
        lbwBowledWickets: 0,
        catches: 1,
        stumpings: 0,
        directRunOuts: 0,
        indirectRunOuts: 0,
        oversBowled: 0,
        runsConceded: 0
      },
      {
        id: 7,
        name: "Jacob Duffy",
        team: "Royal Challengers Bengaluru",
        role: "bowler",
        inPlayingXI: true,
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        isOutForDuck: false,
        wickets: 3,
        maidenOvers: 0,
        lbwBowledWickets: 0,
        catches: 0,
        stumpings: 0,
        directRunOuts: 0,
        indirectRunOuts: 0,
        oversBowled: 4,
        runsConceded: 22
      },
      {
        id: 9,
        name: "Sanju Samson",
        team: "Rajasthan Royals",
        role: "wicketkeeper",
        inPlayingXI: true,
        runs: 34,
        ballsFaced: 22,
        fours: 3,
        sixes: 2,
        isOutForDuck: false,
        wickets: 0,
        maidenOvers: 0,
        lbwBowledWickets: 0,
        catches: 1,
        stumpings: 0,
        directRunOuts: 0,
        indirectRunOuts: 0,
        oversBowled: 0,
        runsConceded: 0
      },
      {
        id: 10,
        name: "Yashasvi Jaiswal",
        team: "Rajasthan Royals",
        role: "batter",
        inPlayingXI: true,
        runs: 81,
        ballsFaced: 47,
        fours: 8,
        sixes: 4,
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
      }
    ]
  },
  {
    id: 3,
    match: "Mumbai Indians vs Royal Challengers Bengaluru",
    status: "Completed",
    format: "T20",
    players: [
      {
        id: 1,
        name: "Rohit Sharma",
        team: "Mumbai Indians",
        role: "batter",
        inPlayingXI: true,
        runs: 74,
        ballsFaced: 44,
        fours: 6,
        sixes: 4,
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
      },
      {
        id: 3,
        name: "Jasprit Bumrah",
        team: "Mumbai Indians",
        role: "bowler",
        inPlayingXI: true,
        runs: 1,
        ballsFaced: 2,
        fours: 0,
        sixes: 0,
        isOutForDuck: false,
        wickets: 2,
        maidenOvers: 0,
        lbwBowledWickets: 1,
        catches: 1,
        stumpings: 0,
        directRunOuts: 0,
        indirectRunOuts: 0,
        oversBowled: 4,
        runsConceded: 26
      },
      {
        id: 8,
        name: "Virat Kohli",
        team: "Royal Challengers Bengaluru",
        role: "batter",
        inPlayingXI: true,
        runs: 58,
        ballsFaced: 35,
        fours: 6,
        sixes: 2,
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
      },
      {
        id: 5,
        name: "Ravindra Jadeja",
        team: "Chennai Super Kings",
        role: "all-rounder",
        inPlayingXI: true,
        runs: 33,
        ballsFaced: 19,
        fours: 2,
        sixes: 2,
        isOutForDuck: false,
        wickets: 1,
        maidenOvers: 0,
        lbwBowledWickets: 0,
        catches: 1,
        stumpings: 0,
        directRunOuts: 0,
        indirectRunOuts: 0,
        oversBowled: 4,
        runsConceded: 29
      }
    ]
  }
];

function readGeneratedMatches() {
  if (!fs.existsSync(generatedMatchesPath)) {
    return [];
  }

  try {
    const fileContents = fs.readFileSync(generatedMatchesPath, "utf8");
    const parsedData = JSON.parse(fileContents);

    return Array.isArray(parsedData.matches) ? parsedData.matches : [];
  } catch (error) {
    console.warn(`Unable to read generated matches: ${error.message}`);
    return [];
  }
}

function fetchMatches() {
  const generatedMatches = readGeneratedMatches();

  if (generatedMatches.length > 0) {
    return generatedMatches;
  }

  return seededMatches;
}

module.exports = {
  fetchMatches
};
