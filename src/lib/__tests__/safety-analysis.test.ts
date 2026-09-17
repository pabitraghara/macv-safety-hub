import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import {
  parseSafetyAnalysis,
  sortIssuesBySeverity,
  type SafetyIssue,
} from "@/lib/safety-analysis";

const SAMPLE = [
  "OBSERVATIONS",
  "==================================================",
  "",
  "{'severity': 'High', 'name': 'Unsecured Cables', 'description': 'Cables lie loose on the floor.'}",
  "",
  // Python switches to double quotes when the value contains an apostrophe.
  "{'severity': 'Medium', 'name': 'Inadequate Signage', 'description': \"The 'Safe Zone' sign is unclear.\"}",
  "",
  "{'severity': 'Low', 'name': 'Poor Storage', 'description': 'Tools are scattered.'}",
  "",
  "",
  "DESCRIPTION",
  "==================================================",
  "",
  "The video shows several hazards.",
].join("\r\n");

describe("parseSafetyAnalysis", () => {
  it("returns an empty analysis for missing text", () => {
    const analysis = parseSafetyAnalysis(null);
    expect(analysis.issues).toEqual([]);
    expect(analysis.summary).toBe("");
    expect(analysis.maxSeverity).toBe("Unknown");
    expect(analysis.countsBySeverity.High).toBe(0);
  });

  it("extracts every issue including double-quoted values", () => {
    const { issues } = parseSafetyAnalysis(SAMPLE);
    expect(issues).toHaveLength(3);
    expect(issues[1]).toMatchObject({
      name: "Inadequate Signage",
      severity: "Medium",
      description: "The 'Safe Zone' sign is unclear.",
    });
  });

  it("splits out the prose summary", () => {
    expect(parseSafetyAnalysis(SAMPLE).summary).toBe(
      "The video shows several hazards.",
    );
  });

  it("derives counts and the maximum severity from the issues", () => {
    const { countsBySeverity, maxSeverity } = parseSafetyAnalysis(SAMPLE);
    expect(maxSeverity).toBe("High");
    expect(countsBySeverity).toMatchObject({
      Critical: 0,
      High: 1,
      Medium: 1,
      Low: 1,
    });
  });

  it("does not mistake a brace in the summary for an issue", () => {
    const { issues, summary } = parseSafetyAnalysis(
      `${SAMPLE} A stray { brace and {'severity': 'Critical'} literal.`,
    );
    expect(issues).toHaveLength(3);
    expect(summary).toContain("stray {");
  });

  it("marks an unrecognised severity as Unknown", () => {
    const { issues, maxSeverity } = parseSafetyAnalysis(
      "{'severity': 'Severe', 'name': 'Odd', 'description': 'x'}",
    );
    expect(issues[0].severity).toBe("Unknown");
    expect(maxSeverity).toBe("Unknown");
  });
});

describe("sortIssuesBySeverity", () => {
  const issue = (name: string, severity: SafetyIssue["severity"]) =>
    ({ id: name, name, severity, description: "" }) as SafetyIssue;

  it("orders most severe first and leaves the input untouched", () => {
    const input = [
      issue("a", "Low"),
      issue("b", "Critical"),
      issue("c", "Unknown"),
      issue("d", "Medium"),
    ];
    expect(sortIssuesBySeverity(input).map((i) => i.name)).toEqual([
      "b",
      "d",
      "a",
      "c",
    ]);
    expect(input[0].name).toBe("a");
  });

  it("keeps agent order within one severity", () => {
    const input = [issue("first", "High"), issue("second", "High")];
    expect(sortIssuesBySeverity(input).map((i) => i.name)).toEqual([
      "first",
      "second",
    ]);
  });
});

describe("the real observations.json corpus", () => {
  const records: { code: string; description: string }[] = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "public", "observations.json"),
      "utf-8",
    ),
  );

  it("parses every record into issues and a summary", () => {
    expect(records.length).toBeGreaterThan(0);

    for (const record of records) {
      const analysis = parseSafetyAnalysis(record.description);
      // Every dict literal in the OBSERVATIONS section must be accounted for.
      const literalCount = (
        record.description
          .split(/DESCRIPTION\r?\n=+/)[0]
          .match(/\{'severity':/g) ?? []
      ).length;

      expect(analysis.issues, record.code).toHaveLength(literalCount);
      expect(analysis.summary, record.code).not.toBe("");
      expect(analysis.maxSeverity, record.code).not.toBe("Unknown");
      for (const issue of analysis.issues) {
        expect(issue.name, record.code).not.toBe("");
        expect(issue.description, record.code).not.toBe("");
      }
    }
  });
});
