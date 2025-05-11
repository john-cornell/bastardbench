import { TestCase, TestCategory } from './llm';

export interface CrypticTest extends TestCase {
  category: TestCategory.CRYPTIC;
  answerLength: string;
  answer: string;
}

export const crypticTests = [
  {
    id: 'cryptic-1',
    name: "Cryptic Test 1",
    prompt: "With an elegant start, orchestrated demo turns out spectacular!",
    answerLength: "10",
    answer: "TREMENDOUS",
    expectedResult: "TREMENDOUS",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-2',
    name: "Cryptic Test 2",
    prompt: "Cash company in",
    answerLength: "4",
    answer: "COIN",
    expectedResult: "COIN",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-3',
    name: "Cryptic Test 3",
    prompt: "3 points are original",
    answerLength: "3",
    answer: "NEW",
    expectedResult: "NEW",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-4',
    name: "Cryptic Test 4",
    prompt: "A panicked retreat is scattered for the term of service",
    answerLength: "4",
    answer: "TOUR",
    expectedResult: "TOUR",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-5',
    name: "Cryptic Test 5",
    prompt: "Quiet, leave twice and yell",
    answerLength: "5,3",
    answer: "SHOUT OUT",
    expectedResult: "SHOUT OUT",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-6',
    name: "Cryptic Test 6",
    prompt: "Rest your head, take a tablet and cry out in pain",
    answerLength: "6",
    answer: "PILLOW",
    expectedResult: "PILLOW",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-7',
    name: "Cryptic Test 7",
    prompt: "You appear in QI with a revolutionary egg and bacon pie",
    answerLength: "6",
    answer: "QUICHE",
    expectedResult: "QUICHE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-8',
    name: "Cryptic Test 8",
    prompt: "Regularly put way around in",
    answerLength: "7",
    answer: "ROUTINE",
    expectedResult: "ROUTINE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-9',
    name: "Cryptic Test 9",
    prompt: "I like it, it starts as expected, then twisted tail",
    answerLength: "7",
    answer: "PARTIAL",
    expectedResult: "PARTIAL",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-10',
    name: "Cryptic Test 10",
    prompt: "Sharp incline reduces all energy to zero, producing a hunched demeanour",
    answerLength: "5",
    answer: "STOOP",
    expectedResult: "STOOP",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-11',
    name: "Cryptic Test 11",
    prompt: "A golfer cries out, lacking direction, thank you. Add a couple for the answer (but not the question)",
    answerLength: "5,3",
    answer: "FORTY TWO",
    expectedResult: "FORTY TWO",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-12',
    name: "Cryptic Test 12",
    prompt: "Brexit Gamble Confused Man",
    answerLength: "4",
    answer: "MALE",
    expectedResult: "MALE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-13',
    name: "Cryptic Test 13",
    prompt: "Man emerges when British exit disrupts gamble",
    answerLength: "4",
    answer: "MALE",
    expectedResult: "MALE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-14',
    name: "Cryptic Test 14",
    prompt: "Cut right in, a little blunt",
    answerLength: "4",
    answer: "CURT",
    expectedResult: "CURT",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-15',
    name: "Cryptic Test 15",
    prompt: "Zero year leads to wicked behavior",
    answerLength: "7",
    answer: "NAUGHTY",
    expectedResult: "NAUGHTY",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-16',
    name: "Cryptic Test 16",
    prompt: "Playback part to snag prey",
    answerLength: "4",
    answer: "TRAP",
    expectedResult: "TRAP",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-17',
    name: "Cryptic Test 17",
    prompt: "Ask me anything, politely abbreviated about state of matter",
    answerLength: "6",
    answer: "PLASMA",
    expectedResult: "PLASMA",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-18',
    name: "Cryptic Test 18",
    prompt: "Leafy course gets confused without old fashioned penny, it's a shame",
    answerLength: "4",
    answer: "ALAS",
    expectedResult: "ALAS",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-19',
    name: "Cryptic Test 19",
    prompt: "Unwanted plant changes direction and is renewed",
    answerLength: "4",
    answer: "SEED",
    expectedResult: "SEED",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-20',
    name: "Cryptic Test 20",
    prompt: "Southern crazy fool provides comfortable seating",
    answerLength: "4",
    answer: "SOFA",
    expectedResult: "SOFA",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-21',
    name: "Cryptic Test 21",
    prompt: "Restaurant needs direction to provide evening meal",
    answerLength: "6",
    answer: "DINNER",
    expectedResult: "DINNER",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-22',
    name: "Cryptic Test 22",
    prompt: "Butcher twigs to create exotic utensils",
    answerLength: "4,6",
    answer: "CHOP STICKS",
    expectedResult: "CHOP STICKS",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-23',
    name: "Cryptic Test 23",
    prompt: "Lather maker uses deceit with waste",
    answerLength: "7",
    answer: "SHAMPOO",
    expectedResult: "SHAMPOO",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-24',
    name: "Cryptic Test 24",
    prompt: "Fear mistake after cuppa",
    answerLength: "6",
    answer: "TERROR",
    expectedResult: "TERROR",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-25',
    name: "Cryptic Test 25",
    prompt: "Fraud snagged, without question, by southern statement of proof, not for the first time",
    answerLength: "6",
    answer: "SECOND",
    expectedResult: "SECOND",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-26',
    name: "Cryptic Test 26",
    prompt: "Beg first character in popular mixed fruit",
    answerLength: "6",
    answer: "APPEAL",
    expectedResult: "APPEAL",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-27',
    name: "Cryptic Test 27",
    prompt: "Proceed, fool",
    answerLength: "4",
    answer: "GOON",
    expectedResult: "GOON",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-28',
    name: "Cryptic Test 28",
    prompt: "Beer flavouring and northern whisky will have children jumping in joy",
    answerLength: "9",
    answer: "HOPSCOTCH",
    expectedResult: "HOPSCOTCH",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-29',
    name: "Cryptic Test 29",
    prompt: "Crazy bots powered up city",
    answerLength: "6",
    answer: "BOSTON",
    expectedResult: "BOSTON",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-30',
    name: "Cryptic Test 30",
    prompt: "Opt not to play cards marked badly and aged",
    answerLength: "4",
    answer: "FOLD",
    expectedResult: "FOLD",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-31',
    name: "Cryptic Test 31",
    prompt: "Space alien provides coverage",
    answerLength: "7",
    answer: "BLANKET",
    expectedResult: "BLANKET",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-32',
    name: "Cryptic Test 32",
    prompt: "Like greatest operating system, bad for the lungs",
    answerLength: "8",
    answer: "ASBESTOS",
    expectedResult: "ASBESTOS",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-33',
    name: "Cryptic Test 33",
    prompt: "Wends its way, directionless, muddled, without a straighten up",
    answerLength: "4",
    answer: "TIDY",
    expectedResult: "TIDY",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-34',
    name: "Cryptic Test 34",
    prompt: "Go around the French stare",
    answerLength: "4",
    answer: "OGLE",
    expectedResult: "OGLE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-35',
    name: "Cryptic Test 35",
    prompt: "Doesn't matter which surrounds unit of matter to create biological systems",
    answerLength: "7",
    answer: "ANATOMY",
    expectedResult: "ANATOMY",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-36',
    name: "Cryptic Test 36",
    prompt: "Two starters around initial huge moment of inspiration",
    answerLength: "3",
    answer: "AHA",
    expectedResult: "AHA",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-37',
    name: "Cryptic Test 37",
    prompt: "Positive sign the french can make me laugh",
    answerLength: "6",
    answer: "TICKLE",
    expectedResult: "TICKLE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-38',
    name: "Cryptic Test 38",
    prompt: "Check item is done, sounds like a pass",
    answerLength: "6",
    answer: "TICKET",
    expectedResult: "TICKET",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-39',
    name: "Cryptic Test 39",
    prompt: "Exude mostly classified information",
    answerLength: "6",
    answer: "SECRET",
    expectedResult: "SECRET",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-40',
    name: "Cryptic Test 40",
    prompt: "Fail to hit one on target",
    answerLength: "7",
    answer: "MISSION",
    expectedResult: "MISSION",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-41',
    name: "Cryptic Test 41",
    prompt: "Examine its negative arrangement",
    answerLength: "11",
    answer: "INVESTIGATE",
    expectedResult: "INVESTIGATE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-42',
    name: "Cryptic Test 42",
    prompt: "Oriental queen ushers in celebration of death and renewal",
    answerLength: "6",
    answer: "EASTER",
    expectedResult: "EASTER",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-43',
    name: "Cryptic Test 43",
    prompt: "Runs on batteries or transformers, first signs of an android",
    answerLength: "5",
    answer: "ROBOT",
    expectedResult: "ROBOT",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-44',
    name: "Cryptic Test 44",
    prompt: "Nasty, gin addled, fool uttered clear purpose",
    answerLength: "10",
    answer: "MEANINGFUL",
    expectedResult: "MEANINGFUL",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-45',
    name: "Cryptic Test 45",
    prompt: "Malfunctioning reset is abrupt",
    answerLength: "5",
    answer: "TERSE",
    expectedResult: "TERSE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-46',
    name: "Cryptic Test 46",
    prompt: "Given a year, alternative article developed into speculation",
    answerLength: "6",
    answer: "THEORY",
    expectedResult: "THEORY",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-47',
    name: "Cryptic Test 47",
    prompt: "Treasury changes last of silver for eastern stimulant",
    answerLength: "6",
    answer: "COFFEE",
    expectedResult: "COFFEE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-48',
    name: "Cryptic Test 48",
    prompt: "Vault, I see, leads to mystery",
    answerLength: "7",
    answer: "CRYPTIC",
    expectedResult: "CRYPTIC",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-49',
    name: "Cryptic Test 49",
    prompt: "Round about rock",
    answerLength: "3",
    answer: "ORE",
    expectedResult: "ORE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-50',
    name: "Cryptic Test 50",
    prompt: "Ute ran badly, that's its way",
    answerLength: "6",
    answer: "NATURE",
    expectedResult: "NATURE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-51',
    name: "Cryptic Test 51",
    prompt: "Park beside the sea, I hear, is magical",
    answerLength: "6",
    answer: "POTION",
    expectedResult: "POTION",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-52',
    name: "Cryptic Test 52",
    prompt: "Clue begins with no twist, merged as an anagram indicator",
    answerLength: "8",
    answer: "CONFUSED",
    expectedResult: "CONFUSED",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-53',
    name: "Cryptic Test 53",
    prompt: "Mongrel let in",
    answerLength: "7",
    answer: "CURRENT",
    expectedResult: "CURRENT",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-54',
    name: "Cryptic Test 54",
    prompt: "Cricketer starts year cooped up",
    answerLength: "7",
    answer: "BATTERY",
    expectedResult: "BATTERY",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-55',
    name: "Cryptic Test 55",
    prompt: "Gesture if I'm unable, it's important",
    answerLength: "11",
    answer: "SIGNIFICANT",
    expectedResult: "SIGNIFICANT",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-56',
    name: "Cryptic Test 56",
    prompt: "Fantasy race follows Sauron's original identity",
    answerLength: "4",
    answer: "SELF",
    expectedResult: "SELF",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-57',
    name: "Cryptic Test 57",
    prompt: "You are involved in birth, which is right",
    answerLength: "7",
    answer: "NATURAL",
    expectedResult: "NATURAL",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-58',
    name: "Cryptic Test 58",
    prompt: "Scam beat around united nations is a puzzle",
    answerLength: "9",
    answer: "CONUNDRUM",
    expectedResult: "CONUNDRUM",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-59',
    name: "Cryptic Test 59",
    prompt: "Former partner snared ring, passed on projection",
    answerLength: "11",
    answer: "EXTRAPOLATE",
    expectedResult: "EXTRAPOLATE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-60',
    name: "Cryptic Test 60",
    prompt: "Five emergency rooms sound doubtful? Make sure!",
    answerLength: "6",
    answer: "VERIFY",
    expectedResult: "VERIFY",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-61',
    name: "Cryptic Test 61",
    prompt: "Car phone carrier",
    answerLength: "10",
    answer: "AUTOMOBILE",
    expectedResult: "AUTOMOBILE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-62',
    name: "Cryptic Test 62",
    prompt: "Painters stand loses heart for good - it's shattered for this flyer",
    answerLength: "5",
    answer: "EAGLE",
    expectedResult: "EAGLE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-63',
    name: "Cryptic Test 63",
    prompt: "Dangerous cloud may start with American hospital ward",
    answerLength: "8",
    answer: "MUSHROOM",
    expectedResult: "MUSHROOM",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-64',
    name: "Cryptic Test 64",
    prompt: "We enter street, capable, appropriate",
    answerLength: "8",
    answer: "SUITABLE",
    expectedResult: "SUITABLE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-65',
    name: "Cryptic Test 65",
    prompt: "Shell food made by cat fighting ring",
    answerLength: "4",
    answer: "TACO",
    expectedResult: "TACO",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-66',
    name: "Cryptic Test 66",
    prompt: "Be way out, start something before the end",
    answerLength: "5",
    answer: "EXIST",
    expectedResult: "EXIST",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-67',
    name: "Cryptic Test 67",
    prompt: "Turn tide with gold and have the final word",
    answerLength: "6",
    answer: "EDITOR",
    expectedResult: "EDITOR",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-68',
    name: "Cryptic Test 68",
    prompt: "The end is nigh!",
    answerLength: "5",
    answer: "CLOSE",
    expectedResult: "CLOSE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-69',
    name: "Cryptic Test 69",
    prompt: "Good entries change control",
    answerLength: "8",
    answer: "STEERING",
    expectedResult: "STEERING",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-70',
    name: "Cryptic Test 70",
    prompt: "Prisoner under the bridge is endless and domineering",
    answerLength: "7",
    answer: "CONTROL",
    expectedResult: "CONTROL",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-71',
    name: "Cryptic Test 71",
    prompt: "Drunk idiot with wine is not forthcoming",
    answerLength: "9",
    answer: "RELUCTANT",
    expectedResult: "RELUCTANT",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-72',
    name: "Cryptic Test 72",
    prompt: "Sounds like north east covers all options",
    answerLength: "3",
    answer: "ANY",
    expectedResult: "ANY",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-73',
    name: "Cryptic Test 73",
    prompt: "Charge with tangled early western rope",
    answerLength: "5",
    answer: "POWER",
    expectedResult: "POWER",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-74',
    name: "Cryptic Test 74",
    prompt: "Fly like an eagle, then start to tumble. This can happen too close to the sun",
    answerLength: "5",
    answer: "ROAST",
    expectedResult: "ROAST",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-75',
    name: "Cryptic Test 75",
    prompt: "Law overturned by an idiot – that's brain food!",
    answerLength: "6",
    answer: "WALNUT",
    expectedResult: "WALNUT",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-76',
    name: "Cryptic Test 76",
    prompt: "Somehow learn about Northern Territory to shed some light",
    answerLength: "7",
    answer: "LANTERN",
    expectedResult: "LANTERN",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-77',
    name: "Cryptic Test 77",
    prompt: "It's fashionable, you know, to be afraid",
    answerLength: "7",
    answer: "CHICKEN",
    expectedResult: "CHICKEN",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-78',
    name: "Cryptic Test 78",
    prompt: "Endless excessive health needed after swimming",
    answerLength: "5",
    answer: "TOWEL",
    expectedResult: "TOWEL",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-79',
    name: "Cryptic Test 79",
    prompt: "Baby Jesus gift at first church said to offer succour",
    answerLength: "5",
    answer: "MERCY",
    expectedResult: "MERCY",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-80',
    name: "Cryptic Test 80",
    prompt: "Good strong drink, at start of BBQ, for the French to complain about",
    answerLength: "7",
    answer: "GRUMBLE",
    expectedResult: "GRUMBLE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-81',
    name: "Cryptic Test 81",
    prompt: "When the levy breaks, there's no time to laugh",
    answerLength: "3",
    answer: "LOL",
    expectedResult: "LOL",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-82',
    name: "Cryptic Test 82",
    prompt: "Sulphurous hag used to punish children",
    answerLength: "6",
    answer: "SWITCH",
    expectedResult: "SWITCH",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-83',
    name: "Cryptic Test 83",
    prompt: "Sacred Egyptian, dropped from squad, is unceremoniously dunked",
    answerLength: "7",
    answer: "BISCUIT",
    expectedResult: "BISCUIT",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-84',
    name: "Cryptic Test 84",
    prompt: "Exit left by City of Angels roundabout",
    answerLength: "6",
    answer: "PORTAL",
    expectedResult: "PORTAL",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-85',
    name: "Cryptic Test 85",
    prompt: "Check space time, a century in, ok. Listen to the rhythm of its passing",
    answerLength: "4,4",
    answer: "TICK TOCK",
    expectedResult: "TICK TOCK",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-86',
    name: "Cryptic Test 86",
    prompt: "Healer unwell, we've practiced for this over and over",
    answerLength: "5",
    answer: "DRILL",
    expectedResult: "DRILL",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-87',
    name: "Cryptic Test 87",
    prompt: "Care needed when market bidding requires initial charge upfront, at the cost of $100",
    answerLength: "7",
    answer: "CAUTION",
    expectedResult: "CAUTION",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-88',
    name: "Cryptic Test 88",
    prompt: "Use a nightshoe. Why? You'll need the grip",
    answerLength: "8",
    answer: "SLIPPERY",
    expectedResult: "SLIPPERY",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-89',
    name: "Cryptic Test 89",
    prompt: "Unique, twisted base urges fail twice against party drug and a tear",
    answerLength: "9",
    answer: "DIFFERENT",
    expectedResult: "DIFFERENT",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-90',
    name: "Cryptic Test 90",
    prompt: "Biting satire turns about and delivers cut",
    answerLength: "6",
    answer: "BARBER",
    expectedResult: "BARBER",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-91',
    name: "Cryptic Test 91",
    prompt: "Something catchy, way back before November",
    answerLength: "4",
    answer: "YAWN",
    expectedResult: "YAWN",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-92',
    name: "Cryptic Test 92",
    prompt: "Elon's acquisition of it, we are told, makes direction to stage left",
    answerLength: "4",
    answer: "EXIT",
    expectedResult: "EXIT",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-93',
    name: "Cryptic Test 93",
    prompt: "Singular type of mobile, we hear",
    answerLength: "9",
    answer: "HOMOPHONE",
    expectedResult: "HOMOPHONE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-94',
    name: "Cryptic Test 94",
    prompt: "Naked love, love at the start of night, conjures such a fool!",
    answerLength: "7",
    answer: "BUFFOON",
    expectedResult: "BUFFOON",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-95',
    name: "Cryptic Test 95",
    prompt: "Empty mark takes on brother",
    answerLength: "4",
    answer: "MONK",
    expectedResult: "MONK",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-96',
    name: "Cryptic Test 96",
    prompt: "Detective freezes to get to the heart of it",
    answerLength: "7",
    answer: "DISTILL",
    expectedResult: "DISTILL",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-97',
    name: "Cryptic Test 97",
    prompt: "Satanists prepared to be your guide",
    answerLength: "9",
    answer: "ASSISTANT",
    expectedResult: "ASSISTANT",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-98',
    name: "Cryptic Test 98",
    prompt: "Initial environmental fraud? Oh, I say! My word, what meanness!",
    answerLength: "7",
    answer: "ECONOMY",
    expectedResult: "ECONOMY",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-99',
    name: "Cryptic Test 99",
    prompt: "Shams laid bare become hugely popular",
    answerLength: "5",
    answer: "SMASH",
    expectedResult: "SMASH",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-100',
    name: "Cryptic Test 100",
    prompt: "Northern brown provides anaesthetic",
    answerLength: "6",
    answer: "NUMBER",
    expectedResult: "NUMBER",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-101',
    name: "Cryptic Test 101",
    prompt: "Fetch second note and band",
    answerLength: "5",
    answer: "BRING",
    expectedResult: "BRING",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-102',
    name: "Cryptic Test 102",
    prompt: "… and man spread out",
    answerLength: "9",
    answer: "AMPERSAND",
    expectedResult: "AMPERSAND",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-103',
    name: "Cryptic Test 103",
    prompt: "100 locks needed to secure top of the board",
    answerLength: "5",
    answer: "CHAIR",
    expectedResult: "CHAIR",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-104',
    name: "Cryptic Test 104",
    prompt: "Popular content hiding in some message",
    answerLength: "4",
    answer: "MEME",
    expectedResult: "MEME",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-105',
    name: "Cryptic Test 105",
    prompt: "Union activity? Sounds like a wig on the Bishop",
    answerLength: "5",
    answer: "RUGBY",
    expectedResult: "RUGBY",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-106',
    name: "Cryptic Test 106",
    prompt: "I'm on the left with worker, that's significant",
    answerLength: "9",
    answer: "IMPORTANT",
    expectedResult: "IMPORTANT",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-107',
    name: "Cryptic Test 107",
    prompt: "Beefy expanse by Picasso",
    answerLength: "8",
    answer: "ABSTRACT",
    expectedResult: "ABSTRACT",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-108',
    name: "Cryptic Test 108",
    prompt: "Long necked, African native with iron deficiency. No good, perhaps, but a reasonable assessment",
    answerLength: "4",
    answer: "FAIR",
    expectedResult: "FAIR",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-109',
    name: "Cryptic Test 109",
    prompt: "Confidential part of minutes. About time",
    answerLength: "6",
    answer: "SECRET",
    expectedResult: "SECRET",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-110',
    name: "Cryptic Test 110",
    prompt: "Ocean fairing golden cat, curtailed",
    answerLength: "4",
    answer: "ORCA",
    expectedResult: "ORCA",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-111',
    name: "Cryptic Test 111",
    prompt: "Hugo sobs uncontrollably",
    answerLength: "4",
    answer: "BOSS",
    expectedResult: "BOSS",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-112',
    name: "Cryptic Test 112",
    prompt: "Start trek alongside train track path",
    answerLength: "5",
    answer: "TRAIL",
    expectedResult: "TRAIL",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-113',
    name: "Cryptic Test 113",
    prompt: "Harbour wine",
    answerLength: "4",
    answer: "PORT",
    expectedResult: "PORT",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-114',
    name: "Cryptic Test 114",
    prompt: "Quietly begrudge offering",
    answerLength: "7",
    answer: "PRESENT",
    expectedResult: "PRESENT",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-115',
    name: "Cryptic Test 115",
    prompt: "Former oriental icon curtailed for growth",
    answerLength: "6",
    answer: "EXPAND",
    expectedResult: "EXPAND",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-116',
    name: "Cryptic Test 116",
    prompt: "Former cast member is challenging",
    answerLength: "8",
    answer: "EXACTING",
    expectedResult: "EXACTING",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-117',
    name: "Cryptic Test 117",
    prompt: "Beat of endless rap on the tracks is fleeting",
    answerLength: "9",
    answer: "TEMPORARY",
    expectedResult: "TEMPORARY",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-118',
    name: "Cryptic Test 118",
    prompt: "Party's alternative exit",
    answerLength: "4",
    answer: "DOOR",
    expectedResult: "DOOR",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-119',
    name: "Cryptic Test 119",
    prompt: "Go on and on about bog",
    answerLength: "6",
    answer: "REPEAT",
    expectedResult: "REPEAT",
    category: TestCategory.CRYPTIC
  }
]; 