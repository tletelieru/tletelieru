export type PasswordMode = 'password' | 'passphrase';
export type CharSet = 'lower' | 'upper' | 'digits' | 'symbols';
export type Strength = 'weak' | 'fair' | 'strong' | 'veryStrong';

export const passwordModes: readonly PasswordMode[] = ['password', 'passphrase'];
export const charSets: readonly CharSet[] = ['lower', 'upper', 'digits', 'symbols'];

export const CHARSETS: Record<CharSet, string> = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>/?~',
};

const AMBIGUOUS = new Set([...'Il1O0o|`\'"']);

export const WORDS = [
  'acid',
  'acorn',
  'actor',
  'adobe',
  'agent',
  'alarm',
  'album',
  'alley',
  'amber',
  'angle',
  'apple',
  'apron',
  'arena',
  'arrow',
  'aspen',
  'atlas',
  'attic',
  'audio',
  'autumn',
  'avocado',
  'bacon',
  'badge',
  'bagel',
  'baker',
  'bamboo',
  'banana',
  'banjo',
  'barrel',
  'basil',
  'beach',
  'beacon',
  'beaver',
  'berry',
  'bicycle',
  'bingo',
  'birch',
  'bison',
  'blanket',
  'blossom',
  'bonsai',
  'border',
  'bottle',
  'bracket',
  'breeze',
  'bridge',
  'brook',
  'bubble',
  'bucket',
  'buffalo',
  'button',
  'cabin',
  'cactus',
  'camera',
  'campus',
  'candle',
  'canyon',
  'carbon',
  'carpet',
  'castle',
  'cedar',
  'cello',
  'cherry',
  'chess',
  'chimney',
  'cinema',
  'circle',
  'citrus',
  'clover',
  'cobalt',
  'cocoa',
  'comet',
  'compass',
  'copper',
  'coral',
  'cotton',
  'cougar',
  'coyote',
  'crater',
  'crayon',
  'cricket',
  'crystal',
  'cupcake',
  'cushion',
  'cyclone',
  'daisy',
  'dancer',
  'delta',
  'desert',
  'diesel',
  'dinner',
  'dolphin',
  'domino',
  'donkey',
  'dragon',
  'drawer',
  'dune',
  'eagle',
  'easel',
  'echo',
  'eclipse',
  'elbow',
  'ember',
  'emerald',
  'engine',
  'falcon',
  'feather',
  'fern',
  'ferry',
  'fiddle',
  'flame',
  'flute',
  'forest',
  'fossil',
  'fountain',
  'fox',
  'galaxy',
  'garden',
  'garlic',
  'gecko',
  'geyser',
  'ginger',
  'glacier',
  'globe',
  'goose',
  'granite',
  'grape',
  'gravel',
  'guitar',
  'hammock',
  'harbor',
  'harvest',
  'hazel',
  'helmet',
  'heron',
  'hickory',
  'honey',
  'horizon',
  'iceberg',
  'igloo',
  'indigo',
  'island',
  'ivory',
  'jacket',
  'jaguar',
  'jasmine',
  'jelly',
  'jigsaw',
  'jungle',
  'kayak',
  'kernel',
  'kettle',
  'kiwi',
  'koala',
  'ladder',
  'lagoon',
  'lantern',
  'lemon',
  'lentil',
  'lilac',
  'linen',
  'lizard',
  'lobster',
  'locket',
  'lotus',
  'magnet',
  'mango',
  'maple',
  'marble',
  'meadow',
  'melon',
  'meteor',
  'mirror',
  'mitten',
  'monsoon',
  'mosaic',
  'muffin',
  'mustard',
  'napkin',
  'nectar',
  'needle',
  'nickel',
  'noodle',
  'nutmeg',
  'oasis',
  'ocean',
  'olive',
  'onion',
  'opal',
  'orbit',
  'orchid',
  'otter',
  'oyster',
  'paddle',
  'palace',
  'panda',
  'papaya',
  'parrot',
  'peanut',
  'pebble',
  'pelican',
  'pepper',
  'piano',
  'pickle',
  'pigeon',
  'pillow',
  'pine',
  'planet',
  'plum',
  'pocket',
  'pollen',
  'potato',
  'prism',
  'pumpkin',
  'puzzle',
  'quartz',
  'quill',
  'rabbit',
  'radar',
  'radish',
  'raven',
  'reef',
  'ribbon',
  'river',
  'robot',
  'rocket',
  'saddle',
  'saffron',
  'salmon',
  'sapphire',
  'satin',
  'shadow',
  'sierra',
  'silver',
  'sketch',
  'sparrow',
  'spider',
  'spruce',
  'squash',
  'statue',
  'summit',
  'sunset',
  'tango',
  'teapot',
  'thistle',
  'thunder',
  'tiger',
  'timber',
  'tomato',
  'topaz',
  'tulip',
  'tundra',
  'turtle',
  'velvet',
  'violin',
  'walnut',
  'willow',
];

export interface PasswordOptions {
  mode: PasswordMode;
  length: number;
  sets: CharSet[];
  excludeAmbiguous: boolean;
  words: number;
  separator: string;
  capitalize: boolean;
  addNumber: boolean;
  count: number;
}

export type RandomSource = (values: Uint32Array<ArrayBuffer>) => Uint32Array<ArrayBuffer>;

export type PasswordError = { code: 'noCharsets' };

export type PasswordResult =
  | { ok: true; values: string[]; entropy: number; strength: Strength }
  | { ok: false; error: PasswordError };

export function randomIndex(max: number, random: RandomSource): number {
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buffer = new Uint32Array(1);
  for (;;) {
    const [value = 0] = random(buffer);
    if (value < limit) return value % max;
  }
}

export function buildPool(sets: readonly CharSet[], excludeAmbiguous: boolean): string {
  const chars = sets.flatMap((set) => [...CHARSETS[set]]);
  return [...new Set(chars)].filter((char) => !excludeAmbiguous || !AMBIGUOUS.has(char)).join('');
}

export function strengthOf(entropy: number): Strength {
  if (entropy < 40) return 'weak';
  if (entropy < 60) return 'fair';
  if (entropy < 90) return 'strong';
  return 'veryStrong';
}

export function passwordEntropy(options: PasswordOptions): number {
  if (options.mode === 'passphrase') {
    const words = options.words * Math.log2(WORDS.length);
    return words + (options.addNumber ? Math.log2(10) : 0);
  }
  const pool = buildPool(options.sets, options.excludeAmbiguous).length;
  return pool > 1 ? options.length * Math.log2(pool) : 0;
}

function shuffle<T>(items: T[], random: RandomSource): T[] {
  for (let index = items.length - 1; index > 0; index--) {
    const swap = randomIndex(index + 1, random);
    const current = items[index] as T;
    items[index] = items[swap] as T;
    items[swap] = current;
  }
  return items;
}

function makePassword(options: PasswordOptions, pool: string, random: RandomSource): string {
  const required = options.sets
    .map((set) => buildPool([set], options.excludeAmbiguous))
    .filter((chars) => chars.length > 0)
    .slice(0, options.length)
    .map((chars) => chars[randomIndex(chars.length, random)] ?? '');
  const rest = Array.from(
    { length: options.length - required.length },
    () => pool[randomIndex(pool.length, random)] ?? '',
  );
  return shuffle([...required, ...rest], random).join('');
}

function makePassphrase(options: PasswordOptions, random: RandomSource): string {
  const words = Array.from({ length: options.words }, () => {
    const word = WORDS[randomIndex(WORDS.length, random)] ?? '';
    return options.capitalize ? word.charAt(0).toUpperCase() + word.slice(1) : word;
  });
  if (options.addNumber) {
    const slot = randomIndex(words.length, random);
    words[slot] = `${words[slot] ?? ''}${randomIndex(10, random)}`;
  }
  return words.join(options.separator);
}

export function generatePasswords(options: PasswordOptions, random: RandomSource): PasswordResult {
  const pool = buildPool(options.sets, options.excludeAmbiguous);
  if (options.mode === 'password' && pool.length === 0) {
    return { ok: false, error: { code: 'noCharsets' } };
  }
  const values = Array.from({ length: options.count }, () =>
    options.mode === 'passphrase'
      ? makePassphrase(options, random)
      : makePassword(options, pool, random),
  );
  const entropy = passwordEntropy(options);
  return { ok: true, values, entropy, strength: strengthOf(entropy) };
}

export const cryptoRandom: RandomSource = (values) => crypto.getRandomValues(values);
