"""One-time JPL Horizons short-span fixture fetch (Oracle A, second check).

Run by hand, with network, once. Its output (horizons_shortspan.json) is committed
so the differential suite runs offline afterward. This script is never invoked by
the test run, and it never touches the committed horizons_planets.json.

It fetches, for each of the eight planet-system barycenters, a base heliocentric
ecliptic-J2000 geometric state at a base epoch and the true state a short time
later, at several short spans. The differential suite propagates the base state
with the engine's two-body propagateUniversal and checks it against the later
Horizons state. Over a short span the real motion is dominated by the two-body
term, so this is the engine's two-body propagator measured against real dynamics
within the two-body model's short-span truncation envelope (it is an approximate
check, never held to machine precision).

Frame matches horizons_planets.json: heliocentric (location=@sun), ecliptic of
J2000 (refplane=ecliptic), geometric (no light-time, no aberration).

Usage:
    verify-external/.venv/Scripts/python.exe verify-external/fixtures/fetch_horizons_shortspan.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from astropy.utils import iers
from astropy.utils.data import conf as data_conf
from astroquery.jplhorizons import Horizons

iers.conf.auto_download = False
data_conf.allow_internet = True

AU_KM = 149597870.700  # IAU 2012 astronomical unit (exact), used for the km copy.

BODIES = {
    "mercury": 1,
    "venus": 2,
    "earth": 3,
    "mars": 4,
    "jupiter": 5,
    "saturn": 6,
    "uranus": 7,
    "neptune": 8,
}

# Base epoch near J2000 (well inside the Standish window) and short spans in days.
# The spans are deliberately short so the neglected third-body perturbation over the
# span stays small (relative position error grows like 0.5 a_perturb dt^2): a few
# days to a few tens of days exercises the propagator without leaving the two-body
# regime. The longest span is still under half of Mercury's 88 day period.
BASE_JD_TDB = 2451545.0
SPAN_DAYS = [2.0, 10.0, 40.0]

EXPECTED_AU = {
    "mercury": 0.39,
    "venus": 0.72,
    "earth": 1.0,
    "mars": 1.52,
    "jupiter": 5.2,
    "saturn": 9.5,
    "uranus": 19.2,
    "neptune": 30.1,
}


def _state_at(naif_id: int, jd: float) -> tuple[list[float], list[float]]:
    obj = Horizons(id=str(naif_id), id_type=None, location="@sun", epochs=[jd])
    tab = obj.vectors(refplane="ecliptic", aberrations="geometric")
    row = tab[0]
    r_au = [float(row["x"]), float(row["y"]), float(row["z"])]
    v_aupd = [float(row["vx"]), float(row["vy"]), float(row["vz"])]
    return r_au, v_aupd


def _to_km(r_au: list[float], v_aupd: list[float]) -> tuple[list[float], list[float]]:
    r_km = [c * AU_KM for c in r_au]
    v_kms = [c * AU_KM / 86400.0 for c in v_aupd]
    return r_km, v_kms


def fetch_body(name: str, naif_id: int) -> list[dict]:
    r0_au, v0_au = _state_at(naif_id, BASE_JD_TDB)
    dist = (r0_au[0] ** 2 + r0_au[1] ** 2 + r0_au[2] ** 2) ** 0.5
    exp = EXPECTED_AU[name]
    if not (0.5 * exp <= dist <= 1.5 * exp):
        raise SystemExit(
            f"sanity gate failed for {name}: |r| = {dist:.4f} AU, expected near {exp} AU."
        )
    r0_km, v0_kms = _to_km(r0_au, v0_au)
    pairs = []
    for span in SPAN_DAYS:
        jd1 = BASE_JD_TDB + span
        r1_au, v1_au = _state_at(naif_id, jd1)
        r1_km, v1_kms = _to_km(r1_au, v1_au)
        pairs.append(
            {
                "body": name,
                "naif_id": naif_id,
                "jd0_tdb": BASE_JD_TDB,
                "jd1_tdb": jd1,
                "span_days": span,
                "span_seconds": span * 86400.0,
                "frame": "ecliptic-J2000",
                "origin": "sun",
                "r0_km": r0_km,
                "v0_kms": v0_kms,
                "r1_km": r1_km,
                "v1_kms": v1_kms,
                "r0_au": r0_au,
                "v0_aupd": v0_au,
                "r1_au": r1_au,
                "v1_aupd": v1_au,
                "source": "JPL Horizons vectors, location=@sun, refplane=ecliptic, aberrations=geometric",
            }
        )
    return pairs


def main() -> int:
    out_path = Path(__file__).resolve().parent / "horizons_shortspan.json"
    all_pairs: list[dict] = []
    for name, naif_id in BODIES.items():
        print(
            f"fetching {name} (barycenter {naif_id}) short-span pairs ...", flush=True
        )
        try:
            all_pairs.extend(fetch_body(name, naif_id))
        except Exception as exc:
            print(f"ERROR fetching {name}: {exc}", file=sys.stderr)
            return 1
    doc = {
        "meta": {
            "description": "JPL Horizons heliocentric ecliptic-J2000 geometric short-span "
            "state pairs for the eight planet-system barycenters, the external Oracle A "
            "second check (two-body propagation of a real state against the real state a "
            "short time later).",
            "base_jd_tdb": BASE_JD_TDB,
            "span_days": SPAN_DAYS,
            "au_km": AU_KM,
            "frame": "ecliptic-J2000",
            "origin": "sun",
            "geometry": "geometric (no light-time, no aberration)",
            "time_note": "Horizons vector epochs are TDB; the core treats jd as TT. The "
            "TDB-TT difference is at most about 1.7 ms and, being a near-common offset on "
            "both endpoints of a short span, is far below the two-body truncation envelope "
            "this check measures.",
        },
        "bodyCount": len(BODIES),
        "pairs": all_pairs,
    }
    out_path.write_text(json.dumps(doc, indent=1), encoding="utf-8")
    print(
        f"wrote {len(all_pairs)} short-span pairs for {len(BODIES)} bodies -> {out_path}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
