const defaultOwners = [
  {
    id: 1,
    name: "Aditya",
    playerCount: 15,
    squadPlayerNames: [
      "Ishan Kishan",
      "Jos Buttler",
      "Angkrish Raghuvanshi",
      "Dewald Brevis",
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
      "KL Rahul",
      "Tim Seifert",
      "Finn Allen",
      "Nicholas Pooran",
      "Devdutt Padikkal",
      "Tilak Varma",
      "Kagiso Rabada",
      "Mohammad Shami",
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
      "Sanju Samson",
      "Yashasvi Jaiswal",
      "Sai Sudharsan",
      "Quinton de Kock",
      "Ayush Mhatre",
      "Ryan Rickelton",
      "Ravindra Jadeja",
      "Tim David",
      "Ayush Badoni",
      "Vipraj Nigam",
      "Avesh Khan",
      "Matt Henry",
      "Sai Kishore",
      "T Natarajan"
    ]
  },
  {
    id: 5,
    name: "Sai",
    playerCount: 13,
    squadPlayerNames: [
      "Rohit Sharma",
      "Phil Salt",
      "Prabhsimran Singh",
      "Rishabh Pant",
      "Shivam Dube",
      "Rinku Singh",
      "Jitesh Sharma",
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
      "Dhruv Jurel",
      "Prashant Veer",
      "Shashank Singh",
      "Romario Shepherd",
      "Marco Jansen",
      "Lungi Ngidi",
      "Digvesh Singh"
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
      "Jos Buttler",
      "Ravi Bishnoi",
      "Angkrish Raghuvanshi",
      "Sanju Samson",
      "Ayush Mhatre",
      "Pathum Nissanka",
      "Shivam Dube",
      "Rinku Singh",
      "Kagiso Rabada",
      "Yuzvendra Chahal",
      "Shimron Hetmyer",
      "Arshdeep Singh",
      "Nehal Wadhera",
      "Jasprit Bumrah"
    ]
  },
  {
    id: 2,
    name: "Kamal",
    playerCount: 16,
    squadPlayerNames: [
      "Rajat Patidar",
      "Heinrich Klaasen",
      "Shubman Gill",
      "Ryan Rickelton",
      "Vaibhav Arora",
      "Sandeep Sharma",
      "T Natarajan",
      "Axar Patel",
      "Kuldeep Yadav",
      "Tilak Varma",
      "Ruturaj Gaikwad",
      "Dewald Brevis",
      "Prashant Veer",
      "Varun Chakaravarthy",
      "Quinton de Kock",
      "Nathan Ellis"
    ]
  },
  {
    id: 3,
    name: "Bharath",
    playerCount: 16,
    squadPlayerNames: [
      "Virat Kohli",
      "Vaibhav Sooryavanshi",
      "Sai Sudharsan",
      "Priyansh Arya",
      "Jitesh Sharma",
      "Shashank Singh",
      "Marco Jansen",
      "Mohammed Siraj",
      "Mitchell Santner",
      "Matt Henry",
      "Vipraj Nigam",
      "Shahrukh Khan",
      "MS Dhoni",
      "Abishek Porel",
      "Will Jacks",
      "Yash Dayal"
    ]
  },
  {
    id: 4,
    name: "Sriram",
    playerCount: 13,
    squadPlayerNames: [
      "Ishan Kishan",
      "Ravindra Jadeja",
      "Krunal Pandya",
      "Sherfane Rutherford",
      "Mitchell Marsh",
      "Suryakumar Yadav",
      "Noor Ahmad",
      "Nicholas Pooran",
      "Khaleel Ahmed",
      "Auqib Nabi",
      "Sai Kishore",
      "Jason Holder",
      "Matheesha Pathirana"
    ]
  },
  {
    id: 5,
    name: "Subhash",
    playerCount: 13,
    squadPlayerNames: [
      "Yashasvi Jaiswal",
      "Prabhsimran Singh",
      "Abhishek Sharma",
      "Rohit Sharma",
      "Lungi Ngidi",
      "Mohammad Shami",
      "David Miller",
      "Cameron Green",
      "Digvesh Singh",
      "Nitish Rana",
      "Trent Boult",
      "Sam Curran",
      "Pat Cummins"
    ]
  },
  {
    id: 6,
    name: "Suresh",
    playerCount: 15,
    squadPlayerNames: [
      "Dhruv Jurel",
      "Prasidh Krishna",
      "Phil Salt",
      "Bhuvneshwar Kumar",
      "Ajinkya Rahane",
      "Aiden Markram",
      "Washington Sundar",
      "Travis Head",
      "Sunil Narine",
      "Finn Allen",
      "Josh Hazlewood",
      "Deepak Chahar",
      "Marcus Stoinis",
      "Harshal Patel",
      "Mitchell Starc"
    ]
  },
  {
    id: 7,
    name: "Susheel",
    playerCount: 15,
    squadPlayerNames: [
      "Nitish Kumar Reddy",
      "Devdutt Padikkal",
      "Jofra Archer",
      "Tim David",
      "Shreyas Iyer",
      "Rishabh Pant",
      "Rashid Khan",
      "Tristan Stubbs",
      "KL Rahul",
      "Hardik Pandya",
      "Riyan Parag",
      "Suyash Sharma",
      "Venkatesh Iyer",
      "Liam Livingstone",
      "Lockie Ferguson"
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

