import { TestCase, TestCategory } from './llm';

export interface CrypticTest extends TestCase {
  category: TestCategory.CRYPTIC;
  answerLength: string;
  answer: string;
}

export const crypticTests: CrypticTest[] = [
  {
    id: 'cryptic-1',
    prompt: 'Ignoring initial reports, fix our very french surrounds. It\'s awesome! (10)',
    answerLength: '10',
    answer: 'tremendous',
    expectedResult: 'tremendous',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-2',
    prompt: 'Cash company in (4)',
    answerLength: '4',
    answer: 'coin',
    expectedResult: 'coin',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-3',
    prompt: '3 points are original (3)',
    answerLength: '3',
    answer: 'new',
    expectedResult: 'new',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-4',
    prompt: 'A panicked retreat is turned for the term of service (4)',
    answerLength: '4',
    answer: 'tour',
    expectedResult: 'tour',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-5',
    prompt: 'Quiet, leave twice and yell (5,3)',
    answerLength: '5,3',
    answer: 'shout out',
    expectedResult: 'shout out',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-6',
    prompt: 'Rest your head, take a tablet and cry out in pain (6)',
    answerLength: '6',
    answer: 'pillow',
    expectedResult: 'pillow',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-7',
    prompt: 'You appear in QI with a revolutionary egg and bacon pie (6)',
    answerLength: '6',
    answer: 'quiche',
    expectedResult: 'quiche',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-8',
    prompt: 'Regularly put way around in (7)',
    answerLength: '7',
    answer: 'routine',
    expectedResult: 'routine',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-9',
    prompt: 'I like it, it starts as expected, then twisted tail (7)',
    answerLength: '7',
    answer: 'partial',
    expectedResult: 'partial',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-10',
    prompt: 'Sharp incline reduces all energy to zero, producing a hunched demeanour (5)',
    answerLength: '5',
    answer: 'stoop',
    expectedResult: 'stoop',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-11',
    prompt: 'A golfer cries out, lacking direction, thank you. Add a couple for the answer (but not the question) (5,3)',
    answerLength: '5,3',
    answer: 'forty two',
    expectedResult: 'forty two',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-12',
    prompt: 'Man emerges when British exit disrupts gamble (4)',
    answerLength: '4',
    answer: 'male',
    expectedResult: 'male',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-13',
    prompt: 'Cut right in, a little blunt (4)',
    answerLength: '4',
    answer: 'curt',
    expectedResult: 'curt',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-14',
    prompt: 'Zero year leads to wicked behavior (7)',
    answerLength: '7',
    answer: 'naughty',
    expectedResult: 'naughty',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-15',
    prompt: 'Playback part to snag prey (4)',
    answerLength: '4',
    answer: 'trap',
    expectedResult: 'trap',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-16',
    prompt: 'Ask me anything, politely abbreviated about state of matter (6)',
    answerLength: '6',
    answer: 'plasma',
    expectedResult: 'plasma',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-17',
    prompt: 'Leafy course gets confused without old fashioned penny, it\'s a shame (4)',
    answerLength: '4',
    answer: 'alas',
    expectedResult: 'alas',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-18',
    prompt: 'Unwanted plant changes direction and is renewed (4)',
    answerLength: '4',
    answer: 'seed',
    expectedResult: 'seed',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-19',
    prompt: 'Southern crazy fool provides comfortable seating (4)',
    answerLength: '4',
    answer: 'sofa',
    expectedResult: 'sofa',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-20',
    prompt: 'Restaurant needs direction to provide evening meal (6)',
    answerLength: '6',
    answer: 'dinner',
    expectedResult: 'dinner',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-21',
    prompt: 'Butcher twigs to create exotic utensils (4,6)',
    answerLength: '4,6',
    answer: 'chop sticks',
    expectedResult: 'chop sticks',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-22',
    prompt: 'Lather maker uses deceit with waste (7)',
    answerLength: '7',
    answer: 'shampoo',
    expectedResult: 'shampoo',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-23',
    prompt: 'Fear mistake after cuppa (6)',
    answerLength: '6',
    answer: 'terror',
    expectedResult: 'terror',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-24',
    prompt: 'Fraud snagged, without question, by southern statement of proof, not for the first time (6)',
    answerLength: '6',
    answer: 'second',
    expectedResult: 'second',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-25',
    prompt: 'Beg first character in popular mixed fruit (6)',
    answerLength: '6',
    answer: 'appeal',
    expectedResult: 'appeal',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-26',
    prompt: 'Proceed, fool (4)',
    answerLength: '4',
    answer: 'goon',
    expectedResult: 'goon',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-27',
    prompt: 'Beer flavouring and northern whisky will have children jumping in joy (9)',
    answerLength: '9',
    answer: 'hopscotch',
    expectedResult: 'hopscotch',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-28',
    prompt: 'Crazy bots powered up city (6)',
    answerLength: '6',
    answer: 'boston',
    expectedResult: 'boston',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-29',
    prompt: 'Opt not to play cards marked badly and aged (4)',
    answerLength: '4',
    answer: 'fold',
    expectedResult: 'fold',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-30',
    prompt: 'Space alien provides coverage (7)',
    answerLength: '7',
    answer: 'blanket',
    expectedResult: 'blanket',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-31',
    prompt: 'Like greatest operating system, bad for the lungs (8)',
    answerLength: '8',
    answer: 'asbestos',
    expectedResult: 'asbestos',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-32',
    prompt: 'Wends its way, directionless, without a straighten up (4)',
    answerLength: '4',
    answer: 'tidy',
    expectedResult: 'tidy',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-33',
    prompt: 'Go around the French stare (4)',
    answerLength: '4',
    answer: 'ogle',
    expectedResult: 'ogle',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-34',
    prompt: 'Doesn\'t matter which surrounds unit of matter to create biological systems (7)',
    answerLength: '7',
    answer: 'anatomy',
    expectedResult: 'anatomy',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-35',
    prompt: 'Two starters around initial huge moment of inspiration (3)',
    answerLength: '3',
    answer: 'aha',
    expectedResult: 'aha',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-36',
    prompt: 'Positive sign the french can make me laugh (6)',
    answerLength: '6',
    answer: 'tickle',
    expectedResult: 'tickle',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-37',
    prompt: 'Check item is done, sounds like a pass (6)',
    answerLength: '6',
    answer: 'ticket',
    expectedResult: 'ticket',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-38',
    prompt: 'Exude mostly classified information (6)',
    answerLength: '6',
    answer: 'secret',
    expectedResult: 'secret',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-39',
    prompt: 'Fail to hit one on target (7)',
    answerLength: '7',
    answer: 'mission',
    expectedResult: 'mission',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-40',
    prompt: 'Examine its negative arrangement (11)',
    answerLength: '11',
    answer: 'investigate',
    expectedResult: 'investigate',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-41',
    prompt: 'Oriental queen ushers in celebration of death and renewal (6)',
    answerLength: '6',
    answer: 'easter',
    expectedResult: 'easter',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-42',
    prompt: 'Runs on batteries or transformers, first signs of an android (5)',
    answerLength: '5',
    answer: 'robot',
    expectedResult: 'robot',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-43',
    prompt: 'Nasty, gin addled, fool uttered clear purpose (10)',
    answerLength: '10',
    answer: 'meaningful',
    expectedResult: 'meaningful',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-44',
    prompt: 'Malfunctioning reset is abrupt (5)',
    answerLength: '5',
    answer: 'terse',
    expectedResult: 'terse',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-45',
    prompt: 'Given a year, alternative article developed into speculation (6)',
    answerLength: '6',
    answer: 'theory',
    expectedResult: 'theory',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-46',
    prompt: 'Treasury changes last of silver for eastern stimulant (6)',
    answerLength: '6',
    answer: 'coffee',
    expectedResult: 'coffee',
    category: TestCategory.CRYPTIC
  },
  {
    id: 'cryptic-47',
    prompt: 'Vault, I see, leads to mystery (7)',
    answerLength: '7',
    answer: 'cryptic',
    expectedResult: 'cryptic',
    category: TestCategory.CRYPTIC
  }
]; 