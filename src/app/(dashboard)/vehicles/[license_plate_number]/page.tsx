import VehicleViolationsPage from "@/components/domain/vehicles/VehicleViolationsPage";

interface VehicleDetailPageProps {
  params: Promise<{
    license_plate_number: string;
  }>;
}

export default async function VehicleDetailPage({
  params,
}: VehicleDetailPageProps) {
  const { license_plate_number } = await params;
  const decodedPlateNumber = decodeURIComponent(license_plate_number);

  return <VehicleViolationsPage plateNumber={decodedPlateNumber} />;
}
