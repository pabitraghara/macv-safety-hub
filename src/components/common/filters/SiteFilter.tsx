import SelectFilter from "@/components/common/filters/SelectFilter";
import { useMySites } from "@/api/sites";

interface SiteFilterProps {
  onSiteChange: (selectedSiteIds: string[]) => void;
}

export default function SiteFilter({ onSiteChange }: SiteFilterProps) {
  const { sites } = useMySites();

  const handleSiteChange = (siteNames: string[]) => {
    const selectedSiteIds = siteNames
      .map((name) => sites.find((site) => site.name === name)?.id)
      .filter((id): id is string => id !== undefined);
    onSiteChange(selectedSiteIds);
  };

  return (
    <SelectFilter
      placeholder="Site"
      options={sites.map((site) => site.name)}
      onValueChange={handleSiteChange}
    />
  );
}
