"""Vulture whitelist for the external differential suite.

These names are live, not dead code. Vulture (run by the global pre-commit hook on
only the staged Python files) cannot see the cross-module references that prove it:

- oracles.py wrappers (elements_from_rv, rv_from_elements, the maneuver and Lagrange
  oracles) and tolerances.py constants are imported and called by the per-category
  test modules (test_elements.py, test_maneuvers.py, test_lagrange.py, test_standish.py),
  which are not necessarily in the same commit.
- conftest.load_horizons is used by test_standish.py; pytest_sessionfinish and its
  session/exitstatus parameters are a pytest hook signature called by the framework.
- iers.conf.auto_download and data_conf.allow_internet are astropy config assignments
  whose effect (forcing offline operation) is the point; they are not reads.

The bare names below are how a vulture whitelist marks a name as used; the
"# noqa: F821" keeps ruff from flagging them as undefined in this reference-only file.
Regenerate the names with: vulture --make-whitelist <staged .py files>
"""

_.auto_download  # noqa: F821
_.allow_internet  # noqa: F821
_.auto_download  # noqa: F821
_.allow_internet  # noqa: F821
load_horizons  # noqa: F821
pytest_sessionfinish  # noqa: F821
exitstatus  # noqa: F821
session  # noqa: F821
elements_from_rv  # noqa: F821
rv_from_elements  # noqa: F821
hohmann_total_dv  # noqa: F821
bielliptic_total_dv  # noqa: F821
plane_change_dv  # noqa: F821
combined_plane_change_dv  # noqa: F821
lagrange_collinear_x_brentq  # noqa: F821
lagrange_collinear_x_hapsira  # noqa: F821
collinear_residual  # noqa: F821
ELEMENTS_FWD_RTOL  # noqa: F821
ELEMENTS_INV_RTOL  # noqa: F821
MANEUVER_DV_RTOL  # noqa: F821
MANEUVER_DV_ATOL  # noqa: F821
LAGRANGE_EQUILATERAL_RTOL  # noqa: F821
LAGRANGE_EQUILATERAL_ATOL  # noqa: F821
LAGRANGE_COLLINEAR_RTOL  # noqa: F821
LAGRANGE_COLLINEAR_ATOL  # noqa: F821
LAGRANGE_COLLINEAR_RESIDUAL_ATOL  # noqa: F821
STANDISH_POS_ATOL_AU  # noqa: F821
STANDISH_VEL_ATOL_AUPD  # noqa: F821
standish_pos_rtol  # noqa: F821
