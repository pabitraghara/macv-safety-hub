import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { observationsApi } from '@/api/observations';
import type { Observation, ObservationStatus } from '@/api/observations/types';

interface UseObservationUpdatesProps {
  code: string;
  observation: Observation | null;
  onRefresh: () => void;
}

export const useObservationUpdates = ({ code, observation, onRefresh }: UseObservationUpdatesProps) => {
  const [tempStatus, setTempStatus] = useState<ObservationStatus>(observation?.review_status ?? 'open');
  const [tempSeverity, setTempSeverity] = useState<string>(observation?.severity ?? 'Medium');

  const updateLocalState = useCallback(() => {
    if (observation) {
      setTempStatus(observation.review_status);
      setTempSeverity(observation.severity);
    }
  }, [observation]);

  const handleTriageChange = useCallback(async (newStatus: ObservationStatus, notes?: string) => {
    if (newStatus === tempStatus) return;
    const previous = tempStatus;
    try {
      setTempStatus(newStatus);
      await observationsApi.triageObservation(code, { review_status: newStatus, review_notes: notes });
      onRefresh();
      toast.success('Triage status updated');
    } catch {
      setTempStatus(previous);
      toast.error('Failed to update triage status. Please try again.');
    }
  }, [code, tempStatus, onRefresh]);

  const handleSeverityChange = useCallback(async (newSeverity: string) => {
    if (newSeverity === tempSeverity) return;
    const previous = tempSeverity;
    try {
      setTempSeverity(newSeverity);
      await observationsApi.updateObservation(code, { severity: newSeverity });
      onRefresh();
      toast.success('Severity updated');
    } catch {
      setTempSeverity(previous);
      toast.error('Failed to update severity. Please try again.');
    }
  }, [code, tempSeverity, onRefresh]);

  return {
    tempStatus,
    tempSeverity,
    updateLocalState,
    handleTriageChange,
    handleSeverityChange,
  };
};
