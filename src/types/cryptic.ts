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
    prompt: "With an elegant start, orchestrated demo turns out spectacular! (10)",
    answerLength: "10",
    answer: "TREMENDOUS",
    expectedResult: "TREMENDOUS",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-2',
    name: "Cryptic Test 2",
    prompt: "Cash company in - (4)",
    answerLength: "4",
    answer: "COIN",
    expectedResult: "COIN",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-3',
    name: "Cryptic Test 3",
    prompt: "3 points are original - (3)",
    answerLength: "3",
    answer: "NEW",
    expectedResult: "NEW",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-4',
    name: "Cryptic Test 4",
    prompt: "A panicked retreat is scattered for the term of service (4)",
    answerLength: "4",
    answer: "TOUR",
    expectedResult: "TOUR",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-5',
    name: "Cryptic Test 5",
    prompt: "Quiet, leave twice and yell (5,3)",
    answerLength: "5,3",
    answer: "SHOUT OUT",
    expectedResult: "SHOUT OUT",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-6',
    name: "Cryptic Test 6",
    prompt: "Rest your head, take a tablet and cry out in pain (6)",
    answerLength: "6",
    answer: "PILLOW",
    expectedResult: "PILLOW",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-7',
    name: "Cryptic Test 7",
    prompt: "You appear in QI with a revolutionary egg and bacon pie (6)",
    answerLength: "6",
    answer: "QUICHE",
    expectedResult: "QUICHE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-8',
    name: "Cryptic Test 8",
    prompt: "Regularly put way around in (7)",
    answerLength: "7",
    answer: "ROUTINE",
    expectedResult: "ROUTINE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-9',
    name: "Cryptic Test 9",
    prompt: "I like it, it starts as expected, then twisted tail (7)",
    answerLength: "7",
    answer: "PARTIAL",
    expectedResult: "PARTIAL",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-10',
    name: "Cryptic Test 10",
    prompt: "Sharp incline reduces all energy to zero, producing a hunched demeanour (5)",
    answerLength: "5",
    answer: "STOOP",
    expectedResult: "STOOP",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-11',
    name: "Cryptic Test 11",
    prompt: "A golfer cries out, lacking direction, thank you. Add a couple for the answer (but not the question) (5, 3)",
    answerLength: "5,3",
    answer: "FORTY TWO",
    expectedResult: "FORTY TWO",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-12',
    name: "Cryptic Test 12",
    prompt: "Brexit Gamble Confused Man (4)",
    answerLength: "4",
    answer: "MALE",
    expectedResult: "MALE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-13',
    name: "Cryptic Test 13",
    prompt: "Man emerges when British exit disrupts gamble (4)",
    answerLength: "4",
    answer: "MALE",
    expectedResult: "MALE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-14',
    name: "Cryptic Test 14",
    prompt: "Cut right in, a little blunt (4)",
    answerLength: "4",
    answer: "CURT",
    expectedResult: "CURT",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-15',
    name: "Cryptic Test 15",
    prompt: "Zero year leads to wicked behavior (7)",
    answerLength: "7",
    answer: "NAUGHTY",
    expectedResult: "NAUGHTY",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-16',
    name: "Cryptic Test 16",
    prompt: "Playback part to snag prey (4)",
    answerLength: "4",
    answer: "TRAP",
    expectedResult: "TRAP",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-17',
    name: "Cryptic Test 17",
    prompt: "Ask me anything, politely abbreviated about state of matter (6)",
    answerLength: "6",
    answer: "PLASMA",
    expectedResult: "PLASMA",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-18',
    name: "Cryptic Test 18",
    prompt: "Leafy course gets confused without old fashioned penny, it's a shame (4)",
    answerLength: "4",
    answer: "ALAS",
    expectedResult: "ALAS",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-19',
    name: "Cryptic Test 19",
    prompt: "Unwanted plant changes direction and is renewed (4)",
    answerLength: "4",
    answer: "SEED",
    expectedResult: "SEED",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-20',
    name: "Cryptic Test 20",
    prompt: "Southern crazy fool provides comfortable seating (4)",
    answerLength: "4",
    answer: "SOFA",
    expectedResult: "SOFA",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-21',
    name: "Cryptic Test 21",
    prompt: "Restaurant needs direction to provide evening meal (6)",
    answerLength: "6",
    answer: "DINNER",
    expectedResult: "DINNER",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-22',
    name: "Cryptic Test 22",
    prompt: "Butcher twigs to create exotic utensils (4,6)",
    answerLength: "4,6",
    answer: "CHOP STICKS",
    expectedResult: "CHOP STICKS",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-23',
    name: "Cryptic Test 23",
    prompt: "Lather maker uses deceit with waste (7)",
    answerLength: "7",
    answer: "SHAMPOO",
    expectedResult: "SHAMPOO",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-24',
    name: "Cryptic Test 24",
    prompt: "Fear mistake after cuppa (6)",
    answerLength: "6",
    answer: "TERROR",
    expectedResult: "TERROR",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-25',
    name: "Cryptic Test 25",
    prompt: "Fraud snagged, without question, by southern statement of proof, not for the first time (6)",
    answerLength: "6",
    answer: "SECOND",
    expectedResult: "SECOND",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-26',
    name: "Cryptic Test 26",
    prompt: "Beg first character in popular mixed fruit (6)",
    answerLength: "6",
    answer: "APPEAL",
    expectedResult: "APPEAL",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-27',
    name: "Cryptic Test 27",
    prompt: "Proceed, fool (4)",
    answerLength: "4",
    answer: "GOON",
    expectedResult: "GOON",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-28',
    name: "Cryptic Test 28",
    prompt: "Beer flavouring and northern whisky will have children jumping in joy (9)",
    answerLength: "9",
    answer: "HOPSCOTCH",
    expectedResult: "HOPSCOTCH",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-29',
    name: "Cryptic Test 29",
    prompt: "Crazy bots powered up city (6)",
    answerLength: "6",
    answer: "BOSTON",
    expectedResult: "BOSTON",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-30',
    name: "Cryptic Test 30",
    prompt: "Opt not to play cards marked badly and aged (4)",
    answerLength: "4",
    answer: "FOLD",
    expectedResult: "FOLD",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-31',
    name: "Cryptic Test 31",
    prompt: "Space alien provides coverage (7)",
    answerLength: "7",
    answer: "BLANKET",
    expectedResult: "BLANKET",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-32',
    name: "Cryptic Test 32",
    prompt: "Like greatest operating system, bad for the lungs (8)",
    answerLength: "8",
    answer: "ASBESTOS",
    expectedResult: "ASBESTOS",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-33',
    name: "Cryptic Test 33",
    prompt: "Wends its way, directionless, muddled, without a straighten up (4)",
    answerLength: "4",
    answer: "TIDY",
    expectedResult: "TIDY",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-34',
    name: "Cryptic Test 34",
    prompt: "Go around the French stare (4)",
    answerLength: "4",
    answer: "OGLE",
    expectedResult: "OGLE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-35',
    name: "Cryptic Test 35",
    prompt: "Doesn't matter which surrounds unit of matter to create biological systems (7)",
    answerLength: "7",
    answer: "ANATOMY",
    expectedResult: "ANATOMY",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-36',
    name: "Cryptic Test 36",
    prompt: "Two starters around initial huge moment of inspiration (3)",
    answerLength: "3",
    answer: "AHA",
    expectedResult: "AHA",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-37',
    name: "Cryptic Test 37",
    prompt: "Positive sign the french can make me laugh (6)",
    answerLength: "6",
    answer: "TICKLE",
    expectedResult: "TICKLE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-38',
    name: "Cryptic Test 38",
    prompt: "Check item is done, sounds like a pass (6)",
    answerLength: "6",
    answer: "TICKET",
    expectedResult: "TICKET",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-39',
    name: "Cryptic Test 39",
    prompt: "Exude mostly classified information (6)",
    answerLength: "6",
    answer: "SECRET",
    expectedResult: "SECRET",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-40',
    name: "Cryptic Test 40",
    prompt: "Fail to hit one on target (7)",
    answerLength: "7",
    answer: "MISSION",
    expectedResult: "MISSION",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-41',
    name: "Cryptic Test 41",
    prompt: "Examine its negative arrangement (11)",
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
    prompt: "Runs on batteries or transformers, first signs of an android (5)",
    answerLength: "5",
    answer: "ROBOT",
    expectedResult: "ROBOT",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-44',
    name: "Cryptic Test 44",
    prompt: "Nasty, gin addled, fool uttered clear purpose (10)",
    answerLength: "10",
    answer: "MEANINGFUL",
    expectedResult: "MEANINGFUL",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-45',
    name: "Cryptic Test 45",
    prompt: "Malfunctioning reset is abrupt (5)",
    answerLength: "5",
    answer: "TERSE",
    expectedResult: "TERSE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-46',
    name: "Cryptic Test 46",
    prompt: "Given a year, alternative article developed into speculation (6)",
    answerLength: "6",
    answer: "THEORY",
    expectedResult: "THEORY",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-47',
    name: "Cryptic Test 47",
    prompt: "Treasury changes last of silver for eastern stimulant (6)",
    answerLength: "6",
    answer: "COFFEE",
    expectedResult: "COFFEE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-48',
    name: "Cryptic Test 48",
    prompt: "Vault, I see, leads to mystery (7)",
    answerLength: "7",
    answer: "CRYPTIC",
    expectedResult: "CRYPTIC",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-49',
    name: "Cryptic Test 49",
    prompt: "Round about rock (3)",
    answerLength: "3",
    answer: "ORE",
    expectedResult: "ORE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-50',
    name: "Cryptic Test 50",
    prompt: "Ute ran badly, that's its way (6)",
    answerLength: "6",
    answer: "NATURE",
    expectedResult: "NATURE",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-51',
    name: "Cryptic Test 51",
    prompt: "Park beside the sea, I hear, is magical (6)",
    answerLength: "6",
    answer: "POTION",
    expectedResult: "POTION",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-52',
    name: "Cryptic Test 52",
    prompt: "Clue begins with no twist, merged as an anagram indicator (8)",
    answerLength: "8",
    answer: "CONFUSED",
    expectedResult: "CONFUSED",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-53',
    name: "Cryptic Test 53",
    prompt: "Mongrel let in (7)",
    answerLength: "7",
    answer: "CURRENT",
    expectedResult: "CURRENT",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-54',
    name: "Cryptic Test 54",
    prompt: "Cricketer starts year cooped up (7)",
    answerLength: "7",
    answer: "BATTERY",
    expectedResult: "BATTERY",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-55',
    name: "Cryptic Test 55",
    prompt: "Gesture if I'm unable, it's important (11)",
    answerLength: "11",
    answer: "SIGNIFICANT",
    expectedResult: "SIGNIFICANT",
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-56',
    name: "Cryptic Test 56",
    prompt: "Fantasy race follows Sauron's original identity (4)",
    answerLength: "4",
    answer: "SELF",
    expectedResult: "SELF",
    category: TestCategory.CRYPTIC
  }
]; 