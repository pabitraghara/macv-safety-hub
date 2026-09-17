"use client";

import { Check } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  SEVERITY_ORDER,
  sortIssuesBySeverity,
  type SafetyAnalysis,
} from "@/lib/safety-analysis";
import {
  SEVERITY_BADGE_CLASS,
  SEVERITY_DOT_CLASS,
  SEVERITY_TEXT_CLASS,
  SeverityIcon,
} from "./severity";

/**
 * Renders a parsed safety analysis the same way the safety agent does: a row of
 * severity tiles, the prose summary, then one accordion row per issue ordered
 * most severe first.
 */
export function SafetyAnalysisCard({ analysis }: { analysis: SafetyAnalysis }) {
  const issues = sortIssuesBySeverity(analysis.issues);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SEVERITY_ORDER.map((severity) => {
          const count = analysis.countsBySeverity[severity];
          return (
            <div
              key={severity}
              className={`flex items-center justify-between rounded-md border px-3 py-2 transition-all hover:shadow-sm ${
                count > 0 ? SEVERITY_BADGE_CLASS[severity] : "bg-muted/40"
              }`}
            >
              <div className="flex items-center space-x-2">
                <SeverityIcon severity={severity} />
                <span className="text-xs font-medium">{severity}</span>
              </div>
              <span
                className={`text-sm font-bold ${count === 0 ? "text-muted-foreground" : ""}`}
              >
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {analysis.summary && (
        <div className="bg-muted/30 rounded-lg border p-4">
          <h3 className="mb-1.5 text-sm font-medium">Summary</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {analysis.summary}
          </p>
        </div>
      )}

      {issues.length === 0 ? (
        <div className="bg-muted/30 flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-8">
          <Check className="mb-3 h-10 w-10 text-green-500" />
          <h3 className="text-md mb-1 font-medium">No issues detected</h3>
          <p className="text-muted-foreground text-center text-sm">
            The safety analysis did not find any issues in this clip.
          </p>
        </div>
      ) : (
        <Accordion
          type="multiple"
          className="w-full overflow-hidden rounded-lg border"
        >
          {issues.map((issue) => (
            <AccordionItem key={issue.id} value={issue.id} className="px-1">
              <AccordionTrigger className="hover:bg-muted/40 px-3 text-sm font-medium">
                <div className="flex items-center">
                  <div
                    className={`mr-2 ${SEVERITY_TEXT_CLASS[issue.severity]}`}
                  >
                    <SeverityIcon severity={issue.severity} />
                  </div>
                  {issue.name}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pt-1 pb-3">
                <div className="mb-1.5 flex items-center">
                  <div
                    className={`mr-2 h-2 w-2 rounded-full ${SEVERITY_DOT_CLASS[issue.severity]}`}
                  />
                  <span
                    className={`text-xs ${SEVERITY_TEXT_CLASS[issue.severity]}`}
                  >
                    {issue.severity} severity
                  </span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {issue.description}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
