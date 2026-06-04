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
export * from './numeric/stumpff'
export * from './numeric/rootfind'
export * from './twobody/elements'
export * from './twobody/kepler'
export * from './orbit/classify'
export * from './integrators/state'
export * from './integrators/force'
export * from './integrators/index'
export * from './integrators/run'
export * from './lambert/bmw'
export * from './lambert/izzo'
export * from './maneuvers/index'
export * from './transfer/ephemeris'
export * from './transfer/patchedconic'
export * from './transfer/porkchop'
export * from './cr3bp/index'
