/**
 * Groups free-text issue names into violation categories.
 *
 * The safety agent writes a fresh name for every issue rather than picking
 * from a taxonomy — the current archive has 271 distinct names across 448
 * issues, with the same hazard appearing as "Inadequate Personal Protective
 * Equipment (PPE)", "...(PPE) Compliance" and "Improper Use of Personal
 * Protective Equipment (PPE)". Charting the raw names buries every real
 * pattern in that long tail, so they are bucketed by keyword here.
 *
 * This is a presentation-level approximation of the taxonomy a backend would
 * provide, not a classifier. Rules are matched in order and the first hit
 * wins, so more specific hazards must come before the generic ones. Anything
 * unmatched lands in "Other" rather than being forced into a bucket; the exact
 * agent wording is always still visible on the clip's own accordion.
 */

export const OTHER_CATEGORY = "Other";

interface CategoryRule {
  label: string;
  keywords: string[];
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    // First, because "fall protection harness" and "guardrail" would otherwise
    // be caught by the PPE and structural rules below.
    label: "Fall & Edge Protection",
    keywords: [
      "fall",
      "height",
      "elevated",
      "guardrail",
      "guard rail",
      "railing",
      "handrail",
      "edge protection",
      "harness",
      "opening",
    ],
  },
  {
    label: "PPE Compliance",
    keywords: [
      "ppe",
      "protective equipment",
      "hard hat",
      "hardhat",
      "helmet",
      "safety vest",
      "high-visibility",
      "high visibility",
      "glove",
      "goggle",
      "eye protection",
      "face shield",
      "respirator",
      "footwear",
      "safety boot",
      "hearing protection",
    ],
  },
  {
    label: "Electrical",
    keywords: ["electric", "cable", "wiring", "wire", "power line", "voltage"],
  },
  {
    label: "Fire & Hot Work",
    keywords: [
      "fire",
      "hot work",
      "welding",
      "spark",
      "flammable",
      "gas cylinder",
      "cylinder",
      "combustible",
    ],
  },
  {
    label: "Machinery & Vehicles",
    keywords: [
      "crane",
      "machinery",
      "machine",
      "forklift",
      "vehicle",
      "excavator",
      "moving equipment",
      "lifting",
      "load",
      "traffic",
    ],
  },
  {
    label: "Scaffolding & Access",
    keywords: [
      "scaffold",
      "ladder",
      "platform",
      "walkway",
      "access route",
      "staircase",
      "stair",
      "structural",
    ],
  },
  {
    label: "Excavation & Confined Space",
    keywords: ["excavat", "trench", "confined space", "pit", "shoring"],
  },
  {
    label: "Signage & Barricading",
    keywords: [
      "signage",
      "sign",
      "barricade",
      "barrier",
      "cordon",
      "demarcat",
      "warning",
      "perimeter",
      "fencing",
      "restricted",
    ],
  },
  {
    label: "Housekeeping & Storage",
    keywords: [
      "housekeeping",
      "clutter",
      "debris",
      "obstruct",
      "storage",
      "stacking",
      "stacked",
      "material",
      "tripping",
      "trip hazard",
      "spill",
      "waste",
      "ground surface",
      "uneven",
      "organization",
      "organisation",
    ],
  },
];

/** Every label `categorizeViolation` can return, including OTHER_CATEGORY. */
export const CATEGORY_LABELS: string[] = [
  ...CATEGORY_RULES.map((rule) => rule.label),
  OTHER_CATEGORY,
];

/** Bucket one issue name. Returns OTHER_CATEGORY when nothing matches. */
export function categorizeViolation(name: string): string {
  const haystack = name.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      return rule.label;
    }
  }
  return OTHER_CATEGORY;
}
