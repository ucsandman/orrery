/**
 * Public surface of the Orrery core.
 *
 * This barrel is the only entry point the future API and sandbox layers import.
 * It grows as milestones land. Milestone 1 (vectors, matrices, units, time,
 * constants, seeded randomness, compensated summation) is exported here.
 */
export * from './core/constants'
export * from './core/vec3'
export * from './core/mat3'
export * from './core/units'
export * from './core/time'
export * from './core/rng'
export * from './numeric/sum'
