import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { sitesApi } from "@/api/sites";

const TIMEZONE_GROUPS: {
  label: string;
  zones: { value: string; label: string }[];
}[] = [
  {
    label: "Africa",
    zones: [
      { value: "Africa/Cairo", label: "Cairo (UTC+2)" },
      { value: "Africa/Johannesburg", label: "Johannesburg (UTC+2)" },
      { value: "Africa/Lagos", label: "Lagos (UTC+1)" },
      { value: "Africa/Nairobi", label: "Nairobi (UTC+3)" },
    ],
  },
  {
    label: "Americas",
    zones: [
      { value: "America/Anchorage", label: "Anchorage (UTC−9)" },
      { value: "America/Chicago", label: "Chicago (UTC−6)" },
      { value: "America/Denver", label: "Denver (UTC−7)" },
      { value: "America/Los_Angeles", label: "Los Angeles (UTC−8)" },
      { value: "America/Mexico_City", label: "Mexico City (UTC−6)" },
      { value: "America/New_York", label: "New York (UTC−5)" },
      { value: "America/Phoenix", label: "Phoenix (UTC−7)" },
      { value: "America/Santiago", label: "Santiago (UTC−3)" },
      { value: "America/Sao_Paulo", label: "São Paulo (UTC−3)" },
      { value: "America/Toronto", label: "Toronto (UTC−5)" },
      { value: "America/Vancouver", label: "Vancouver (UTC−8)" },
    ],
  },
  {
    label: "Asia",
    zones: [
      { value: "Asia/Bangkok", label: "Bangkok (UTC+7)" },
      { value: "Asia/Colombo", label: "Colombo (UTC+5:30)" },
      { value: "Asia/Dubai", label: "Dubai (UTC+4)" },
      { value: "Asia/Hong_Kong", label: "Hong Kong (UTC+8)" },
      { value: "Asia/Jakarta", label: "Jakarta (UTC+7)" },
      { value: "Asia/Karachi", label: "Karachi (UTC+5)" },
      { value: "Asia/Kolkata", label: "Kolkata (UTC+5:30)" },
      { value: "Asia/Kuala_Lumpur", label: "Kuala Lumpur (UTC+8)" },
      { value: "Asia/Muscat", label: "Muscat (UTC+4)" },
      { value: "Asia/Riyadh", label: "Riyadh (UTC+3)" },
      { value: "Asia/Seoul", label: "Seoul (UTC+9)" },
      { value: "Asia/Shanghai", label: "Shanghai (UTC+8)" },
      { value: "Asia/Singapore", label: "Singapore (UTC+8)" },
      { value: "Asia/Taipei", label: "Taipei (UTC+8)" },
      { value: "Asia/Tehran", label: "Tehran (UTC+3:30)" },
      { value: "Asia/Tokyo", label: "Tokyo (UTC+9)" },
    ],
  },
  {
    label: "Atlantic / Middle East",
    zones: [
      { value: "Asia/Beirut", label: "Beirut (UTC+2)" },
      { value: "Asia/Jerusalem", label: "Jerusalem (UTC+2)" },
      { value: "Asia/Kuwait", label: "Kuwait (UTC+3)" },
      { value: "Atlantic/Reykjavik", label: "Reykjavik (UTC+0)" },
    ],
  },
  {
    label: "Australia & Pacific",
    zones: [
      { value: "Australia/Adelaide", label: "Adelaide (UTC+9:30)" },
      { value: "Australia/Brisbane", label: "Brisbane (UTC+10)" },
      { value: "Australia/Melbourne", label: "Melbourne (UTC+10)" },
      { value: "Australia/Perth", label: "Perth (UTC+8)" },
      { value: "Australia/Sydney", label: "Sydney (UTC+10)" },
      { value: "Pacific/Auckland", label: "Auckland (UTC+12)" },
      { value: "Pacific/Honolulu", label: "Honolulu (UTC−10)" },
    ],
  },
  {
    label: "Europe",
    zones: [
      { value: "Europe/Amsterdam", label: "Amsterdam (UTC+1)" },
      { value: "Europe/Athens", label: "Athens (UTC+2)" },
      { value: "Europe/Berlin", label: "Berlin (UTC+1)" },
      { value: "Europe/Brussels", label: "Brussels (UTC+1)" },
      { value: "Europe/Bucharest", label: "Bucharest (UTC+2)" },
      { value: "Europe/Dublin", label: "Dublin (UTC+0)" },
      { value: "Europe/Helsinki", label: "Helsinki (UTC+2)" },
      { value: "Europe/Istanbul", label: "Istanbul (UTC+3)" },
      { value: "Europe/Lisbon", label: "Lisbon (UTC+0)" },
      { value: "Europe/London", label: "London (UTC+0)" },
      { value: "Europe/Madrid", label: "Madrid (UTC+1)" },
      { value: "Europe/Moscow", label: "Moscow (UTC+3)" },
      { value: "Europe/Paris", label: "Paris (UTC+1)" },
      { value: "Europe/Prague", label: "Prague (UTC+1)" },
      { value: "Europe/Rome", label: "Rome (UTC+1)" },
      { value: "Europe/Stockholm", label: "Stockholm (UTC+1)" },
      { value: "Europe/Warsaw", label: "Warsaw (UTC+1)" },
      { value: "Europe/Zurich", label: "Zurich (UTC+1)" },
    ],
  },
  {
    label: "UTC",
    zones: [{ value: "UTC", label: "UTC (UTC+0)" }],
  },
];

interface AddSiteDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}

export function AddSiteDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddSiteDialogProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeEdited, setCodeEdited] = useState(false);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [timezone, setTimezone] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-derive code from first 3 letters of name, unless user has manually edited it
  useEffect(() => {
    if (!codeEdited) {
      setCode(name.slice(0, 3).toUpperCase());
    }
  }, [name, codeEdited]);

  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCode(e.target.value.toUpperCase());
    setCodeEdited(e.target.value !== "");
  }

  function reset() {
    setName("");
    setCode("");
    setCodeEdited(false);
    setAddress("");
    setCity("");
    setCountry("");
    setTimezone("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !code) return;
    try {
      setLoading(true);
      await sitesApi.createSite({
        name,
        code,
        address: address.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        timezone: timezone.trim() || null,
      });
      toast.success(`Site '${name}' created`);
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create site");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a Site</DialogTitle>
          <DialogDescription>
            Create a new site under your organisation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="site-name">Name</Label>
              <Input
                id="site-name"
                placeholder="Headquarters"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site-code">Identifier</Label>
              <Input
                id="site-code"
                className="w-24 font-mono uppercase"
                placeholder="HEA"
                value={code}
                onChange={handleCodeChange}
                maxLength={10}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="site-address">Address</Label>
            <Input
              id="site-address"
              placeholder="123 Main St"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="site-city">City</Label>
              <Input
                id="site-city"
                placeholder="Mumbai"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site-country">Country</Label>
              <Input
                id="site-country"
                placeholder="India"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="site-timezone">Timezone</Label>
            <Select
              value={timezone}
              onValueChange={setTimezone}
              disabled={loading}
            >
              <SelectTrigger id="site-timezone">
                <SelectValue placeholder="Select a timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_GROUPS.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.zones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={loading || !name || !code}
              className="w-full"
            >
              <MapPin className="mr-2 h-4 w-4" />
              {loading ? "Creating…" : "Create Site"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
