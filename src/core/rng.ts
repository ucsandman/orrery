/**
 * The only source of randomness in the core: a seeded, deterministic
 * pseudo-random number generator.
 *
 * `Math.random` is forbidden in the core because it is not reproducible. Every
 * stochastic scene and every fuzzed counterexample must replay exactly from its
 * seed, so all randomness flows through this generator.
 *
 * Algorithm: a `splitmix64` mixer expands the user seed into the four 64-bit
 * words of `xoshiro256**` (Blackman and Vigna, 2018), a fast generator with
 * good statistical quality. Sixty-four-bit arithmetic is done with BigInt so
 * the bit operations are exact and identical on every platform; a double in
 * [0, 1) is formed from the top 53 bits, which is the full mantissa width.
 */

const MASK64 = (1n << 64n) - 1n
const TWO_POW_53 = 9007199254740992 // 2^53, the number of representable doubles in [0, 1)

function rotl(x: bigint, k: bigint): bigint {
  return ((x << k) | (x >> (64n - k))) & MASK64
}

/** A `splitmix64` stream used only to seed the main generator. */
function splitmix64(seed: bigint): () => bigint {
  let state = seed & MASK64
  return () => {
    state = (state + 0x9e3779b97f4a7c15n) & MASK64
    let z = state
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK64
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK64
    return (z ^ (z >> 31n)) & MASK64
  }
}

/** A deterministic random source. */
export interface Rng {
  /** Next double in the half-open interval [0, 1). */
  next(): number
  /** Next raw 64-bit value, for callers that need full-width bits. */
  nextU64(): bigint
}

/**
 * Create a generator from an integer seed. The same seed always produces the
 * same sequence. A floating-point seed is truncated to an integer first.
 */
export function createRng(seed: number | bigint): Rng {
  const seedBig = (typeof seed === 'bigint' ? seed : BigInt(Math.trunc(seed))) & MASK64
  const mix = splitmix64(seedBig)
  let s0 = mix()
  let s1 = mix()
  let s2 = mix()
  let s3 = mix()

  function nextU64(): bigint {
    const result = (rotl((s1 * 5n) & MASK64, 7n) * 9n) & MASK64
    const t = (s1 << 17n) & MASK64
    s2 ^= s0
    s3 ^= s1
    s1 ^= s2
    s0 ^= s3
    s2 ^= t
    s3 = rotl(s3, 45n)
    return result
  }

  function next(): number {
    return Number(nextU64() >> 11n) / TWO_POW_53
  }

  return { next, nextU64 }
}
