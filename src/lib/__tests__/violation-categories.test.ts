import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

import {
  categorizeViolation,
  OTHER_CATEGORY,
} from "@/lib/violation-categories";
import { parseSafetyAnalysis } from "@/lib/safety-analysis";

describe("categorizeViolation", () => {
  it.each([
    ["Unprotected Fall Hazard", "Fall & Edge Protection"],
    ["Inadequate Guardrail Protection", "Fall & Edge Protection"],
    ["Inadequate Personal Protective Equipment (PPE)", "PPE Compliance"],
    ["Lack of Visible Safety Signage", "Signage & Barricading"],
    ["Poor Housekeeping and Cluttered Work Area", "Housekeeping & Storage"],
    ["Unsecured Electrical Cables on Floor", "Electrical"],
    [
      "Exposure to Moving Machinery and Overhead Cranes",
      "Machinery & Vehicles",
    ],
  ])("puts %s in %s", (name, expected) => {
    expect(categorizeViolation(name)).toBe(expected);
  });

  it("groups the PPE name variants the agent produces into one bucket", () => {
    const variants = [
      "Inadequate Personal Protective Equipment (PPE)",
      "Inadequate Personal Protective Equipment (PPE) Compliance",
      "Improper Use of Personal Protective Equipment (PPE)",
      "Lack of Visible PPE Compliance",
    ];
    const buckets = new Set(variants.map(categorizeViolation));
    expect(buckets).toEqual(new Set(["PPE Compliance"]));
  });

  it("prefers the fall rule over PPE for a fall-arrest harness", () => {
    expect(categorizeViolation("Missing Fall Arrest Harness")).toBe(
      "Fall & Edge Protection",
    );
  });

  it("does not force an unrelated name into a bucket", () => {
    expect(categorizeViolation("Unclear supervisor briefing")).toBe(
      OTHER_CATEGORY,
    );
  });

  it("leaves only a small tail uncategorised across the real corpus", () => {
    const records: { description: string }[] = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "public", "observations.json"),
        "utf-8",
      ),
    );
    const names = records.flatMap((r) =>
      parseSafetyAnalysis(r.description).issues.map((i) => i.name),
    );
    expect(names.length).toBeGreaterThan(400);

    const other = names.filter(
      (n) => categorizeViolation(n) === OTHER_CATEGORY,
    );
    // A guard against the rules silently rotting, not a quality target.
    expect(other.length / names.length).toBeLessThan(0.15);
  });
});
