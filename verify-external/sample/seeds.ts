/**
 * Fixed integer seeds for the external differential sample, one per category.
 *
 * These are the single source of truth for the seeded case generation. The same
 * seed reproduces the same cases byte for byte, because the core's xoshiro256**
 * generator (reused here as a dev utility, never as a core runtime dependency) is
 * deterministic and the core forbids wall-clock and nondeterministic-random
 * calls. Each emitted JSON copies its seed so the fixture is self-describing.
 */

/** Per-category nominal sample size. The bar-external target is 1024; this is the
 *  committed baseline count, raised toward the target as the suite matures. */
export const SAMPLE_SIZE_NOMINAL = 256

/** Per-category adversarial (break-push) sample size. */
export const SAMPLE_SIZE_ADVERSARIAL = 128

/** One seed per category. Distinct values so categories do not share a stream. */
export const SEEDS = {
  elements_fwd: 20260604,
  elements_inv: 20260605,
  kepler: 20260606,
  lambert: 20260607,
  maneuvers: 20260608,
  lagrange: 20260609,
  standish: 20260610,
} as const

export type Category = keyof typeof SEEDS
