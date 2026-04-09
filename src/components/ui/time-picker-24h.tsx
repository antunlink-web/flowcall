import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TimePicker24hProps {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  className?: string;
}

export function TimePicker24h({ value, onChange, className }: TimePicker24hProps) {
  const [hours, minutes] = value.split(":");

  const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minuteOptions = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      <Select value={hours} onValueChange={(h) => onChange(`${h}:${minutes}`)}>
        <SelectTrigger className="w-[70px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {hourOptions.map((h) => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground font-bold">:</span>
      <Select value={minutes} onValueChange={(m) => onChange(`${hours}:${m}`)}>
        <SelectTrigger className="w-[70px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {minuteOptions.map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
