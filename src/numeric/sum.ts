/**
 * Compensated summation.
 *
 * Adding floating-point numbers in sequence accumulates rounding error, which
 * matters for conservation checks (total energy, momentum) where a tiny term is
 * added to a large running total. Neumaier's variant of Kahan summation tracks
 * the lost low-order bits in a separate compensation term and folds them back
 * at the end, recovering most of that lost precision.
 *
 * The summation order is fixed (the order of the input), because IEEE-754
 * addition is not associative: reordering the terms changes the last bits and
 * would break bit-identical replay. This function therefore never reorders or
 * parallelises the reduction.
 */
export function compensatedSum(values: Iterable<number>): number {
  let sum = 0
  let compensation = 0
  for (const value of values) {
    const t = sum + value
    if (Math.abs(sum) >= Math.abs(value)) {
      compensation += (sum - t) + value
    } else {
      compensation += (value - t) + sum
    }
    sum = t
  }
  return sum + compensation
}
