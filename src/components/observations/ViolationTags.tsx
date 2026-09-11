'use client';

import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, X, Loader2, Tag } from 'lucide-react';
import { observationsApi } from '@/api/observations';
import type { Violation, ViolationType } from '@/api/observations/types';
import { toast } from 'sonner';

const TAG_COLOR_PALETTE = [
  { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' }, // violet
  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' }, // blue
  { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' }, // rose
  { bg: '#fffbeb', text: '#b45309', border: '#fde68a' }, // amber
  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' }, // emerald
  { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' }, // cyan
  { bg: '#fdf2f8', text: '#be185d', border: '#fbcfe8' }, // pink
  { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' }, // indigo
  { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' }, // orange
  { bg: '#f0fdfa', text: '#0f766e', border: '#99f6e4' }, // teal
];

function getTagColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLOR_PALETTE[Math.abs(hash) % TAG_COLOR_PALETTE.length];
}

// ── Read-only display (used in the list page) ──────────────────────────────

interface ViolationTagsDisplayProps {
  violations: Violation[];
  max?: number;
}

export function ViolationTagsDisplay({ violations, max = 3 }: ViolationTagsDisplayProps) {
  if (!violations || violations.length === 0) {
    return <span className="text-xs text-gray-400">None</span>;
  }

  const shown = violations.slice(0, max);
  const overflow = violations.length - max;

  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((v) => {
        const color = getTagColor(v.violation_type?.name ?? 'Unknown');
        return (
          <Badge
            key={v.id}
            variant="outline"
            className="text-xs font-normal"
            style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
          >
            {v.violation_type?.name ?? 'Unknown'}
          </Badge>
        );
      })}
      {overflow > 0 && (
        <Badge variant="outline" className="text-xs text-gray-500 border-gray-200 font-normal">
          +{overflow}
        </Badge>
      )}
    </div>
  );
}

// ── Editor (used in the detail page sidebar) ──────────────────────────────

interface ViolationTagsEditorProps {
  code: string;
  violations: Violation[];
  onUpdate: (violations: Violation[]) => void;
}

export function ViolationTagsEditor({ code, violations, onUpdate }: ViolationTagsEditorProps) {
  const [violationTypes, setViolationTypes] = useState<ViolationType[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    observationsApi.getViolationTypes().then(setViolationTypes).catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const taggedTypeIds = new Set(violations.map((v) => v.violation_type_id));
  const available = violationTypes.filter((vt) => !taggedTypeIds.has(vt.id));

  const handleAdd = async (vt: ViolationType) => {
    setAdding(vt.id);
    setShowDropdown(false);
    try {
      const newViolation = await observationsApi.addViolation(code, { violation_type_id: vt.id });
      onUpdate([...violations, newViolation]);
    } catch {
      toast.error('Failed to add violation tag');
    } finally {
      setAdding(null);
    }
  };

  const handleRemove = async (violation: Violation) => {
    setRemoving(violation.id);
    try {
      await observationsApi.removeViolation(code, violation.id);
      onUpdate(violations.filter((v) => v.id !== violation.id));
    } catch {
      toast.error('Failed to remove violation tag');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {violations.length === 0 && (
          <span className="text-xs text-gray-400 italic">No violations tagged</span>
        )}
        {violations.map((v) => {
          const color = getTagColor(v.violation_type?.name ?? 'Unknown');
          return (
            <Badge
              key={v.id}
              variant="outline"
              className="text-xs font-normal pr-1 flex items-center gap-1"
              style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
            >
              <Tag className="h-2.5 w-2.5" />
              {v.violation_type?.name ?? 'Unknown'}
              <button
                onClick={() => handleRemove(v)}
                disabled={removing === v.id}
                className="ml-0.5 hover:text-red-600 disabled:opacity-50 transition-colors"
                aria-label={`Remove ${v.violation_type?.name}`}
              >
                {removing === v.id ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : (
                  <X className="h-2.5 w-2.5" />
                )}
              </button>
            </Badge>
          );
        })}
        {adding && (
          <Badge variant="outline" className="text-xs text-gray-400 border-gray-200 font-normal">
            <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" />
            Adding...
          </Badge>
        )}
      </div>

      {available.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowDropdown((p) => !p)}
          >
            <Plus className="h-3 w-3" />
            Add tag
          </Button>
          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-md min-w-[180px] max-h-56 overflow-y-auto">
              {available.map((vt) => {
                const color = getTagColor(vt.name);
                return (
                  <button
                    key={vt.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                    onClick={() => handleAdd(vt)}
                  >
                    <Tag className="h-3 w-3 flex-shrink-0" style={{ color: color.text }} />
                    <span>{vt.name}</span>
                    {vt.category && (
                      <span className="text-xs text-gray-400 ml-auto">{vt.category}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
