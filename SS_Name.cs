using System;
using System.Collections.Generic;

namespace Stellar_Sprites
{
    public static class SS_Name
    {
        private static SS_Random random;

        public static string GetMaleName(int seed)
        {
            random = new SS_Random(seed);

            string honk = string.Empty;

            int rFirst = 0;
            int rLast = 0;
            int rTitle = 0;

            rTitle = random.Range(0, title.Length - 1);
            honk = title[rTitle];

            rFirst = random.Range(0, firstMale.Length - 1);
            honk += " " + firstMale[rFirst];

            rLast = random.Range(0, lastName.Length - 1);
            honk += " " + lastName[rLast];

            return honk;
        }

        public static string GetFemaleName(int seed)
        {
            random = new SS_Random(seed);

            string honk = string.Empty;

            int rFirst = 0;
            int rLast = 0;
            int rTitle = 0;

            rTitle = random.Range(0, title.Length - 1);
            honk = title[rTitle];

            rFirst = random.Range(0, firstFemale.Length - 1);
            honk += " " + firstFemale[rFirst];

            rLast = random.Range(0, lastName.Length - 1);
            honk += " " + lastName[rLast];

            return honk;
        }

        public static string GetMaleOrFemaleName(int seed)
        {
            random = new SS_Random(seed);

            string honk = string.Empty;

            int maleOrFemale = random.Range(0, 1);
            int rFirst = 0;
            int rLast = 0;
            int rTitle = 0;

            rTitle = random.Range(0, title.Length - 1);
            honk = title[rTitle];

            if (maleOrFemale == 0)
            {
                rFirst = random.Range(0, firstMale.Length - 1);
                honk += " " + firstMale[rFirst];
            }
            else
            {
                rFirst = random.Range(0, firstFemale.Length - 1);
                honk += " " + firstFemale[rFirst];
            }
            rLast = random.Range(0, lastName.Length - 1);
            honk += " " + lastName[rLast];

            return honk;
        }

        private static string[] title = new string[] {
            "Captain",
            "Lieutenant",
            "Sargent",
            "Private",
            "Corporeal"
        };

        private static string[] firstMale = new string[] {
            "Michael",
            "Benjamin",
            "Kevin",
            "Brandon",
            "Owen",
            "Anthony",
            "Steven",
            "Nicholas",
            "Julian",
            "Evan",
            "Thomas",
            "Blake",
            "Stephen",
            "Christopher",
            "Dominic",
            "Robert",
            "Cameron",
            "Peter",
            "David",
            "Austin",
            "Joe",
            "Colin",
            "Jacob",
            "John",
            "Edward",
            "Sam",
            "Eric",
            "Gordon",
            "Warren",
            "Sean",
            "Liam",
            "Carl",
            "William",
            "Adam",
            "Victor",
            "Tim",
            "Charles",
            "Frank",
            "Dylan",
            "Jake",
            "Ian",
            "Justin",
            "Alan",
            "Neil",
            "Alexander",
            "Simon",
            "Stewart",
            "Richard",
            "Matt",
            "Oliver",
            "Adrian",
            "Ryan",
            "Max",
            "Christian",
            "Gavin",
            "Luke",
            "Joshua",
            "Brian",
            "Piers",
            "Keith",
            "Phil",
            "Boris",
            "Isaac",
            "Connor",
            "Paul",
            "Harry",
            "Jonathan",
            "James",
            "Trevor",
            "Joseph",
            "Jason",
            "Nathan",
            "Andrew",
            "Leonard",
            "Dan",
            "Lucas",
            "Jack",
            "Sebastian"
        };

        private static string[] firstFemale = new string[] {
            "Amanda",
            "Karen",
            "Amy",
            "Heather",
            "Ella",
            "Stephanie",
            "Gabrielle",
            "Theresa",
            "Lily",
            "Anne",
            "Felicity",
            "Donna",
            "Wendy",
            "Fiona",
            "Bella",
            "Alison",
            "Diane",
            "Maria",
            "Megan",
            "Tracey",
            "Caroline",
            "Alexandra",
            "Olivia",
            "Elizabeth",
            "Joan",
            "Angela",
            "Anna",
            "Chloe",
            "Molly",
            "Samantha",
            "Una",
            "Madeleine",
            "Sonia",
            "Sarah",
            "Emily",
            "Rebecca",
            "Lisa",
            "Rose",
            "Claire",
            "Andrea",
            "Ruth",
            "Hannah",
            "Abigail",
            "Vanessa",
            "Nicola",
            "Rachel",
            "Jennifer",
            "Lauren",
            "Michelle",
            "Wanda",
            "Irene",
            "Emma",
            "Grace",
            "Lillian",
            "Jane",
            "Katherine",
            "Sue",
            "Mary",
            "Yvonne",
            "Kimberly",
            "Jasmine",
            "Melanie",
            "Audrey",
            "Jan",
            "Zoe",
            "Virginia",
            "Penelope",
            "Victoria",
            "Amelia",
            "Faith",
            "Joanne",
            "Kylie",
            "Carol",
            "Bernadette",
            "Julia",
            "Sally",
            "Natalie",
            "Carolyn",
            "Pippa",
            "Diana",
            "Leah",
            "Ava",
            "Dorothy",
            "Deirdre",
            "Sophie",
            "Jessica"
        };

        private static string[] lastName = new string[] {
            "Abraham",
            "Allan",
            "Alsop",
            "Anderson",
            "Arnold",
            "Avery",
            "Bailey",
            "Baker",
            "Ball",
            "Bell",
            "Berry",
            "Black",
            "Blake",
            "Bond",
            "Bower",
            "Brown",
            "Buckland",
            "Burgess",
            "Butler",
            "Cameron",
            "Campbell",
            "Carr",
            "Chapman",
            "Churchill",
            "Clark",
            "Clarkson",
            "Coleman",
            "Cornish",
            "Davidson",
            "Davies",
            "Dickens",
            "Dowd",
            "Duncan",
            "Dyer",
            "Edmunds",
            "Ellison",
            "Ferguson",
            "Fisher",
            "Forsyth",
            "Fraser",
            "Gibson",
            "Gill",
            "Glover",
            "Graham",
            "Grant",
            "Gray",
            "Greene",
            "Hamilton",
            "Hardacre",
            "Harris",
            "Hart",
            "Hemmings",
            "Henderson",
            "Hill",
            "Hodges",
            "Howard",
            "Hudson",
            "Hughes",
            "Hunter",
            "Ince",
            "Jackson",
            "James",
            "Johnston",
            "Jones",
            "Kelly",
            "Kerr",
            "King",
            "Knox",
            "Lambert",
            "Langdon",
            "Lawrence",
            "Lee",
            "Lewis",
            "Lyman",
            "MacDonald",
            "Mackay",
            "Mackenzie",
            "MacLeod",
            "Manning",
            "Marshall",
            "Martin",
            "Mathis",
            "May",
            "McDonald",
            "McGrath",
            "McLean",
            "Metcalfe",
            "Miller",
            "Mills",
            "Mitchell",
            "Morgan",
            "Morrison",
            "Murray",
            "Nash",
            "Newman",
            "Nolan",
            "North",
            "Ogden",
            "Oliver",
            "Paige",
            "Parr",
            "Parsons",
            "Paterson",
            "Payne",
            "Peake",
            "Peters",
            "Piper",
            "Poole",
            "Powell",
            "Pullman",
            "Quinn",
            "Rampling",
            "Randall",
            "Rees",
            "Reid",
            "Roberts",
            "Robertson",
            "Ross",
            "Russell",
            "Rutherford",
            "Sanderson",
            "Scott",
            "Sharp",
            "Short",
            "Simpson",
            "Skinner",
            "Slater",
            "Smith",
            "Springer",
            "Stewart",
            "Sutherland",
            "Taylor",
            "Terry",
            "Thomson",
            "Tucker",
            "Turner",
            "Underwood",
            "Vance",
            "Vaughan",
            "Walker",
            "Wallace",
            "Walsh",
            "Watson",
            "Welch",
            "White",
            "Wilkins",
            "Wilson",
            "Wright",
            "Young"
        };
    }
}
