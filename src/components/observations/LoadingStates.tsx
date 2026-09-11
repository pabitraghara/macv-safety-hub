// Observations-specific LoadingStates wrapper
import { LoadingStates as SharedLoadingStates } from '@/components/shared/LoadingStates';

type Props = {
  isParamsLoaded: boolean;
  loading: boolean;
  error: string | null;
  code: string;
};

export function LoadingStates({ isParamsLoaded, loading, error, code }: Props) {
  return (
    <SharedLoadingStates
      isParamsLoaded={isParamsLoaded}
      loading={loading}
      error={error}
      code={code}
      backPath="/observations"
      entityName="Observation"
    />
  );
}
