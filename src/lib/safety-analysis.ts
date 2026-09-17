/**
 * Parser for the raw safety-agent output stored alongside each clip in
 * `public/data/*.txt` and inlined into `public/observations.json` as
 * `description`.
 *
 * The file has two sections:
 *
 *   OBSERVATIONS
 *   ==================================================
 *   {'severity': 'High', 'name': '...', 'description': '...'}
 *   {'severity': 'Medium', 'name': '...', 'description': "..."}
 *
 *   DESCRIPTION
 *   ==================================================
 *   <prose summary>
 *
 * The issue blocks are Python dict literals, not JSON: keys and values are
 * normally single-quoted, but `repr` switches a value to double quotes as soon
 * as it contains an apostrophe ("the 'Safe Zone' sign"). Swapping quotes and
 * calling JSON.parse corrupts the first kind and a fixed regex misses the
 * second, so the blocks are scanned character by character instead.
 */

export const SEVERITY_ORDER = ["Critical", "High", "Medium", "Low"] as const;

export type Severity = (typeof SEVERITY_ORDER)[number] | "Unknown";

export interface SafetyIssue {
  id: string;
  name: string;
  severity: Severity;
  description: string;
}

export interface SafetyAnalysis {
  /** Issues in the order the agent reported them. */
  issues: SafetyIssue[];
  /** The prose summary from the DESCRIPTION section, or "" when absent. */
  summary: string;
  /** Highest severity across `issues`, or "Unknown" when there are none. */
  maxSeverity: Severity;
  /** Issue count per severity, always containing every key in SEVERITY_ORDER. */
  countsBySeverity: Record<Severity, number>;
}

const SUMMARY_HEADING = /DESCRIPTION\s*\n=+\s*\n/;

const QUOTES = ["'", '"'];

/** Read a quoted string starting at `start`, returning its value and end index. */
function readQuoted(
  text: string,
  start: number,
): { value: string; next: number } | null {
  const quote = text[start];
  if (!QUOTES.includes(quote)) return null;

  let value = "";
  let i = start + 1;
  while (i < text.length) {
    const char = text[i];
    if (char === "\\" && i + 1 < text.length) {
      value += text[i + 1];
      i += 2;
      continue;
    }
    if (char === quote) return { value, next: i + 1 };
    value += char;
    i += 1;
  }
  return null;
}

function skipSpace(text: string, start: number): number {
  let i = start;
  while (i < text.length && /\s/.test(text[i])) i += 1;
  return i;
}

/**
 * Parse one `{'key': 'value', ...}` literal beginning at `start`. Returns null
 * for anything that is not a flat dict of string keys to string values, which
 * is all the agent emits.
 */
function readDict(
  text: string,
  start: number,
): { fields: Record<string, string>; next: number } | null {
  if (text[start] !== "{") return null;

  const fields: Record<string, string> = {};
  let i = skipSpace(text, start + 1);

  while (i < text.length) {
    if (text[i] === "}") return { fields, next: i + 1 };

    const key = readQuoted(text, i);
    if (!key) return null;

    i = skipSpace(text, key.next);
    if (text[i] !== ":") return null;
    i = skipSpace(text, i + 1);

    const value = readQuoted(text, i);
    if (!value) return null;
    fields[key.value] = value.value;

    i = skipSpace(text, value.next);
    if (text[i] === ",") i = skipSpace(text, i + 1);
  }
  return null;
}

function normalizeSeverity(raw: string | undefined): Severity {
  const match = SEVERITY_ORDER.find(
    (level) => level.toLowerCase() === (raw ?? "").trim().toLowerCase(),
  );
  return match ?? "Unknown";
}

function emptyCounts(): Record<Severity, number> {
  return { Critical: 0, High: 0, Medium: 0, Low: 0, Unknown: 0 };
}

export function parseSafetyAnalysis(rawText: string | null): SafetyAnalysis {
  if (!rawText) {
    return {
      issues: [],
      summary: "",
      maxSeverity: "Unknown",
      countsBySeverity: emptyCounts(),
    };
  }

  // Collapse CRLF so the section split does not depend on line endings.
  const text = rawText.replace(/\r\n/g, "\n");
  const observationsText = text.split(SUMMARY_HEADING)[0];

  const issues: SafetyIssue[] = [];
  let cursor = observationsText.indexOf("{");
  while (cursor !== -1) {
    const dict = readDict(observationsText, cursor);
    if (dict && dict.fields.name) {
      issues.push({
        id: `issue-${issues.length}`,
        name: dict.fields.name.trim(),
        severity: normalizeSeverity(dict.fields.severity),
        description: (dict.fields.description ?? "").trim(),
      });
      cursor = observationsText.indexOf("{", dict.next);
    } else {
      cursor = observationsText.indexOf("{", cursor + 1);
    }
  }

  const countsBySeverity = issues.reduce(
    (counts, issue) => ({
      ...counts,
      [issue.severity]: counts[issue.severity] + 1,
    }),
    emptyCounts(),
  );

  const maxSeverity =
    SEVERITY_ORDER.find((level) => countsBySeverity[level] > 0) ?? "Unknown";

  const sections = text.split(SUMMARY_HEADING);
  const summary = sections.length > 1 ? sections[1].trim() : "";

  return { issues, summary, maxSeverity, countsBySeverity };
}

/** Sort issues most-severe first, preserving agent order within a severity. */
export function sortIssuesBySeverity(issues: SafetyIssue[]): SafetyIssue[] {
  const rank = (severity: Severity) => {
    const index = SEVERITY_ORDER.indexOf(
      severity as (typeof SEVERITY_ORDER)[number],
    );
    return index === -1 ? SEVERITY_ORDER.length : index;
  };
  return [...issues].sort((a, b) => rank(a.severity) - rank(b.severity));
}
