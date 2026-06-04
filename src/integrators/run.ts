/**
 * Fixed-step run with record and replay.
 *
 * A run advances a packed state by a fixed step `dt` for `steps` steps and
 * records a snapshot of the full buffer every `snapshotEvery` steps. Determinism
 * is enforced structurally:
 *
 * - Simulation time at step s is s * dt by a single multiply, never an
 *   accumulated sum, so equal step counts give bit-identical times.
 * - A per-step finiteness gate scans the whole buffer and throws on any NaN or
 *   Infinity (for example from two coincident bodies with no softening), so a
 *   poisoned state can never propagate silently.
 * - Replay re-runs the identical spec and asserts the snapshot buffers are
 *   byte-for-byte equal, and that the accepted step sequence is constant.
 *
 * A zero-step run records only the initial snapshot, which is byte-identical to
 * the packed input.
 */
import { type Body, type StateBuffer, fromBodies, buffersEqual, allFinite } from './state'
import { type IntegratorName, integratorByName } from './index'

/** A scene: the bodies, the gravitational constant, and the softening length. */
export interface Scene {
  readonly bodies: readonly Body[]
  readonly G: number
  /** Softening length added in quadrature to the squared separation. Default 0. */
  readonly softening?: number
}

/** A fully specified run. Everything needed to reproduce it bit-for-bit. */
export interface RunSpec {
  readonly scene: Scene
  readonly integrator: IntegratorName
  readonly dt: number
  readonly steps: number
  /** Record a snapshot every this many steps; step 0 is always recorded. */
  readonly snapshotEvery: number
}

/** A recorded snapshot of the full buffer at a step. */
export interface Snapshot {
  readonly stepIndex: number
  readonly time: number
  readonly data: Float64Array
}

/** The result of a run: its spec, snapshots, and the accepted step sequence. */
export interface Trajectory {
  readonly spec: RunSpec
  readonly snapshots: Snapshot[]
  readonly stepSizes: number[]
}

/** Run the spec and record snapshots. Throws on any non-finite state. */
export function recordTrajectory(spec: RunSpec): Trajectory {
  const softening = spec.scene.softening ?? 0
  const state: StateBuffer = fromBodies(spec.scene.bodies)
  const integ = integratorByName(spec.integrator, state.n)
  const snapshots: Snapshot[] = []
  const stepSizes: number[] = []

  snapshots.push({ stepIndex: 0, time: 0, data: state.data.slice() })
  for (let s = 1; s <= spec.steps; s++) {
    integ.step(state, spec.dt, spec.scene.G, softening)
    stepSizes.push(spec.dt)
    if (!allFinite(state.data)) {
      throw new RangeError(`non-finite state at step ${s} (time ${s * spec.dt})`)
    }
    if (s % spec.snapshotEvery === 0) {
      snapshots.push({ stepIndex: s, time: s * spec.dt, data: state.data.slice() })
    }
  }
  return { spec, snapshots, stepSizes }
}

/** Throw if the accepted step sequence is not constant (fixed-step contract). */
export function assertConstantSteps(stepSizes: readonly number[]): void {
  for (let i = 1; i < stepSizes.length; i++) {
    if (stepSizes[i] !== stepSizes[0]) {
      throw new RangeError(`non-constant step sequence on the replay path at index ${i}`)
    }
  }
}

/**
 * Re-run the recorded spec and confirm every snapshot buffer is byte-identical
 * to the original and the step sequence is constant. Returns true on an exact
 * match; throws if the structure differs.
 */
export function replayTrajectory(traj: Trajectory): boolean {
  assertConstantSteps(traj.stepSizes)
  const fresh = recordTrajectory(traj.spec)
  if (fresh.snapshots.length !== traj.snapshots.length) {
    throw new RangeError('replay produced a different snapshot count')
  }
  assertConstantSteps(fresh.stepSizes)
  for (let i = 0; i < traj.snapshots.length; i++) {
    const a = fresh.snapshots[i]!
    const b = traj.snapshots[i]!
    if (a.stepIndex !== b.stepIndex) {
      throw new RangeError(`replay snapshot ${i} is at a different step`)
    }
    if (!buffersEqual(a.data, b.data)) return false
  }
  return true
}
