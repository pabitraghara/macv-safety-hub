import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";

interface LoadingStatesProps {
  isParamsLoaded: boolean;
  loading: boolean;
  error: string | null;
  code: string;
  backPath: string;
  entityName: string;
}

export function LoadingStates({
  isParamsLoaded,
  loading,
  error,
  code,
  backPath,
  entityName,
}: LoadingStatesProps) {
  const router = useRouter();

  if (!isParamsLoaded || loading || error !== null) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading {entityName} details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-center min-h-96">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="text-gray-600 text-lg font-semibold mb-2">
                {entityName} Not Found
              </div>
              <p className="text-gray-500 mb-4 text-sm">
                The {entityName.toLowerCase()} with code &quot;{code}&quot; could not be found.
              </p>
              <Button onClick={() => router.push(backPath)} variant="outline">
                Back to {entityName}s
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
