import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  label?: string;
}

const LoadingSpinner = ({ label }: LoadingSpinnerProps) => {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-center">
        <Loader2 className="text-brand mx-auto h-8 w-8 animate-spin" />
        {label && <p className="text-muted-foreground mt-3 text-sm">{label}</p>}
      </div>
    </div>
  );
};

export default LoadingSpinner;
