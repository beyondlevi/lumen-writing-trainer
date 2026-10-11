/** A random source returning numbers in [0, 1). */
export type Random = () => number;

/** A small seeded generator (mulberry32), for draws that must repeat (the daily challenge, tests). */
export function seeded(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A 32-bit hash of a string, to seed a generator. */
export function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** `count` different items of `items` in random order (all of them when there are fewer). */
export function draw<T>(items: readonly T[], count: number, random: Random): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/** `count` different items, each picked with a chance proportional to its weight. */
export function drawWeighted<T>(items: readonly T[], weight: (item: T) => number, count: number, random: Random): T[] {
  const pool = items.map(item => ({item, weight: Math.max(0, weight(item))}));
  const picked: T[] = [];
  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let index = pool.length - 1;
    if (total > 0) {
      let target = random() * total;
      index = pool.findIndex(entry => (target -= entry.weight) < 0);
      if (index < 0) index = pool.length - 1;
    } else {
      index = Math.floor(random() * pool.length);
    }
    picked.push(pool[index].item);
    pool.splice(index, 1);
  }
  return picked;
}
