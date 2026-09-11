'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Loader2, AlertCircle, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import { incidentsApi } from '@/api/incidents';
import { useFilters } from '@/api/filters';
import type { CreateIncidentRequest } from '@/api/incidents/types';
import type { FilterOption } from '@/api/filters/types';
import { toast } from 'sonner';

const SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'] as const;
const PRIORITY_OPTIONS = [
  { value: 1, label: 'Very Low' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Medium' },
  { value: 4, label: 'High' },
  { value: 5, label: 'Critical' },
] as const;

function getOccurrenceDateOptions() {
  const now = new Date();
  return [
    { value: 'now', label: 'Now', date: new Date(now) },
    { value: '30min', label: '30 minutes ago', date: new Date(now.getTime() - 30 * 60 * 1000) },
    { value: '1hour', label: '1 hour ago', date: new Date(now.getTime() - 60 * 60 * 1000) },
    { value: '2hours', label: '2 hours ago', date: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
    { value: 'today', label: 'Earlier today', date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0) },
    { value: 'yesterday', label: 'Yesterday', date: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    { value: 'custom', label: 'Custom date & time', date: null },
  ];
}

function getDueDateOptions() {
  const now = new Date();
  return [
    { value: 'today', label: 'End of today', date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59) },
    { value: 'tomorrow', label: 'End of tomorrow', date: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
    { value: '3days', label: 'In 3 days', date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) },
    { value: '1week', label: 'In 1 week', date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
    { value: '2weeks', label: 'In 2 weeks', date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) },
    { value: '1month', label: 'In 1 month', date: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()) },
    { value: 'custom', label: 'Custom date & time', date: null },
  ];
}

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const INITIAL_FORM: Partial<CreateIncidentRequest> = {
  title: '',
  description: '',
  severity: 'Medium',
  incident_type_id: '',
  site_id: '',
  department_id: '',
  occurred_at: new Date().toISOString(),
  priority: 2,
};

type AddIncidentDialogProps = {
  children?: React.ReactNode;
  onSuccess?: () => void;
};

export function AddIncidentDialog({ children, onSuccess }: AddIncidentDialogProps) {
  const [open, setOpen] = useState(false);
  const { filters, loading: filtersLoading } = useFilters('incidents');

  const [formData, setFormData] = useState<Partial<CreateIncidentRequest>>(INITIAL_FORM);

  const [occurredDate, setOccurredDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(() => new Date(Date.now() + 24 * 60 * 60 * 1000));

  const [occurredDateOption, setOccurredDateOption] = useState('now');
  const [dueDateOption, setDueDateOption] = useState('tomorrow');
  const [showOccurredDatePicker, setShowOccurredDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  const [selectedIncidentType, setSelectedIncidentType] = useState<FilterOption | null>(null);
  const [selectedSite, setSelectedSite] = useState<FilterOption | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<FilterOption | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<FilterOption | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const incidentTypeOptions: FilterOption[] = filters.find((f) => f.id === 'incident_type_id')?.options ?? [];
  const siteOptions: FilterOption[] = filters.find((f) => f.id === 'site_id')?.options ?? [];
  const departmentOptions: FilterOption[] = filters.find((f) => f.id === 'department_id')?.options ?? [];
  const assigneeOptions: FilterOption[] = filters.find((f) => f.id === 'assigned_to')?.options ?? [];

  const clearError = (field: string) => setErrors((prev) => ({ ...prev, [field]: '' }));

  const handleInputChange = (field: keyof CreateIncidentRequest, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  };

  const handleOccurrenceDateOptionChange = (option: string) => {
    setOccurredDateOption(option);
    const selected = getOccurrenceDateOptions().find((o) => o.value === option);
    if (option === 'custom') {
      setShowOccurredDatePicker(true);
    } else {
      setShowOccurredDatePicker(false);
      if (selected?.date) setOccurredDate(selected.date);
    }
    clearError('occurred_at');
  };

  const handleDueDateOptionChange = (option: string) => {
    setDueDateOption(option);
    const selected = getDueDateOptions().find((o) => o.value === option);
    if (option === 'custom') {
      setShowDueDatePicker(true);
    } else {
      setShowDueDatePicker(false);
      if (selected?.date) setDueDate(selected.date);
    }
    clearError('due_date');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title?.trim()) newErrors.title = 'Title is required';
    if (!formData.site_id) newErrors.site_id = 'Site is required';
    if (!occurredDate) newErrors.occurred_at = 'Occurrence date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setOccurredDate(new Date());
    setDueDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
    setOccurredDateOption('now');
    setDueDateOption('tomorrow');
    setShowOccurredDatePicker(false);
    setShowDueDatePicker(false);
    setSelectedIncidentType(null);
    setSelectedSite(null);
    setSelectedDepartment(null);
    setSelectedAssignee(null);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      const createData: CreateIncidentRequest = {
        title: formData.title!,
        description: formData.description || undefined,
        severity: formData.severity!,
        incident_type_id: formData.incident_type_id || undefined,
        site_id: formData.site_id!,
        department_id: formData.department_id || undefined,
        occurred_at: occurredDate.toISOString(),
        priority: formData.priority ?? 2,
        meta_data: formData.meta_data ?? {},
      };

      const newIncident = await incidentsApi.createIncident(createData);

      if (selectedAssignee && newIncident.code) {
        try {
          await incidentsApi.assignIncident(newIncident.code, selectedAssignee.value);
        } catch {
          toast.error('Failed to assign incident');
        }
      }

      if (dueDate && newIncident.code) {
        try {
          await incidentsApi.changeDueDate(newIncident.code, dueDate.toISOString());
        } catch {
          toast.error('Failed to set due date');
        }
      }

      toast.success('Incident created successfully', {
        description: `Incident ${newIncident.code} has been created.`,
      });

      resetForm();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to create incident', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button size="sm" className="h-8">
            <Plus className="h-4 w-4 mr-1" />
            Add Incident
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create New Incident</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <form id="incident-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="inc-title" className="text-sm font-medium text-gray-900">
                Title *
              </label>
              <Input
                id="inc-title"
                value={formData.title ?? ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter incident title"
                className={`focus-visible:ring-0 focus-visible:outline-none ${errors.title ? 'border-red-500' : ''}`}
              />
              {errors.title && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="inc-description" className="text-sm font-medium text-gray-900">
                Description
              </label>
              <Textarea
                id="inc-description"
                value={formData.description ?? ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the incident in detail"
                className="min-h-[100px] focus-visible:ring-0 focus-visible:outline-none"
              />
            </div>

            {/* Two-column grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Severity */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Severity *</label>
                <div className="border rounded-md px-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors w-full focus:outline-none focus-visible:ring-0">
                        <span className="text-sm text-gray-900 flex-1 text-left">
                          {formData.severity ?? 'Medium'}
                        </span>
                        <ChevronDown className="h-3 w-3 text-gray-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                      {SEVERITY_OPTIONS.map((s) => (
                        <DropdownMenuItem
                          key={s}
                          className="cursor-pointer"
                          onClick={() => handleInputChange('severity', s)}
                        >
                          {s}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Priority</label>
                <div className="border rounded-md px-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors w-full focus:outline-none focus-visible:ring-0">
                        <span className="text-sm text-gray-900 flex-1 text-left">
                          {PRIORITY_OPTIONS.find((p) => p.value === formData.priority)?.label ?? 'Low'}
                        </span>
                        <ChevronDown className="h-3 w-3 text-gray-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                      {PRIORITY_OPTIONS.map((p) => (
                        <DropdownMenuItem
                          key={p.value}
                          className="cursor-pointer"
                          onClick={() => handleInputChange('priority', p.value)}
                        >
                          {p.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Incident Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Incident Type</label>
                <div className="border rounded-md px-1">
                  {filtersLoading ? (
                    <div className="flex items-center gap-2 text-gray-500 p-1">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors w-full focus:outline-none focus-visible:ring-0">
                          <span className="text-sm text-gray-900 flex-1 text-left">
                            {selectedIncidentType?.label ?? 'Select type'}
                          </span>
                          <ChevronDown className="h-3 w-3 text-gray-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedIncidentType(null);
                            setFormData((prev) => ({ ...prev, incident_type_id: '' }));
                          }}
                        >
                          None
                        </DropdownMenuItem>
                        {incidentTypeOptions.map((opt) => (
                          <DropdownMenuItem
                            key={opt.value}
                            className="cursor-pointer"
                            onClick={() => {
                              setSelectedIncidentType(opt);
                              setFormData((prev) => ({ ...prev, incident_type_id: opt.value }));
                            }}
                          >
                            {opt.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Assignee */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Assignee</label>
                <div className="border rounded-md px-1">
                  {filtersLoading ? (
                    <div className="flex items-center gap-2 text-gray-500 p-1">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors w-full focus:outline-none focus-visible:ring-0">
                          <span className="text-sm text-gray-900 flex-1 text-left">
                            {selectedAssignee?.label ?? 'Unassigned'}
                          </span>
                          <ChevronDown className="h-3 w-3 text-gray-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => setSelectedAssignee(null)}
                        >
                          Unassigned
                        </DropdownMenuItem>
                        {assigneeOptions.map((opt) => (
                          <DropdownMenuItem
                            key={opt.value}
                            className="cursor-pointer"
                            onClick={() => setSelectedAssignee(opt)}
                          >
                            {opt.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Site */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Site *</label>
                <div className={`border rounded-md px-1 ${errors.site_id ? 'border-red-500' : ''}`}>
                  {filtersLoading ? (
                    <div className="flex items-center gap-2 text-gray-500 p-1">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors w-full focus:outline-none focus-visible:ring-0">
                          <span className="text-sm text-gray-900 flex-1 text-left">
                            {selectedSite?.label ?? 'Select site'}
                          </span>
                          <ChevronDown className="h-3 w-3 text-gray-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        {siteOptions.map((opt) => (
                          <DropdownMenuItem
                            key={opt.value}
                            className="cursor-pointer"
                            onClick={() => {
                              setSelectedSite(opt);
                              setFormData((prev) => ({ ...prev, site_id: opt.value }));
                              clearError('site_id');
                            }}
                          >
                            {opt.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                {errors.site_id && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.site_id}
                  </p>
                )}
              </div>

              {/* Department */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Department</label>
                <div className="border rounded-md px-1">
                  {filtersLoading ? (
                    <div className="flex items-center gap-2 text-gray-500 p-1">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors w-full focus:outline-none focus-visible:ring-0">
                          <span className="text-sm text-gray-900 flex-1 text-left">
                            {selectedDepartment?.label ?? 'Select department'}
                          </span>
                          <ChevronDown className="h-3 w-3 text-gray-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedDepartment(null);
                            setFormData((prev) => ({ ...prev, department_id: '' }));
                          }}
                        >
                          None
                        </DropdownMenuItem>
                        {departmentOptions.map((opt) => (
                          <DropdownMenuItem
                            key={opt.value}
                            className="cursor-pointer"
                            onClick={() => {
                              setSelectedDepartment(opt);
                              setFormData((prev) => ({ ...prev, department_id: opt.value }));
                            }}
                          >
                            {opt.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Occurrence Date & Time */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Occurrence Date & Time *</label>
                <div className={`border rounded-md px-1 ${errors.occurred_at ? 'border-red-500' : ''}`}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors w-full focus:outline-none focus-visible:ring-0">
                        <CalendarIcon className="h-4 w-4 text-gray-700 flex-shrink-0" />
                        <span className="text-sm text-gray-900 flex-1 text-left">
                          {getOccurrenceDateOptions().find((o) => o.value === occurredDateOption)?.label}
                        </span>
                        <ChevronDown className="h-3 w-3 text-gray-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {getOccurrenceDateOptions().map((opt) => (
                        <DropdownMenuItem
                          key={opt.value}
                          className="cursor-pointer"
                          onClick={() => handleOccurrenceDateOptionChange(opt.value)}
                        >
                          {opt.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {showOccurredDatePicker && (
                  <input
                    type="datetime-local"
                    className="w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none"
                    value={toDatetimeLocal(occurredDate)}
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      if (!isNaN(d.getTime())) {
                        setOccurredDate(d);
                        clearError('occurred_at');
                      }
                    }}
                  />
                )}
                {errors.occurred_at && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.occurred_at}
                  </p>
                )}
              </div>

              {/* Due By */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Due By</label>
                <div className="border rounded-md px-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors w-full focus:outline-none focus-visible:ring-0">
                        <CalendarIcon className="h-4 w-4 text-gray-700 flex-shrink-0" />
                        <span className="text-sm text-gray-900 flex-1 text-left">
                          {getDueDateOptions().find((o) => o.value === dueDateOption)?.label}
                        </span>
                        <ChevronDown className="h-3 w-3 text-gray-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {getDueDateOptions().map((opt) => (
                        <DropdownMenuItem
                          key={opt.value}
                          className="cursor-pointer"
                          onClick={() => handleDueDateOptionChange(opt.value)}
                        >
                          {opt.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {showDueDatePicker && (
                  <input
                    type="datetime-local"
                    className="w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none"
                    value={toDatetimeLocal(dueDate)}
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      if (!isNaN(d.getTime())) {
                        setDueDate(d);
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Submit Buttons */}
        <div className="flex-shrink-0 border-t pt-4 mt-4">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="incident-form"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Incident
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
