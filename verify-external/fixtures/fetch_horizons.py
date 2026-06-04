"""One-time JPL Horizons fixture fetch for the external validation layer.

Run by hand, with network, once. Its output (horizons_planets.json) is committed
so the differential suite runs offline afterward. This script is never invoked by
the test run.

It fetches heliocentric, ecliptic-of-J2000, geometric state vectors (no light-time,
no aberration) for the eight planet-system barycenters, so the comparison frame
matches the Standish elements, which are referred to the J2000 ecliptic and are
heliocentric and barycenter-based.

Usage:
    verify-external/.venv/Scripts/python.exe verify-external/fixtures/fetch_horizons.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from astropy.utils import iers
from astropy.utils.data import conf as data_conf
from astroquery.jplhorizons import Horizons

# Astropy IERS auto-download is not needed for geometric vectors; disable it so a
# missing network cannot trigger a silent download. This one script is the only
# place internet access is allowed; the test run leaves it off.
iers.conf.auto_download = False
data_conf.allow_internet = True

# IAU 2012 astronomical unit in km (exact by definition); used only for the km copy.
AU_KM = 149597870.700

# Barycenter NAIF ids, matching the Standish element provenance.
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

# Epoch grid (Julian dates, TDB) spread across the Standish 1800-2050 window so the
# centennial rates are exercised. Julian-year spacing about J2000; the exact value
# does not matter as long as model and truth use the same jd, which they do by
# construction (the emitter reads these jds back from the committed fixture).
EPOCHS_JD = [2415020.0, 2433282.5, 2451545.0, 2469807.5]  # ~1900, 1950, 2000, 2050

EXPECTED_AU = {  # rough heliocentric distance, for a sanity gate
    "mercury": 0.39,
    "venus": 0.72,
    "earth": 1.0,
    "mars": 1.52,
    "jupiter": 5.2,
    "saturn": 9.5,
    "uranus": 19.2,
    "neptune": 30.1,
}


def fetch_body(name: str, naif_id: int) -> list[dict]:
    obj = Horizons(id=str(naif_id), id_type=None, location="@sun", epochs=EPOCHS_JD)
    tab = obj.vectors(refplane="ecliptic", aberrations="geometric")
    records = []
    for row in tab:
        r_au = [float(row["x"]), float(row["y"]), float(row["z"])]
        v_aupd = [float(row["vx"]), float(row["vy"]), float(row["vz"])]
        dist = (r_au[0] ** 2 + r_au[1] ** 2 + r_au[2] ** 2) ** 0.5
        exp = EXPECTED_AU[name]
        if not (0.5 * exp <= dist <= 1.5 * exp):
            raise SystemExit(
                f"sanity gate failed for {name}: |r| = {dist:.4f} AU, expected near {exp} AU. "
                f"Frame or body id is wrong."
            )
        records.append(
            {
                "body": name,
                "naif_id": naif_id,
                "jd_tdb": float(row["datetime_jd"]),
                "frame": "ecliptic-J2000",
                "origin": "sun",
                "units": {"position": "AU", "velocity": "AU/day"},
                "r_au": r_au,
                "v_aupd": v_aupd,
                "r_km": [c * AU_KM for c in r_au],
                "v_kms": [c * AU_KM / 86400.0 for c in v_aupd],
                "source": "JPL Horizons vectors, location=@sun, refplane=ecliptic, aberrations=geometric",
            }
        )
    return records


def main() -> int:
    out_path = Path(__file__).resolve().parent / "horizons_planets.json"
    all_records: list[dict] = []
    for name, naif_id in BODIES.items():
        print(f"fetching {name} (barycenter {naif_id}) ...", flush=True)
        try:
            all_records.extend(fetch_body(name, naif_id))
        except Exception as exc:  # fail loud, never commit a partial fixture
            print(f"ERROR fetching {name}: {exc}", file=sys.stderr)
            return 1
    doc = {
        "meta": {
            "description": "JPL Horizons heliocentric ecliptic-J2000 geometric state vectors for the "
            "eight planet-system barycenters, the external Oracle A truth.",
            "epochs_jd_tdb": EPOCHS_JD,
            "au_km": AU_KM,
            "frame": "ecliptic-J2000",
            "origin": "sun",
            "geometry": "geometric (no light-time, no aberration)",
            "time_note": "Horizons vector epochs are TDB; the core treats jd as TT. TDB-TT is at "
            "most about 1.7 ms, far below the Standish accuracy envelope, so it is carried "
            "as a bounded documented offset and not corrected.",
        },
        "bodyCount": len(BODIES),
        "records": all_records,
    }
    out_path.write_text(json.dumps(doc, indent=1), encoding="utf-8")
    print(f"wrote {len(all_records)} records for {len(BODIES)} bodies -> {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
