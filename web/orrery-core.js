"use strict";
var Orrery = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    AU_KM_CURTIS: () => AU_KM_CURTIS,
    AU_M: () => AU_M,
    COLLINEAR_SIN_TOL: () => COLLINEAR_SIN_TOL,
    DAY_S: () => DAY_S,
    EARTH_MOON_MASS_RATIO: () => EARTH_MOON_MASS_RATIO,
    ECC_CIRCULAR_TOL: () => ECC_CIRCULAR_TOL,
    G: () => G,
    IDENTITY: () => IDENTITY,
    J2000_JD: () => J2000_JD,
    JULIAN_YEAR_S: () => JULIAN_YEAR_S,
    MU_EARTH: () => MU_EARTH,
    MU_MARS_SYSTEM: () => MU_MARS_SYSTEM,
    MU_MOON: () => MU_MOON,
    MU_SUN: () => MU_SUN,
    PARABOLIC_ECC_TOL: () => PARABOLIC_ECC_TOL,
    SIN_INC_EQUATORIAL_TOL: () => SIN_INC_EQUATORIAL_TOL,
    STANDISH_EARTH: () => STANDISH_EARTH,
    STANDISH_MARS: () => STANDISH_MARS,
    STUMPFF_SERIES_CUTOFF: () => STUMPFF_SERIES_CUTOFF,
    TWO_PI: () => TWO_PI,
    ZERO: () => ZERO,
    accelerations: () => accelerations,
    add: () => add,
    allFinite: () => allFinite,
    apply: () => apply,
    assertCoefficientSet: () => assertCoefficientSet,
    assertConstantSteps: () => assertConstantSteps,
    auToM: () => auToM,
    biElliptic: () => biElliptic,
    biEllipticLowerRatio: () => biEllipticLowerRatio,
    biEllipticUpperRatio: () => biEllipticUpperRatio,
    buffersEqual: () => buffersEqual,
    circularSpeed: () => circularSpeed,
    classify: () => classify,
    coeToRv: () => coeToRv,
    combinedPlaneChange: () => combinedPlaneChange,
    compensatedSum: () => compensatedSum,
    createRng: () => createRng,
    cross: () => cross,
    danby: () => danby,
    dayToS: () => dayToS,
    degToRad: () => degToRad,
    departureDeltaV: () => departureDeltaV,
    distance: () => distance,
    dot: () => dot,
    earthMoonMassParameter: () => earthMoonMassParameter,
    effectivePotential: () => effectivePotential,
    effectivePotentialGradient: () => effectivePotentialGradient,
    equals: () => equals,
    forestRuth: () => forestRuth,
    fromBodies: () => fromBodies,
    hohmann: () => hohmann,
    householder: () => householder,
    integratorByName: () => integratorByName,
    isFinite3: () => isFinite3,
    jacobiConstant: () => jacobiConstant,
    julianDate: () => julianDate,
    keplerEphemeris: () => keplerEphemeris,
    kmToM: () => kmToM,
    kmsToMs: () => kmsToMs,
    lagrangePoints: () => lagrangePoints,
    lambertBMW: () => lambertBMW,
    lambertIzzo: () => lambertIzzo,
    lambertIzzoSingle: () => lambertIzzoSingle,
    leapfrog: () => leapfrog,
    lerp: () => lerp,
    mToAu: () => mToAu,
    mToKm: () => mToKm,
    msToKms: () => msToKms,
    multiply: () => multiply,
    neg: () => neg,
    newton: () => newton,
    norm: () => norm,
    norm2: () => norm2,
    normalize: () => normalize,
    orbitalPeriod: () => orbitalPeriod,
    pefrl: () => pefrl,
    planeChange: () => planeChange,
    planetStateAtJD: () => planetStateAtJD,
    porkchopScan: () => porkchopScan,
    propagateRegime: () => propagateRegime,
    propagateRotating: () => propagateRotating,
    propagateUniversal: () => propagateUniversal,
    radToDeg: () => radToDeg,
    recommendTransfer: () => recommendTransfer,
    recordTrajectory: () => recordTrajectory,
    replayTrajectory: () => replayTrajectory,
    rk4: () => rk4,
    rotationX: () => rotationX,
    rotationY: () => rotationY,
    rotationZ: () => rotationZ,
    rvToElements: () => rvToElements,
    sToDay: () => sToDay,
    scale: () => scale,
    secondsToSplitJD: () => secondsToSplitJD,
    simulationTime: () => simulationTime,
    sphereOfInfluence: () => sphereOfInfluence,
    splitJDToSeconds: () => splitJDToSeconds,
    standishEphemeris: () => standishEphemeris,
    stumpff: () => stumpff,
    stumpffClosed: () => stumpffClosed,
    stumpffSeries: () => stumpffSeries,
    sub: () => sub,
    sunEarthMassParameter: () => sunEarthMassParameter,
    toBodies: () => toBodies,
    transferArc: () => transferArc,
    transpose: () => transpose,
    vec3: () => vec3
  });

  // src/core/constants.ts
  var G = 66743e-15;
  var AU_M = 149597870700;
  var DAY_S = 86400;
  var JULIAN_YEAR_S = 365.25 * DAY_S;
  var J2000_JD = 2451545;
  var MU_SUN = 13271244004127942e4;
  var MU_EARTH = 398600435507e3;
  var MU_MOON = 4902800118e3;
  var MU_MARS_SYSTEM = 42828375816e3;
  var EARTH_MOON_MASS_RATIO = 81.30056822149722;
  var TWO_PI = 2 * Math.PI;

  // src/core/vec3.ts
  function vec3(x, y, z) {
    return Object.freeze({ x, y, z });
  }
  var ZERO = vec3(0, 0, 0);
  function add(a, b) {
    return vec3(a.x + b.x, a.y + b.y, a.z + b.z);
  }
  function sub(a, b) {
    return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
  }
  function scale(a, s) {
    return vec3(a.x * s, a.y * s, a.z * s);
  }
  function neg(a) {
    return vec3(-a.x, -a.y, -a.z);
  }
  function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }
  function cross(a, b) {
    return vec3(
      a.y * b.z - a.z * b.y,
      a.z * b.x - a.x * b.z,
      a.x * b.y - a.y * b.x
    );
  }
  function norm2(a) {
    return a.x * a.x + a.y * a.y + a.z * a.z;
  }
  function norm(a) {
    return Math.sqrt(norm2(a));
  }
  function distance(a, b) {
    return norm(sub(a, b));
  }
  function normalize(a) {
    const n = norm(a);
    if (n === 0 || !Number.isFinite(n)) {
      throw new RangeError("cannot normalize a zero-length or non-finite vector");
    }
    return scale(a, 1 / n);
  }
  function lerp(a, b, t) {
    return vec3(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t,
      a.z + (b.z - a.z) * t
    );
  }
  function isFinite3(a) {
    return Number.isFinite(a.x) && Number.isFinite(a.y) && Number.isFinite(a.z);
  }
  function equals(a, b, rtol = 0, atol = 0) {
    return Math.abs(a.x - b.x) <= atol + rtol * Math.max(Math.abs(a.x), Math.abs(b.x)) && Math.abs(a.y - b.y) <= atol + rtol * Math.max(Math.abs(a.y), Math.abs(b.y)) && Math.abs(a.z - b.z) <= atol + rtol * Math.max(Math.abs(a.z), Math.abs(b.z));
  }

  // src/core/mat3.ts
  var IDENTITY = Object.freeze([
    1,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    1
  ]);
  function rotationX(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return Object.freeze([
      1,
      0,
      0,
      0,
      c,
      -s,
      0,
      s,
      c
    ]);
  }
  function rotationY(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return Object.freeze([
      c,
      0,
      s,
      0,
      1,
      0,
      -s,
      0,
      c
    ]);
  }
  function rotationZ(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return Object.freeze([
      c,
      -s,
      0,
      s,
      c,
      0,
      0,
      0,
      1
    ]);
  }
  function apply(m, v) {
    return vec3(
      m[0] * v.x + m[1] * v.y + m[2] * v.z,
      m[3] * v.x + m[4] * v.y + m[5] * v.z,
      m[6] * v.x + m[7] * v.y + m[8] * v.z
    );
  }
  function multiply(a, b) {
    return Object.freeze([
      a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
      a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
      a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
      a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
      a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
      a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
      a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
      a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
      a[6] * b[2] + a[7] * b[5] + a[8] * b[8]
    ]);
  }
  function transpose(m) {
    return Object.freeze([
      m[0],
      m[3],
      m[6],
      m[1],
      m[4],
      m[7],
      m[2],
      m[5],
      m[8]
    ]);
  }

  // src/core/units.ts
  var DEG_PER_RAD = 180 / Math.PI;
  var RAD_PER_DEG = Math.PI / 180;
  function kmToM(km) {
    return km * 1e3;
  }
  function mToKm(m) {
    return m / 1e3;
  }
  function degToRad(deg) {
    return deg * RAD_PER_DEG;
  }
  function radToDeg(rad) {
    return rad * DEG_PER_RAD;
  }
  function dayToS(days) {
    return days * DAY_S;
  }
  function sToDay(seconds) {
    return seconds / DAY_S;
  }
  function auToM(au) {
    return au * AU_M;
  }
  function mToAu(m) {
    return m / AU_M;
  }
  function kmsToMs(kms) {
    return kms * 1e3;
  }
  function msToKms(ms) {
    return ms / 1e3;
  }

  // src/core/time.ts
  function secondsToSplitJD(secondsFromJ2000) {
    const totalDays = secondsFromJ2000 / DAY_S;
    let wholeDays = Math.floor(totalDays);
    let fracDays = totalDays - wholeDays;
    if (fracDays >= 1) {
      fracDays = 0;
      wholeDays += 1;
    }
    return { jdInteger: J2000_JD + wholeDays, jdFraction: fracDays };
  }
  function splitJDToSeconds(jd) {
    const wholeDays = jd.jdInteger - J2000_JD;
    return (wholeDays + jd.jdFraction) * DAY_S;
  }
  function julianDate(secondsFromJ2000) {
    const jd = secondsToSplitJD(secondsFromJ2000);
    return jd.jdInteger + jd.jdFraction;
  }
  function simulationTime(stepIndex, dt) {
    return stepIndex * dt;
  }

  // src/core/rng.ts
  var MASK64 = (1n << 64n) - 1n;
  var TWO_POW_53 = 9007199254740992;
  function rotl(x, k) {
    return (x << k | x >> 64n - k) & MASK64;
  }
  function splitmix64(seed) {
    let state = seed & MASK64;
    return () => {
      state = state + 0x9e3779b97f4a7c15n & MASK64;
      let z = state;
      z = (z ^ z >> 30n) * 0xbf58476d1ce4e5b9n & MASK64;
      z = (z ^ z >> 27n) * 0x94d049bb133111ebn & MASK64;
      return (z ^ z >> 31n) & MASK64;
    };
  }
  function createRng(seed) {
    const seedBig = (typeof seed === "bigint" ? seed : BigInt(Math.trunc(seed))) & MASK64;
    const mix = splitmix64(seedBig);
    let s0 = mix();
    let s1 = mix();
    let s2 = mix();
    let s3 = mix();
    function nextU64() {
      const result = rotl(s1 * 5n & MASK64, 7n) * 9n & MASK64;
      const t = s1 << 17n & MASK64;
      s2 ^= s0;
      s3 ^= s1;
      s1 ^= s2;
      s0 ^= s3;
      s2 ^= t;
      s3 = rotl(s3, 45n);
      return result;
    }
    function next() {
      return Number(nextU64() >> 11n) / TWO_POW_53;
    }
    return { next, nextU64 };
  }

  // src/numeric/sum.ts
  function compensatedSum(values) {
    let sum = 0;
    let compensation = 0;
    for (const value of values) {
      const t = sum + value;
      if (Math.abs(sum) >= Math.abs(value)) {
        compensation += sum - t + value;
      } else {
        compensation += value - t + sum;
      }
      sum = t;
    }
    return sum + compensation;
  }

  // src/numeric/stumpff.ts
  var STUMPFF_SERIES_CUTOFF = 15e-5;
  var SERIES_MAX_TERMS = 60;
  function stumpffSeries(z) {
    let termC = 0.5;
    let termS = 1 / 6;
    let C = termC;
    let S = termS;
    for (let k = 0; k < SERIES_MAX_TERMS; k++) {
      termC *= -z / ((2 * k + 3) * (2 * k + 4));
      termS *= -z / ((2 * k + 4) * (2 * k + 5));
      const nextC = C + termC;
      const nextS = S + termS;
      if (nextC === C && nextS === S) return { C: nextC, S: nextS };
      C = nextC;
      S = nextS;
    }
    return { C, S };
  }
  function stumpffClosed(z) {
    if (z > 0) {
      const sz = Math.sqrt(z);
      return { C: (1 - Math.cos(sz)) / z, S: (sz - Math.sin(sz)) / (z * sz) };
    }
    if (z < 0) {
      const sz = Math.sqrt(-z);
      return { C: (Math.cosh(sz) - 1) / -z, S: (Math.sinh(sz) - sz) / (-z * sz) };
    }
    return { C: 0.5, S: 1 / 6 };
  }
  function stumpff(z) {
    return Math.abs(z) < STUMPFF_SERIES_CUTOFF ? stumpffSeries(z) : stumpffClosed(z);
  }

  // src/numeric/rootfind.ts
  var DEFAULT_TOL = 1e-14;
  var DEFAULT_MAX_ITER = 100;
  function converged(delta, x, tol) {
    return Math.abs(delta) <= tol * (1 + Math.abs(x));
  }
  function fail(name, x, iter) {
    throw new RangeError(`${name} failed to converge after ${iter} iterations (x = ${x})`);
  }
  function newton(f, df, x0, opts = {}) {
    const tol = opts.tol ?? DEFAULT_TOL;
    const maxIter = opts.maxIter ?? DEFAULT_MAX_ITER;
    let x = x0;
    for (let i = 0; i < maxIter; i++) {
      const fp = df(x);
      if (fp === 0 || !Number.isFinite(fp)) fail("newton", x, i);
      const delta = -f(x) / fp;
      x += delta;
      if (!Number.isFinite(x)) fail("newton", x, i);
      if (converged(delta, x, tol)) return x;
    }
    return fail("newton", x, maxIter);
  }
  function danby(f, df, d2f, x0, opts = {}) {
    const tol = opts.tol ?? DEFAULT_TOL;
    const maxIter = opts.maxIter ?? DEFAULT_MAX_ITER;
    let x = x0;
    for (let i = 0; i < maxIter; i++) {
      const fx = f(x);
      const fp = df(x);
      if (fp === 0 || !Number.isFinite(fp)) fail("danby", x, i);
      const d1 = -fx / fp;
      const d2 = -fx / (fp + 0.5 * d1 * d2f(x));
      x += d2;
      if (!Number.isFinite(x)) fail("danby", x, i);
      if (converged(d2, x, tol)) return x;
    }
    return fail("danby", x, maxIter);
  }
  function householder(f, df, d2f, x0, opts = {}) {
    const tol = opts.tol ?? DEFAULT_TOL;
    const maxIter = opts.maxIter ?? DEFAULT_MAX_ITER;
    let x = x0;
    for (let i = 0; i < maxIter; i++) {
      const fx = f(x);
      const fp = df(x);
      const denom = 2 * fp * fp - fx * d2f(x);
      if (denom === 0 || !Number.isFinite(denom)) fail("householder", x, i);
      const delta = -2 * fx * fp / denom;
      x += delta;
      if (!Number.isFinite(x)) fail("householder", x, i);
      if (converged(delta, x, tol)) return x;
    }
    return fail("householder", x, maxIter);
  }

  // src/twobody/elements.ts
  var ECC_CIRCULAR_TOL = 1e-8;
  var SIN_INC_EQUATORIAL_TOL = 1e-8;
  function wrapTwoPi(angle) {
    const a = angle % TWO_PI;
    return a < 0 ? a + TWO_PI : a;
  }
  function angleAbout(u, w, axis, axisMag) {
    const sinPart = dot(cross(u, w), axis) / axisMag;
    const cosPart = dot(u, w);
    return wrapTwoPi(Math.atan2(sinPart, cosPart));
  }
  function rvToElements(r, v, mu) {
    const rMag = norm(r);
    const vMag = norm(v);
    const rv = dot(r, v);
    const hVec = cross(r, v);
    const h = norm(hVec);
    const nVec = vec3(-hVec.y, hVec.x, 0);
    const n = norm(nVec);
    const eVec = scale(
      sub(scale(r, vMag * vMag - mu / rMag), scale(v, rv)),
      1 / mu
    );
    const e = norm(eVec);
    const energy = vMag * vMag / 2 - mu / rMag;
    const a = energy === 0 ? Infinity : -mu / (2 * energy);
    const p = h * h / mu;
    const i = Math.atan2(n, hVec.z);
    const common = { a, e, i, p, h };
    const circular = e < ECC_CIRCULAR_TOL;
    const equatorial = n / h < SIN_INC_EQUATORIAL_TOL;
    if (circular && equatorial) {
      return { ...common, kind: "circular-equatorial", trueLon: wrapTwoPi(Math.atan2(r.y, r.x)) };
    }
    if (circular) {
      const raan2 = wrapTwoPi(Math.atan2(nVec.y, nVec.x));
      const argLat = angleAbout(nVec, r, hVec, h);
      return { ...common, kind: "circular", raan: raan2, argLat };
    }
    if (equatorial) {
      const lonPeri = wrapTwoPi(Math.atan2(eVec.y, eVec.x));
      const nu2 = angleAbout(eVec, r, hVec, h);
      return { ...common, kind: "equatorial", lonPeri, nu: nu2 };
    }
    const raan = wrapTwoPi(Math.atan2(nVec.y, nVec.x));
    const argp = angleAbout(nVec, eVec, hVec, h);
    const nu = angleAbout(eVec, r, hVec, h);
    return { ...common, kind: "classical", raan, argp, nu };
  }
  function coeToRv(a, e, i, raan, argp, nu, mu) {
    const p = a * (1 - e * e);
    const cosNu = Math.cos(nu);
    const sinNu = Math.sin(nu);
    const rPf = scale(vec3(cosNu, sinNu, 0), p / (1 + e * cosNu));
    const vPf = scale(vec3(-sinNu, e + cosNu, 0), Math.sqrt(mu / p));
    const rotation = multiply(rotationZ(raan), multiply(rotationX(i), rotationZ(argp)));
    return { r: apply(rotation, rPf), v: apply(rotation, vPf) };
  }

  // src/twobody/kepler.ts
  var UNIVERSAL_TOL = 1e-12;
  var UNIVERSAL_MAX_ITER = 200;
  var PARABOLIC_BAND = 1e-6;
  function propagateUniversal(r0, v0, dt, mu) {
    const sqrtMu = Math.sqrt(mu);
    const r0Mag = norm(r0);
    const vr0 = dot(r0, v0) / r0Mag;
    const alpha = 2 / r0Mag - dot(v0, v0) / mu;
    const term = r0Mag * vr0 / sqrtMu;
    const evalF = (chi3) => {
      const z2 = alpha * chi3 * chi3;
      const { C: C2, S: S2 } = stumpff(z2);
      const chi22 = chi3 * chi3;
      const F = term * chi22 * C2 + (1 - alpha * r0Mag) * chi22 * chi3 * S2 + r0Mag * chi3 - sqrtMu * dt;
      const dF = term * chi3 * (1 - z2 * S2) + (1 - alpha * r0Mag) * chi22 * C2 + r0Mag;
      return { F, dF };
    };
    let chi = 0;
    if (dt !== 0) {
      const guess = sqrtMu * Math.abs(alpha) * dt;
      let xl;
      let xh;
      if (dt > 0) {
        xl = 0;
        xh = guess > 0 ? guess : 1;
        let guard = 0;
        while (evalF(xh).F < 0) {
          xh *= 2;
          if (++guard > 200) throw new RangeError("universal Kepler: failed to bracket the root");
        }
      } else {
        xh = 0;
        xl = guess < 0 ? guess : -1;
        let guard = 0;
        while (evalF(xl).F > 0) {
          xl *= 2;
          if (++guard > 200) throw new RangeError("universal Kepler: failed to bracket the root");
        }
      }
      chi = (xl + xh) / 2;
      let dxOld = Math.abs(xh - xl);
      let dx = dxOld;
      let { F, dF } = evalF(chi);
      let converged2 = false;
      for (let iter = 0; iter < UNIVERSAL_MAX_ITER; iter++) {
        const newtonOutOfRange = ((chi - xh) * dF - F) * ((chi - xl) * dF - F) > 0;
        const newtonTooSlow = Math.abs(2 * F) > Math.abs(dxOld * dF);
        if (newtonOutOfRange || newtonTooSlow) {
          dxOld = dx;
          dx = (xh - xl) / 2;
          chi = xl + dx;
        } else {
          dxOld = dx;
          dx = F / dF;
          chi -= dx;
        }
        if (Math.abs(dx) <= UNIVERSAL_TOL * (1 + Math.abs(chi))) {
          converged2 = true;
          break;
        }
        ;
        ({ F, dF } = evalF(chi));
        if (F < 0) xl = chi;
        else xh = chi;
      }
      if (!converged2) {
        throw new RangeError(`universal Kepler did not converge in ${UNIVERSAL_MAX_ITER} iterations`);
      }
    }
    const z = alpha * chi * chi;
    const { C, S } = stumpff(z);
    const chi2 = chi * chi;
    const f = 1 - chi2 / r0Mag * C;
    const g = dt - chi2 * chi / sqrtMu * S;
    const rVec = add(scale(r0, f), scale(v0, g));
    const rMag = norm(rVec);
    const fDot = sqrtMu / (rMag * r0Mag) * (alpha * chi2 * chi * S - chi);
    const gDot = 1 - chi2 / rMag * C;
    const vVec = add(scale(r0, fDot), scale(v0, gDot));
    return { r: rVec, v: vVec };
  }
  function wrapToPi(angle) {
    const wrapped = angle % TWO_PI;
    if (wrapped > Math.PI) return wrapped - TWO_PI;
    if (wrapped < -Math.PI) return wrapped + TWO_PI;
    return wrapped;
  }
  function propagateRegime(r0, v0, dt, mu) {
    const el = rvToElements(r0, v0, mu);
    if (el.kind !== "classical") {
      throw new RangeError(`per-regime solver needs a non-degenerate orbit, got ${el.kind}`);
    }
    const { a, e, i, raan, argp, nu: nu0 } = el;
    if (Math.abs(e - 1) < PARABOLIC_BAND) {
      throw new RangeError(`per-regime solver excludes the parabolic band, got e = ${e}`);
    }
    let nu;
    if (e < 1) {
      const meanMotion = Math.sqrt(mu / (a * a * a));
      const e0 = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu0 / 2), Math.sqrt(1 + e) * Math.cos(nu0 / 2));
      const m0 = e0 - e * Math.sin(e0);
      const m = wrapToPi(m0 + meanMotion * dt);
      const eAnom = danby(
        (x) => x - e * Math.sin(x) - m,
        (x) => 1 - e * Math.cos(x),
        (x) => e * Math.sin(x),
        m
        // guess: E ~ M for the reduced anomaly
      );
      nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(eAnom / 2), Math.sqrt(1 - e) * Math.cos(eAnom / 2));
    } else {
      const meanMotion = Math.sqrt(mu / (-a * -a * -a));
      const h0 = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nu0 / 2));
      const m0 = e * Math.sinh(h0) - h0;
      const m = m0 + meanMotion * dt;
      const hAnom = danby(
        (x) => e * Math.sinh(x) - x - m,
        (x) => e * Math.cosh(x) - 1,
        (x) => e * Math.sinh(x),
        Math.asinh(m / e)
        // guess from e sinh H ~ M at large H
      );
      nu = 2 * Math.atan2(Math.sqrt(e + 1) * Math.sinh(hAnom / 2), Math.sqrt(e - 1) * Math.cosh(hAnom / 2));
    }
    return coeToRv(a, e, i, raan, argp, nu, mu);
  }

  // src/orbit/classify.ts
  var PARABOLIC_ECC_TOL = 1e-6;
  function orbitalPeriod(a, mu) {
    return TWO_PI * Math.sqrt(a ** 3 / mu);
  }
  function classify(r, v, mu) {
    const el = rvToElements(r, v, mu);
    const { e, p, h } = el;
    const energy = dot(v, v) / 2 - mu / norm(r);
    let conic;
    if (Math.abs(e - 1) < PARABOLIC_ECC_TOL) conic = "parabolic";
    else if (e < ECC_CIRCULAR_TOL) conic = "circular";
    else if (e < 1) conic = "elliptic";
    else conic = "hyperbolic";
    const bound = conic === "circular" || conic === "elliptic";
    const a = conic === "parabolic" ? Infinity : -mu / (2 * energy);
    const period = bound ? orbitalPeriod(a, mu) : Infinity;
    const periapsis = p / (1 + e);
    const apoapsis = bound ? p / (1 - e) : Infinity;
    return { conic, a, e, p, h, energy, period, periapsis, apoapsis };
  }

  // src/integrators/state.ts
  function fromBodies(bodies) {
    const n = bodies.length;
    const masses = new Float64Array(n);
    const data = new Float64Array(6 * n);
    for (let i = 0; i < n; i++) {
      const b = bodies[i];
      masses[i] = b.mass;
      const o = 6 * i;
      data[o] = b.position.x;
      data[o + 1] = b.position.y;
      data[o + 2] = b.position.z;
      data[o + 3] = b.velocity.x;
      data[o + 4] = b.velocity.y;
      data[o + 5] = b.velocity.z;
    }
    return { n, masses, data };
  }
  function toBodies(state) {
    const { n, masses, data } = state;
    const out = [];
    for (let i = 0; i < n; i++) {
      const o = 6 * i;
      out.push({
        mass: masses[i],
        position: vec3(data[o], data[o + 1], data[o + 2]),
        velocity: vec3(data[o + 3], data[o + 4], data[o + 5])
      });
    }
    return out;
  }
  function buffersEqual(a, b) {
    if (a.length !== b.length) return false;
    const ua = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
    const ub = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
    for (let i = 0; i < ua.length; i++) {
      if (ua[i] !== ub[i]) return false;
    }
    return true;
  }
  function allFinite(data) {
    for (let i = 0; i < data.length; i++) {
      if (!Number.isFinite(data[i])) return false;
    }
    return true;
  }

  // src/integrators/force.ts
  function accelerations(data, masses, n, G2, softening, acc) {
    const soft2 = softening * softening;
    for (let k = 0; k < 3 * n; k++) acc[k] = 0;
    for (let i = 0; i < n; i++) {
      const oi = 6 * i;
      const xi = data[oi];
      const yi = data[oi + 1];
      const zi = data[oi + 2];
      const mi = masses[i];
      const ai = 3 * i;
      for (let j = i + 1; j < n; j++) {
        const oj = 6 * j;
        const dx = data[oj] - xi;
        const dy = data[oj + 1] - yi;
        const dz = data[oj + 2] - zi;
        const r2 = dx * dx + dy * dy + dz * dz + soft2;
        const invr = 1 / Math.sqrt(r2);
        const invr3 = invr * invr * invr;
        const gi = G2 * masses[j] * invr3;
        const gj = G2 * mi * invr3;
        const aj = 3 * j;
        acc[ai] = acc[ai] + gi * dx;
        acc[ai + 1] = acc[ai + 1] + gi * dy;
        acc[ai + 2] = acc[ai + 2] + gi * dz;
        acc[aj] = acc[aj] - gj * dx;
        acc[aj + 1] = acc[aj + 1] - gj * dy;
        acc[aj + 2] = acc[aj + 2] - gj * dz;
      }
    }
  }

  // src/integrators/index.ts
  var PEFRL_XI = 0.1786178958448091;
  var PEFRL_LAMBDA = -0.2123418310626054;
  var PEFRL_CHI = -0.0662645826698185;
  var FR_W1 = 1.3512071919596578;
  var FR_W0 = -1.7024143839193153;
  function assertCoefficientSet(set, integrator) {
    let sum = 0;
    for (const v of set.values) sum += v;
    const tol = set.ulpBudget * Number.EPSILON * Math.max(1, Math.abs(set.expectedSum));
    if (Math.abs(sum - set.expectedSum) > tol) {
      throw new RangeError(
        `${integrator}: ${set.label} coefficients sum to ${sum}, expected ${set.expectedSum} within ${set.ulpBudget} ULP`
      );
    }
  }
  function makeSymplectic(name, drift, kick, startsWithDrift, ulpBudget, n) {
    const coefficientSets = [
      { label: "drift", values: drift, expectedSum: 1, ulpBudget },
      { label: "kick", values: kick, expectedSum: 1, ulpBudget }
    ];
    for (const set of coefficientSets) assertCoefficientSet(set, name);
    const acc = new Float64Array(3 * n);
    const total = drift.length + kick.length;
    function step(state, dt, G2, softening) {
      const { data, masses } = state;
      let di = 0;
      let ki = 0;
      let isDrift = startsWithDrift;
      for (let op = 0; op < total; op++) {
        if (isDrift) {
          const c = drift[di++] * dt;
          for (let i = 0; i < n; i++) {
            const o = 6 * i;
            data[o] = data[o] + c * data[o + 3];
            data[o + 1] = data[o + 1] + c * data[o + 4];
            data[o + 2] = data[o + 2] + c * data[o + 5];
          }
        } else {
          accelerations(data, masses, n, G2, softening, acc);
          const c = kick[ki++] * dt;
          for (let i = 0; i < n; i++) {
            const o = 6 * i;
            const a = 3 * i;
            data[o + 3] = data[o + 3] + c * acc[a];
            data[o + 4] = data[o + 4] + c * acc[a + 1];
            data[o + 5] = data[o + 5] + c * acc[a + 2];
          }
        }
        isDrift = !isDrift;
      }
    }
    return { name, coefficientSets, step };
  }
  function leapfrog(n) {
    return makeSymplectic("leapfrog", [1], [0.5, 0.5], false, 0, n);
  }
  function pefrl(n) {
    const driftMid = 1 - 2 * (PEFRL_CHI + PEFRL_XI);
    const kickEnd = (1 - 2 * PEFRL_LAMBDA) / 2;
    const drift = [PEFRL_XI, PEFRL_CHI, driftMid, PEFRL_CHI, PEFRL_XI];
    const kick = [kickEnd, PEFRL_LAMBDA, PEFRL_LAMBDA, kickEnd];
    return makeSymplectic("pefrl", drift, kick, true, 0, n);
  }
  function forestRuth(n) {
    const c1 = FR_W1 / 2;
    const c2 = (FR_W0 + FR_W1) / 2;
    const drift = [c1, c2, c2, c1];
    const kick = [FR_W1, FR_W0, FR_W1];
    return makeSymplectic("forestRuth", drift, kick, true, 1, n);
  }
  function rk4Deriv(src, masses, n, G2, softening, acc, kOut) {
    accelerations(src, masses, n, G2, softening, acc);
    for (let i = 0; i < n; i++) {
      const o = 6 * i;
      const a = 3 * i;
      kOut[o] = src[o + 3];
      kOut[o + 1] = src[o + 4];
      kOut[o + 2] = src[o + 5];
      kOut[o + 3] = acc[a];
      kOut[o + 4] = acc[a + 1];
      kOut[o + 5] = acc[a + 2];
    }
  }
  function rk4(n) {
    const coefficientSets = [
      { label: "weights", values: [1 / 6, 1 / 3, 1 / 3, 1 / 6], expectedSum: 1, ulpBudget: 1 }
    ];
    for (const set of coefficientSets) assertCoefficientSet(set, "rk4");
    const m = 6 * n;
    const acc = new Float64Array(3 * n);
    const k1 = new Float64Array(m);
    const k2 = new Float64Array(m);
    const k3 = new Float64Array(m);
    const k4 = new Float64Array(m);
    const ytmp = new Float64Array(m);
    function step(state, dt, G2, softening) {
      const { data, masses } = state;
      rk4Deriv(data, masses, n, G2, softening, acc, k1);
      for (let i = 0; i < m; i++) ytmp[i] = data[i] + dt / 2 * k1[i];
      rk4Deriv(ytmp, masses, n, G2, softening, acc, k2);
      for (let i = 0; i < m; i++) ytmp[i] = data[i] + dt / 2 * k2[i];
      rk4Deriv(ytmp, masses, n, G2, softening, acc, k3);
      for (let i = 0; i < m; i++) ytmp[i] = data[i] + dt * k3[i];
      rk4Deriv(ytmp, masses, n, G2, softening, acc, k4);
      const h6 = dt / 6;
      for (let i = 0; i < m; i++) {
        data[i] = data[i] + h6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
      }
    }
    return { name: "rk4", coefficientSets, step };
  }
  function integratorByName(name, n) {
    switch (name) {
      case "leapfrog":
        return leapfrog(n);
      case "pefrl":
        return pefrl(n);
      case "forestRuth":
        return forestRuth(n);
      case "rk4":
        return rk4(n);
    }
  }

  // src/integrators/run.ts
  function recordTrajectory(spec) {
    const softening = spec.scene.softening ?? 0;
    const state = fromBodies(spec.scene.bodies);
    const integ = integratorByName(spec.integrator, state.n);
    const snapshots = [];
    const stepSizes = [];
    snapshots.push({ stepIndex: 0, time: 0, data: state.data.slice() });
    for (let s = 1; s <= spec.steps; s++) {
      integ.step(state, spec.dt, spec.scene.G, softening);
      stepSizes.push(spec.dt);
      if (!allFinite(state.data)) {
        throw new RangeError(`non-finite state at step ${s} (time ${s * spec.dt})`);
      }
      if (s % spec.snapshotEvery === 0) {
        snapshots.push({ stepIndex: s, time: s * spec.dt, data: state.data.slice() });
      }
    }
    return { spec, snapshots, stepSizes };
  }
  function assertConstantSteps(stepSizes) {
    for (let i = 1; i < stepSizes.length; i++) {
      if (stepSizes[i] !== stepSizes[0]) {
        throw new RangeError(`non-constant step sequence on the replay path at index ${i}`);
      }
    }
  }
  function replayTrajectory(traj) {
    assertConstantSteps(traj.stepSizes);
    const fresh = recordTrajectory(traj.spec);
    if (fresh.snapshots.length !== traj.snapshots.length) {
      throw new RangeError("replay produced a different snapshot count");
    }
    assertConstantSteps(fresh.stepSizes);
    for (let i = 0; i < traj.snapshots.length; i++) {
      const a = fresh.snapshots[i];
      const b = traj.snapshots[i];
      if (a.stepIndex !== b.stepIndex) {
        throw new RangeError(`replay snapshot ${i} is at a different step`);
      }
      if (!buffersEqual(a.data, b.data)) return false;
    }
    return true;
  }

  // src/lambert/bmw.ts
  var COLLINEAR_SIN_TOL = 1e-8;
  var BMW_TOL = 1e-10;
  var BMW_MAX_ITER = 300;
  var Z_SINGLE_REV_UPPER = (2 * Math.PI) ** 2;
  function clampUnit(x) {
    return x < -1 ? -1 : x > 1 ? 1 : x;
  }
  function lambertBMW(r1, r2, tof, mu, options = {}) {
    const r1n = norm(r1);
    const r2n = norm(r2);
    const c12 = cross(r1, r2);
    const sinDth = norm(c12) / (r1n * r2n);
    if (sinDth < COLLINEAR_SIN_TOL) {
      throw new RangeError("Lambert: collinear positions, transfer plane is undefined");
    }
    const cosDth = clampUnit(dot(r1, r2) / (r1n * r2n));
    const prograde = !(options.retrograde ?? false);
    const principal = Math.acos(cosDth);
    let dth;
    if (prograde) {
      dth = c12.z >= 0 ? principal : TWO_PI - principal;
    } else {
      dth = c12.z < 0 ? principal : TWO_PI - principal;
    }
    const A = Math.sin(dth) * Math.sqrt(r1n * r2n / (1 - Math.cos(dth)));
    const sqrtMu = Math.sqrt(mu);
    const yOf = (z2) => {
      const { C: C2, S: S2 } = stumpff(z2);
      return r1n + r2n + A * (z2 * S2 - 1) / Math.sqrt(C2);
    };
    let z = 0;
    while (yOf(z) < 0) z += 0.1;
    let converged2 = false;
    for (let iter = 0; iter < BMW_MAX_ITER; iter++) {
      const { C: C2, S: S2 } = stumpff(z);
      const y2 = r1n + r2n + A * (z * S2 - 1) / Math.sqrt(C2);
      if (y2 < 0) {
        z += 0.1;
        continue;
      }
      const sqrtY = Math.sqrt(y2);
      const F = (y2 / C2) ** 1.5 * S2 + A * sqrtY - sqrtMu * tof;
      let dFdz;
      if (z === 0) {
        const y0 = y2;
        dFdz = Math.SQRT2 / 40 * y0 ** 1.5 + A / 8 * (Math.sqrt(y0) + A * Math.sqrt(1 / (2 * y0)));
      } else {
        dFdz = (y2 / C2) ** 1.5 * (1 / (2 * z) * (C2 - 3 * S2 / (2 * C2)) + 3 * S2 * S2 / (4 * C2)) + A / 8 * (3 * (S2 / C2) * sqrtY + A * Math.sqrt(C2 / y2));
      }
      const ratio = F / dFdz;
      let zNext = z - ratio;
      if (zNext >= Z_SINGLE_REV_UPPER) zNext = (z + Z_SINGLE_REV_UPPER) / 2;
      const step = z - zNext;
      z = zNext;
      if (!Number.isFinite(z)) throw new RangeError("Lambert BMW: non-finite z");
      if (Math.abs(step) <= BMW_TOL) {
        converged2 = true;
        break;
      }
    }
    if (!converged2) throw new RangeError(`Lambert BMW did not converge in ${BMW_MAX_ITER} iterations`);
    const { C, S } = stumpff(z);
    const y = r1n + r2n + A * (z * S - 1) / Math.sqrt(C);
    const f = 1 - y / r1n;
    const g = A * Math.sqrt(y / mu);
    const gdot = 1 - y / r2n;
    const v1 = scale(sub(r2, scale(r1, f)), 1 / g);
    const v2 = scale(sub(scale(r2, gdot), r1), 1 / g);
    return { v1, v2 };
  }

  // src/lambert/izzo.ts
  var HOUSEHOLDER_TOL = 1e-13;
  var HOUSEHOLDER_MAX_ITER = 60;
  function timeOfFlight(x, lambda, revs) {
    const a = 1 / (1 - x * x);
    if (a > 0) {
      const alpha2 = 2 * Math.acos(x);
      let beta2 = 2 * Math.asin(Math.sqrt(lambda * lambda / a));
      if (lambda < 0) beta2 = -beta2;
      return a * Math.sqrt(a) * (alpha2 - Math.sin(alpha2) - (beta2 - Math.sin(beta2)) + TWO_PI * revs) / 2;
    }
    const alpha = 2 * Math.acosh(x);
    let beta = 2 * Math.asinh(Math.sqrt(-(lambda * lambda) / a));
    if (lambda < 0) beta = -beta;
    return -a * Math.sqrt(-a) * (beta - Math.sinh(beta) - (alpha - Math.sinh(alpha))) / 2;
  }
  function tofDerivatives(x, lambda, revs) {
    const T = timeOfFlight(x, lambda, revs);
    const l2 = lambda * lambda;
    const l3 = l2 * lambda;
    const l5 = l3 * l2;
    const omx2 = 1 - x * x;
    const y = Math.sqrt(1 - l2 * omx2);
    const y3 = y * y * y;
    const y5 = y3 * y * y;
    const dT = 1 / omx2 * (3 * T * x - 2 + 2 * l3 * x / y);
    const ddT = 1 / omx2 * (3 * T + 5 * x * dT + 2 * (1 - l2) * l3 / y3);
    const dddT = 1 / omx2 * (7 * x * ddT + 8 * dT - 6 * (1 - l2) * l5 * x / y5);
    return [T, dT, ddT, dddT];
  }
  function householder2(target, x0, lambda, revs) {
    let x = x0;
    for (let i = 0; i < HOUSEHOLDER_MAX_ITER; i++) {
      const [T, dT, ddT, dddT] = tofDerivatives(x, lambda, revs);
      const f = T - target;
      const denom = dT * (dT * dT - f * ddT) + dddT * f * f / 6;
      const delta = f * (dT * dT - f * ddT / 2) / denom;
      x -= delta;
      if (!Number.isFinite(x)) break;
      if (Math.abs(delta) < HOUSEHOLDER_TOL) return x;
    }
    return x;
  }
  function solveSingleRev(target, lambda) {
    const T1 = 2 / 3 * (1 - lambda * lambda * lambda);
    let xl;
    let xh;
    if (target > T1) {
      xl = -1 + 1e-12;
      xh = 1 - 1e-12;
    } else {
      xl = 1 + 1e-12;
      xh = 2;
      let guard = 0;
      while (timeOfFlight(xh, lambda, 0) > target) {
        xh = 1 + (xh - 1) * 2;
        if (++guard > 100) break;
      }
    }
    let x = (xl + xh) / 2;
    let dxOld = Math.abs(xh - xl);
    let dx = dxOld;
    let [tof, dT] = tofDerivatives(x, lambda, 0);
    let f = tof - target;
    for (let i = 0; i < HOUSEHOLDER_MAX_ITER; i++) {
      const newtonOutOfRange = ((x - xh) * dT - f) * ((x - xl) * dT - f) > 0;
      const newtonTooSlow = Math.abs(2 * f) > Math.abs(dxOld * dT);
      if (newtonOutOfRange || newtonTooSlow) {
        dxOld = dx;
        dx = (xh - xl) / 2;
        x = xl + dx;
      } else {
        dxOld = dx;
        dx = f / dT;
        x -= dx;
      }
      if (Math.abs(dx) <= HOUSEHOLDER_TOL * (1 + Math.abs(x))) break;
      [tof, dT] = tofDerivatives(x, lambda, 0);
      f = tof - target;
      if (f > 0) xl = x;
      else xh = x;
    }
    return x;
  }
  function minimumTimeX(lambda, revs) {
    let x = 0;
    for (let i = 0; i < 24; i++) {
      const [, dT, ddT, dddT] = tofDerivatives(x, lambda, revs);
      const denom = 2 * ddT * ddT - dT * dddT;
      if (denom === 0) break;
      const delta = 2 * dT * ddT / denom;
      x -= delta;
      if (!Number.isFinite(x)) break;
      if (Math.abs(delta) < 1e-13) break;
    }
    return x;
  }
  function geometry(r1, r2, retrograde) {
    const r1n = norm(r1);
    const r2n = norm(r2);
    const c = norm(cross(r1, r2)) / (r1n * r2n);
    if (c < COLLINEAR_SIN_TOL) {
      throw new RangeError("Lambert: collinear positions, transfer plane is undefined");
    }
    const chord = norm(sub(r2, r1));
    const s = (r1n + r2n + chord) / 2;
    const ir1 = normalize(r1);
    const ir2 = normalize(r2);
    const ih = normalize(cross(ir1, ir2));
    let lambda = Math.sqrt(1 - chord / s);
    let it1;
    let it2;
    if (ih.z < 0) {
      lambda = -lambda;
      it1 = normalize(cross(ir1, ih));
      it2 = normalize(cross(ir2, ih));
    } else {
      it1 = normalize(cross(ih, ir1));
      it2 = normalize(cross(ih, ir2));
    }
    if (retrograde) {
      lambda = -lambda;
      it1 = neg(it1);
      it2 = neg(it2);
    }
    return { r1n, r2n, chord, s, ir1, ir2, it1, it2, lambda };
  }
  function velocities(x, geo, mu) {
    const { r1n, r2n, chord, s, ir1, ir2, it1, it2, lambda } = geo;
    const gamma = Math.sqrt(mu * s / 2);
    const rho = (r1n - r2n) / chord;
    const sigma = Math.sqrt(1 - rho * rho);
    const y = Math.sqrt(1 - lambda * lambda * (1 - x * x));
    const vr1 = gamma * (lambda * y - x - rho * (lambda * y + x)) / r1n;
    const vr2 = -gamma * (lambda * y - x + rho * (lambda * y + x)) / r2n;
    const vt1 = gamma * sigma * (y + lambda * x) / r1n;
    const vt2 = gamma * sigma * (y + lambda * x) / r2n;
    return {
      v1: add(scale(ir1, vr1), scale(it1, vt1)),
      v2: add(scale(ir2, vr2), scale(it2, vt2))
    };
  }
  function lambertIzzo(r1, r2, tof, mu, options = {}) {
    const geo = geometry(r1, r2, options.retrograde ?? false);
    const { s, lambda } = geo;
    const maxRevs = options.maxRevs ?? 0;
    const T = Math.sqrt(2 * mu / (s * s * s)) * tof;
    const results = [];
    const xSingle = solveSingleRev(T, lambda);
    results.push({ ...velocities(xSingle, geo, mu), revs: 0, rightBranch: false });
    const nMaxByTime = Math.floor(T / Math.PI);
    for (let m = 1; m <= Math.min(maxRevs, nMaxByTime); m++) {
      const xMin = minimumTimeX(lambda, m);
      const tMin = timeOfFlight(xMin, lambda, m);
      if (T < tMin) continue;
      const leftGuess = (((m * Math.PI + Math.PI) / (8 * T)) ** (2 / 3) - 1) / (((m * Math.PI + Math.PI) / (8 * T)) ** (2 / 3) + 1);
      const rightGuess = ((8 * T / (m * Math.PI)) ** (2 / 3) - 1) / ((8 * T / (m * Math.PI)) ** (2 / 3) + 1);
      const xLeft = householder2(T, leftGuess, lambda, m);
      const xRight = householder2(T, rightGuess, lambda, m);
      for (const [x, right] of [[xLeft, false], [xRight, true]]) {
        if (Math.abs(x) >= 1) continue;
        if (Math.abs(timeOfFlight(x, lambda, m) - T) > 1e-7) continue;
        results.push({ ...velocities(x, geo, mu), revs: m, rightBranch: right });
      }
    }
    return results;
  }
  function lambertIzzoSingle(r1, r2, tof, mu, retrograde = false) {
    const [solution] = lambertIzzo(r1, r2, tof, mu, { retrograde, maxRevs: 0 });
    return { v1: solution.v1, v2: solution.v2 };
  }

  // src/maneuvers/index.ts
  function assemble(burns) {
    let total = 0;
    for (const b of burns) total += b.dv;
    return { burns, totalDv: total };
  }
  function circularSpeed(r, mu) {
    return Math.sqrt(mu / r);
  }
  function hohmann(r1, r2, mu) {
    const vc1 = Math.sqrt(mu / r1);
    const vc2 = Math.sqrt(mu / r2);
    const aT = (r1 + r2) / 2;
    const vPeri = Math.sqrt(mu * (2 / r1 - 1 / aT));
    const vApo = Math.sqrt(mu * (2 / r2 - 1 / aT));
    return assemble([
      { name: "departure", dv: Math.abs(vPeri - vc1) },
      { name: "arrival", dv: Math.abs(vc2 - vApo) }
    ]);
  }
  function biElliptic(r1, r2, rb, mu) {
    const vc1 = Math.sqrt(mu / r1);
    const vc2 = Math.sqrt(mu / r2);
    const a1 = (r1 + rb) / 2;
    const a2 = (r2 + rb) / 2;
    const dv1 = Math.abs(Math.sqrt(mu * (2 / r1 - 1 / a1)) - vc1);
    const dv2 = Math.abs(Math.sqrt(mu * (2 / rb - 1 / a2)) - Math.sqrt(mu * (2 / rb - 1 / a1)));
    const dv3 = Math.abs(Math.sqrt(mu * (2 / r2 - 1 / a2)) - vc2);
    return assemble([
      { name: "departure", dv: dv1 },
      { name: "raise", dv: dv2 },
      { name: "circularize", dv: dv3 }
    ]);
  }
  function planeChange(v, inc) {
    return assemble([{ name: "plane change", dv: 2 * v * Math.abs(Math.sin(inc / 2)) }]);
  }
  function combinedPlaneChange(v1, v2, inc) {
    const half = Math.sin(inc / 2);
    const dv = Math.sqrt((v1 - v2) ** 2 + 4 * v1 * v2 * half * half);
    return assemble([{ name: "combined", dv }]);
  }
  function hohmannNondim(R) {
    return Math.sqrt(2 * R / (1 + R)) - 1 + 1 / Math.sqrt(R) * (1 - Math.sqrt(2 / (1 + R)));
  }
  function biEllipticNondim(R, rb) {
    const a1 = (1 + rb) / 2;
    const a2 = (R + rb) / 2;
    const dv1 = Math.sqrt(2 - 1 / a1) - 1;
    const dv2 = Math.sqrt(2 / rb - 1 / a2) - Math.sqrt(2 / rb - 1 / a1);
    const dv3 = Math.sqrt(2 / R - 1 / a2) - Math.sqrt(1 / R);
    return dv1 + dv2 + dv3;
  }
  function biEllipticLimitNondim(R) {
    return (Math.SQRT2 - 1) * (1 + 1 / Math.sqrt(R));
  }
  function bisect(f, lo, hi) {
    let a = lo;
    let b = hi;
    const fa = f(a);
    for (let k = 0; k < 200; k++) {
      const m = (a + b) / 2;
      const fm = f(m);
      if (fa * fm <= 0) b = m;
      else a = m;
      if (b - a < 1e-12) break;
    }
    return (a + b) / 2;
  }
  function biEllipticLowerRatio() {
    return bisect((R) => biEllipticLimitNondim(R) - hohmannNondim(R), 5, 25);
  }
  function biEllipticUpperRatio() {
    const gradientAtR2 = (R) => {
      const h = 1e-4 * R;
      return (biEllipticNondim(R, R + h) - biEllipticNondim(R, R - h)) / (2 * h);
    };
    return bisect((R) => -gradientAtR2(R), 12, 20);
  }
  function recommendTransfer(R) {
    if (R < biEllipticLowerRatio()) return "hohmann";
    if (R > biEllipticUpperRatio()) return "bielliptic";
    return "conditional";
  }

  // src/transfer/ephemeris.ts
  function keplerEphemeris(epochState, mu, epochTime = 0) {
    return {
      stateAt(timeSeconds) {
        const s = propagateUniversal(epochState.r, epochState.v, timeSeconds - epochTime, mu);
        return { r: s.r, v: s.v };
      }
    };
  }
  var AU_KM_CURTIS = 149597871;
  var STANDISH_EARTH = {
    a: 1.00000011,
    aRate: -5e-8,
    e: 0.01671022,
    eRate: -3804e-8,
    inc: 5e-5,
    incRate: -46.94,
    raan: -11.26064,
    raanRate: -18228.25,
    lonPeri: 102.94719,
    lonPeriRate: 1198.28,
    meanLon: 100.46435,
    meanLonRate: 12959774063e-2
  };
  var STANDISH_MARS = {
    a: 1.52366231,
    aRate: -7221e-8,
    e: 0.09341233,
    eRate: 11902e-8,
    inc: 1.85061,
    incRate: -25.47,
    raan: 49.57854,
    raanRate: -1020.19,
    lonPeri: 336.04084,
    lonPeriRate: 1560.78,
    meanLon: 355.45332,
    meanLonRate: 6890510378e-2
  };
  var DEG = Math.PI / 180;
  function reduce360(deg) {
    const r = deg % 360;
    return r < 0 ? r + 360 : r;
  }
  function planetStateAtJD(el, jd, muSun, auKm = AU_KM_CURTIS) {
    const t = (jd - J2000_JD) / 36525;
    const aKm = (el.a + el.aRate * t) * auKm;
    const e = el.e + el.eRate * t;
    const incDeg = reduce360(el.inc + el.incRate / 3600 * t);
    const raanDeg = reduce360(el.raan + el.raanRate / 3600 * t);
    const lonPeriDeg = reduce360(el.lonPeri + el.lonPeriRate / 3600 * t);
    const meanLonDeg = reduce360(el.meanLon + el.meanLonRate / 3600 * t);
    const argpDeg = reduce360(lonPeriDeg - raanDeg);
    const meanAnom = reduce360(meanLonDeg - lonPeriDeg) * DEG;
    const eAnom = danby(
      (x) => x - e * Math.sin(x) - meanAnom,
      (x) => 1 - e * Math.cos(x),
      (x) => e * Math.sin(x),
      meanAnom
    );
    const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(eAnom / 2), Math.sqrt(1 - e) * Math.cos(eAnom / 2));
    return coeToRv(aKm, e, incDeg * DEG, raanDeg * DEG, argpDeg * DEG, nu, muSun);
  }
  function standishEphemeris(el, muSun, auKm = AU_KM_CURTIS) {
    return {
      stateAt(timeSeconds) {
        return planetStateAtJD(el, J2000_JD + timeSeconds / 86400, muSun, auKm);
      }
    };
  }

  // src/transfer/patchedconic.ts
  function sphereOfInfluence(aPlanet, muPlanet, muSun) {
    return aPlanet * (muPlanet / muSun) ** (2 / 5);
  }
  function transferArc(rDepart, vDepartPlanet, rArrive, vArrivePlanet, tof, muSun, options = {}) {
    const { v1, v2 } = lambertBMW(rDepart, rArrive, tof, muSun, options);
    return {
      vDepart: v1,
      vArrive: v2,
      vInfDepart: norm(sub(v1, vDepartPlanet)),
      vInfArrive: norm(sub(v2, vArrivePlanet))
    };
  }
  function departureDeltaV(vInf, rPark, muPlanet) {
    const vHyperbola = Math.sqrt(vInf * vInf + 2 * muPlanet / rPark);
    const vCircular = Math.sqrt(muPlanet / rPark);
    return vHyperbola - vCircular;
  }

  // src/transfer/porkchop.ts
  function porkchopScan(departure, arrival, grid, muSun, options = {}) {
    const nDeparture = grid.departureTimes.length;
    const nArrival = grid.arrivalTimes.length;
    const c3 = new Float64Array(nDeparture * nArrival);
    const vInfArrive = new Float64Array(nDeparture * nArrival);
    const feasible = new Uint8Array(nDeparture * nArrival);
    for (let d = 0; d < nDeparture; d++) {
      const tDep = grid.departureTimes[d];
      for (let a = 0; a < nArrival; a++) {
        const tArr = grid.arrivalTimes[a];
        const idx = d * nArrival + a;
        const tof = tArr - tDep;
        if (tof <= 0) continue;
        const dep = departure.stateAt(tDep);
        const arr = arrival.stateAt(tArr);
        try {
          const arc = transferArc(dep.r, dep.v, arr.r, arr.v, tof, muSun, options);
          c3[idx] = arc.vInfDepart * arc.vInfDepart;
          vInfArrive[idx] = arc.vInfArrive;
          feasible[idx] = 1;
        } catch {
        }
      }
    }
    return { nDeparture, nArrival, c3, vInfArrive, feasible };
  }

  // src/cr3bp/index.ts
  var PRIMARY_EPS = 1e-12;
  function earthMoonMassParameter() {
    return 1 / (1 + EARTH_MOON_MASS_RATIO);
  }
  function sunEarthMassParameter() {
    return (MU_EARTH + MU_MOON) / (MU_SUN + MU_EARTH + MU_MOON);
  }
  function assertValidMu(mu) {
    if (!(mu > 0 && mu < 1)) {
      throw new RangeError(`CR3BP mass parameter must be in (0, 1), got ${mu}`);
    }
  }
  function geometry2(x, y, z, mu) {
    const dx1 = x + mu;
    const dx2 = x - (1 - mu);
    const r1 = Math.sqrt(dx1 * dx1 + y * y + z * z);
    const r2 = Math.sqrt(dx2 * dx2 + y * y + z * z);
    return { dx1, dx2, r1, r2 };
  }
  function effectivePotential(pos, mu) {
    assertValidMu(mu);
    const { r1, r2 } = geometry2(pos.x, pos.y, pos.z, mu);
    if (r1 < PRIMARY_EPS || r2 < PRIMARY_EPS) {
      throw new RangeError("CR3BP effective potential is singular on a primary");
    }
    return 0.5 * (pos.x * pos.x + pos.y * pos.y) + (1 - mu) / r1 + mu / r2;
  }
  function effectivePotentialGradient(pos, mu) {
    assertValidMu(mu);
    const { dx1, dx2, r1, r2 } = geometry2(pos.x, pos.y, pos.z, mu);
    if (r1 < PRIMARY_EPS || r2 < PRIMARY_EPS) {
      throw new RangeError("CR3BP effective potential gradient is singular on a primary");
    }
    const r1c = r1 * r1 * r1;
    const r2c = r2 * r2 * r2;
    const gx = pos.x - (1 - mu) * dx1 / r1c - mu * dx2 / r2c;
    const gy = pos.y - (1 - mu) * pos.y / r1c - mu * pos.y / r2c;
    const gz = -((1 - mu) * pos.z) / r1c - mu * pos.z / r2c;
    return vec3(gx, gy, gz);
  }
  function jacobiConstant(pos, vel, mu) {
    const omega = effectivePotential(pos, mu);
    return 2 * omega - (vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
  }
  function solveCollinear(f, df, x0, name) {
    let x = x0;
    for (let i = 0; i < 100; i++) {
      const fx = f(x);
      if (Math.abs(fx) <= 1e-13) return x;
      const step = fx / df(x);
      x -= step;
      if (!Number.isFinite(x)) break;
    }
    if (Math.abs(f(x)) <= 1e-13) return x;
    throw new RangeError(`CR3BP collinear point ${name} did not converge`);
  }
  function lagrangePoints(mu) {
    assertValidMu(mu);
    const gamma = (mu / 3) ** (1 / 3);
    const x1 = solveCollinear(
      (x) => x - (1 - mu) / (x + mu) ** 2 + mu / (1 - mu - x) ** 2,
      (x) => 1 + 2 * (1 - mu) / (x + mu) ** 3 + 2 * mu / (1 - mu - x) ** 3,
      1 - mu - gamma,
      "L1"
    );
    const x2 = solveCollinear(
      (x) => x - (1 - mu) / (x + mu) ** 2 - mu / (x - (1 - mu)) ** 2,
      (x) => 1 + 2 * (1 - mu) / (x + mu) ** 3 + 2 * mu / (x - (1 - mu)) ** 3,
      1 - mu + gamma,
      "L2"
    );
    const x3 = solveCollinear(
      (x) => x + (1 - mu) / (x + mu) ** 2 + mu / (x - (1 - mu)) ** 2,
      (x) => 1 - 2 * (1 - mu) / (x + mu) ** 3 - 2 * mu / (x - (1 - mu)) ** 3,
      -(1 + 5 / 12 * mu),
      "L3"
    );
    const sqrt3over2 = Math.sqrt(3) / 2;
    return {
      L1: vec3(x1, 0, 0),
      L2: vec3(x2, 0, 0),
      L3: vec3(x3, 0, 0),
      L4: vec3(0.5 - mu, sqrt3over2, 0),
      L5: vec3(0.5 - mu, -sqrt3over2, 0)
    };
  }
  function gravityGradient(x, y, z, mu) {
    const { dx1, dx2, r1, r2 } = geometry2(x, y, z, mu);
    if (r1 < PRIMARY_EPS || r2 < PRIMARY_EPS) {
      throw new RangeError("CR3BP gravity is singular on a primary");
    }
    const r1c = r1 * r1 * r1;
    const r2c = r2 * r2 * r2;
    return vec3(
      -((1 - mu) * dx1) / r1c - mu * dx2 / r2c,
      -((1 - mu) * y) / r1c - mu * y / r2c,
      -((1 - mu) * z) / r1c - mu * z / r2c
    );
  }
  function propagateRotating(initial, mu, dt, steps, sampleEvery) {
    assertValidMu(mu);
    let x = initial.pos.x;
    let y = initial.pos.y;
    let z = initial.pos.z;
    let px = initial.vel.x - y;
    let py = initial.vel.y + x;
    let pz = initial.vel.z;
    const out = [];
    const record = () => {
      out.push({ pos: vec3(x, y, z), vel: vec3(px + y, py - x, pz) });
    };
    record();
    const c = Math.cos(dt);
    const s = Math.sin(dt);
    const half = dt / 2;
    for (let n = 1; n <= steps; n++) {
      let g = gravityGradient(x, y, z, mu);
      px += half * g.x;
      py += half * g.y;
      pz += half * g.z;
      const a = x + px * dt;
      const b = y + py * dt;
      const nx = a * c + b * s;
      const ny = b * c - a * s;
      const npx = px * c + py * s;
      const npy = py * c - px * s;
      x = nx;
      y = ny;
      z = z + pz * dt;
      px = npx;
      py = npy;
      g = gravityGradient(x, y, z, mu);
      px += half * g.x;
      py += half * g.y;
      pz += half * g.z;
      if (n % sampleEvery === 0) record();
    }
    return out;
  }
  return __toCommonJS(index_exports);
})();
