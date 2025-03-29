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
  }
]; 