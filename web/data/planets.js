/**
 * Standish (1992) mean orbital elements of the eight planet-system barycenters,
 * referred to the mean ecliptic and equinox of J2000, as reproduced in Curtis,
 * Orbital Mechanics for Engineering Students, Table 8.1. Angles in degrees, angle
 * rates in arcseconds per Julian century, a in AU and aRate in AU per century, e
 * dimensionless and eRate per century. These are the same numbers the external
 * validation layer commits in verify-external/data/standish_all_planets.json; the
 * Earth and Mars rows match the core's own STANDISH_EARTH and STANDISH_MARS exactly.
 *
 * They are fed unchanged to the core's planetStateAtJD (Curtis Algorithm 8.1). This
 * is an approximate low-precision model, accurate to a few arcminutes over
 * 1800-2050; it is not an ephemeris-grade prediction.
 *
 * color and dotSize are display-only. auKm is the astronomical unit in km that
 * Curtis Chapter 8 uses, passed to planetStateAtJD.
 */
window.AU_KM = 1.49597871e8

window.PLANETS = [
  { name: 'Mercury', color: '#b08d6a', dotSize: 3, el: {
    a: 0.38709893, aRate: 0.00000066, e: 0.20563069, eRate: 0.00002527,
    inc: 7.00487, incRate: -23.51, raan: 48.33167, raanRate: -446.30,
    lonPeri: 77.45645, lonPeriRate: 573.57, meanLon: 252.25084, meanLonRate: 538101628.29 } },
  { name: 'Venus', color: '#d9b38c', dotSize: 5, el: {
    a: 0.72333199, aRate: 0.00000092, e: 0.00677323, eRate: -0.00004938,
    inc: 3.39471, incRate: -2.86, raan: 76.68069, raanRate: -996.89,
    lonPeri: 131.53298, lonPeriRate: -108.80, meanLon: 181.97973, meanLonRate: 210664136.06 } },
  { name: 'Earth', color: '#5b9bd5', dotSize: 5, el: {
    a: 1.00000011, aRate: -0.00000005, e: 0.01671022, eRate: -0.00003804,
    inc: 0.00005, incRate: -46.94, raan: -11.26064, raanRate: -18228.25,
    lonPeri: 102.94719, lonPeriRate: 1198.28, meanLon: 100.46435, meanLonRate: 129597740.63 } },
  { name: 'Mars', color: '#c1440e', dotSize: 4, el: {
    a: 1.52366231, aRate: -0.00007221, e: 0.09341233, eRate: 0.00011902,
    inc: 1.85061, incRate: -25.47, raan: 49.57854, raanRate: -1020.19,
    lonPeri: 336.04084, lonPeriRate: 1560.78, meanLon: 355.45332, meanLonRate: 68905103.78 } },
  { name: 'Jupiter', color: '#d8a05a', dotSize: 11, el: {
    a: 5.20336301, aRate: 0.00060737, e: 0.04839266, eRate: -0.00012880,
    inc: 1.30530, incRate: -4.15, raan: 100.55615, raanRate: 1217.17,
    lonPeri: 14.75385, lonPeriRate: 839.93, meanLon: 34.40438, meanLonRate: 10925078.35 } },
  { name: 'Saturn', color: '#e0c887', dotSize: 10, el: {
    a: 9.53707032, aRate: -0.00301530, e: 0.05415060, eRate: -0.00036762,
    inc: 2.48446, incRate: 6.11, raan: 113.71504, raanRate: -1591.05,
    lonPeri: 92.43194, lonPeriRate: -1948.89, meanLon: 49.94432, meanLonRate: 4401052.95 } },
  { name: 'Uranus', color: '#9fd3d8', dotSize: 8, el: {
    a: 19.19126393, aRate: 0.00152025, e: 0.04716771, eRate: -0.00019150,
    inc: 0.76986, incRate: -2.09, raan: 74.22988, raanRate: -1681.40,
    lonPeri: 170.96424, lonPeriRate: 1312.56, meanLon: 313.23218, meanLonRate: 1542547.79 } },
  { name: 'Neptune', color: '#5b7fd5', dotSize: 8, el: {
    a: 30.06896348, aRate: -0.00125196, e: 0.00858587, eRate: 0.00002510,
    inc: 1.76917, incRate: -3.64, raan: 131.72169, raanRate: -151.25,
    lonPeri: 44.97135, lonPeriRate: -844.43, meanLon: 304.88003, meanLonRate: 786449.21 } },
]
