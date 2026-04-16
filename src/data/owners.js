const defaultOwners = [
  {
    id: 1,
    name: "Aditya",
    playerCount: 15,
    squadPlayerNames: [
      "Ishan Kishan(WK)",
      "Jos Buttler(WK)",
      "Angkrish Raghuvanshi(WK)",
      "D Brevis",
      "Nitish Rana",
      "Nehal Wadhera",
      "Glenn Phillips",
      "Abdul Samad",
      "Axar Patel",
      "Marcus Stoinis",
      "Mitchell Santner",
      "Arshdeep Singh",
      "Kuldeep Yadav",
      "Tushar Deshpande",
      "Mayank Yadav"
    ]
  },
  {
    id: 2,
    name: "Jagga",
    playerCount: 14,
    squadPlayerNames: [
      "Ajinkya Rahane",
      "Aiden Markram",
      "Suryakumar Yadav",
      "Riyan Parag",
      "Shimron Hetmyer",
      "Tristan Stubbs",
      "Cameron Green",
      "David Miller",
      "MS Dhoni",
      "Rashid Khan",
      "Mitchell Starc",
      "Matheesha Pathirana",
      "Ravi Bishnoi",
      "Lockie Ferguson"
    ]
  },
  {
    id: 3,
    name: "Kola",
    playerCount: 12,
    squadPlayerNames: [
      "Abhishek Sharma",
      "KL Rahul(WK)",
      "Tim Seifert",
      "Finn Allen",
      "Nicholas Pooran",
      "Devdutt Padikkal",
      "Tilak Varma",
      "Kagiso Rabada",
      "Mohammed Shami",
      "Varun Chakaravarthy",
      "Deepak Chahar",
      "Nathan Ellis"
    ]
  },
  {
    id: 4,
    name: "Kamal",
    playerCount: 14,
    squadPlayerNames: [
      "Sanju Samson(WK)",
      "Yashasvi Jaiswal",
      "B Sai Sudharsan",
      "Quinton De Kock",
      "Ayush Mhatre",
      "Ryan Rickelton(WK)",
      "Ravindra Jadeja",
      "Tim David",
      "Ayush Badoni",
      "Vipraj Nigam",
      "Avesh Khan",
      "Matt Henry",
      "R Sai Kishore",
      "T Natarajan"
    ]
  },
  {
    id: 5,
    name: "Sai",
    playerCount: 13,
    squadPlayerNames: [
      "Rohit Sharma",
      "Philip Salt",
      "Prabhsimran Singh(WK)",
      "Rishabh Pant(WK)",
      "Shivam Dube",
      "Rinku Singh",
      "Jitesh Sharma(WK)",
      "Shahrukh Khan",
      "Jasprit Bumrah",
      "Harshal Patel",
      "Suyash Sharma",
      "Jofra Archer",
      "Yash Dayal"
    ]
  },
  {
    id: 6,
    name: "Sateesh",
    playerCount: 14,
    squadPlayerNames: [
      "Virat Kohli",
      "Ruturaj Gaikwad",
      "Hardik Pandya",
      "Heinrich Klaasen",
      "Naman Dhir",
      "Pathum Nissanka",
      "Will Jacks",
      "Kartik Sharma",
      "Washington Sundar",
      "Yuzvendra Chahal",
      "Sandeep Sharma",
      "Mohammed Siraj",
      "Sam Curran",
      "Prasidh Krishna"
    ]
  },
  {
    id: 7,
    name: "Siva",
    playerCount: 11,
    squadPlayerNames: [
      "Vaibhav Sooryavanshi",
      "Shubman Gill",
      "Shreyas Iyer",
      "Travis Head",
      "Dhruv Jurel(WK)",
      "Prashant Veer",
      "Shashank Singh",
      "Romario Shepherd",
      "Marco Jansen",
      "Lungi Ngidi",
      "Digvesh Singh Rathi"
    ]
  },
  {
    id: 8,
    name: "Surya",
    playerCount: 13,
    squadPlayerNames: [
      "Mitchell Marsh",
      "Priyansh Arya",
      "Rajat Patidar",
      "Nitish Kumar Reddy",
      "Venkatesh Iyer",
      "Krunal Pandya",
      "Sunil Narine",
      "Noor Ahmad",
      "Trent Boult",
      "Bhuvneshwar Kumar",
      "Josh Hazlewood",
      "Khaleel Ahmed",
      "Vaibhav Arora"
    ]
  }
];

const alt12Owners = [
  {
    id: 1,
    name: "Sateesh",
    playerCount: 14,
    squadPlayerNames: [
      "Buttler",
      "Bishnoi",
      "Raghuvanshi",
      "Sanju Samson",
      "Ayush Mhatre",
      "Nissanka",
      "Dube",
      "Rinku",
      "Rabada",
      "Chahal",
      "Hetmyer",
      "Arshdeep",
      "Wadhera",
      "Bumrah"
    ]
  },
  {
    id: 2,
    name: "Kamal",
    playerCount: 16,
    squadPlayerNames: [
      "Patidar",
      "Klaasen",
      "Gill",
      "Rickelton",
      "V Arora",
      "Sandeep Sharma",
      "T Natarajan",
      "Axar",
      "Kuldeep",
      "Tilak",
      "Ruturaj",
      "Brevis",
      "Prashant Veer",
      "Varun",
      "Quinton de Kock",
      "Ellis"
    ]
  },
  {
    id: 3,
    name: "Bharath",
    playerCount: 16,
    squadPlayerNames: [
      "Kohli",
      "Vaibhav Sooryavanshi",
      "Sudharsan",
      "Priyansh",
      "Jitesh",
      "Shashank",
      "Jansen",
      "Siraj",
      "Santner",
      "M Henry",
      "Vipraj",
      "Shahrukh",
      "Dhoni",
      "Abishek Porel",
      "Will Jacks",
      "Dayal"
    ]
  },
  {
    id: 4,
    name: "Sriram",
    playerCount: 13,
    squadPlayerNames: [
      "Ishan",
      "Jadeja",
      "Krunal",
      "Sherfane Rutherford",
      "Marsh",
      "Suryakumar Yadav",
      "Noor",
      "Pooran",
      "Khaleel",
      "Auqib Nabi",
      "R Sai Kishore",
      "Jason Holder",
      "Pathirana"
    ]
  },
  {
    id: 5,
    name: "Subhash",
    playerCount: 13,
    squadPlayerNames: [
      "Jaiswal",
      "Prabhsimran",
      "Abhishek",
      "Rohit",
      "Ngidi",
      "Mohammad Shami",
      "Miller",
      "Green",
      "Digvesh Singh",
      "Nitish Rana",
      "Boult",
      "Sam Curran",
      "Cummins"
    ]
  },
  {
    id: 6,
    name: "Suresh",
    playerCount: 15,
    squadPlayerNames: [
      "Jurel",
      "Prasidh",
      "Phil Salt",
      "Bhuvneshwar Kumar",
      "Rahane",
      "Markram",
      "Washington",
      "Head",
      "Narine",
      "Finn Allen",
      "Hazlewood",
      "Deepak",
      "Stoinis",
      "Harshal",
      "Starc"
    ]
  },
  {
    id: 7,
    name: "Susheel",
    playerCount: 15,
    squadPlayerNames: [
      "Nitish Reddy",
      "Padikkal",
      "Jofra",
      "Tim David",
      "Shreyas Iyer",
      "Pant",
      "Rashid Khan",
      "Stubbs",
      "KL Rahul",
      "Hardik",
      "Parag",
      "Suyash",
      "Venkatesh Iyer",
      "Livingstone",
      "Ferguson"
    ]
  }
];

const ownerSets = {
  default: defaultOwners,
  alt12: alt12Owners
};

function cloneOwners(owners) {
  return owners.map((owner) => ({
    ...owner,
    squadPlayerNames: [...owner.squadPlayerNames]
  }));
}

function fetchOwners() {
  const ownerSet = String(process.env.OWNER_SET || "default").trim().toLowerCase();
  return cloneOwners(ownerSets[ownerSet] || ownerSets.default);
}

module.exports = {
  fetchOwners
};

