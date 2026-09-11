/**
 * Observations API module
 *
 * @example
 * ```typescript
 * import { useObservations, observationsApi } from '@/api/observations';
 *
 * // In a component
 * const { data, loading, error } = useObservations();
 *
 * // Direct API call
 * const obs = await observationsApi.getObservationByCode('OBS-001');
 * ```
 */
export * from './types';
export * from './api';
export * from './hooks';
