# Kitchen cost baseline and comparison

Read-only tools for checking that kitchen costs did not change.

    node scripts/kitchen-cost/snapshot.mjs <out-dir> --backup   # JSON + CSV baseline of every price and every recipe/event cost, plus a raw backup of the kl_* tables
    node scripts/kitchen-cost/snapshot.mjs compare <baseline.json>   # recompute with the site's own code and report any difference

Costs are computed with lib/kitchen/data.ts + algorithms.ts (the code the site runs). Tolerance: 0.0001.
