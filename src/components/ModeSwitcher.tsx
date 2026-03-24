import { Phone, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFlowMode, type FlowMode } from "@/hooks/useFlowMode";

const modes: { value: FlowMode; label: string; icon: typeof Phone }[] = [
  { value: "calling", label: "Calling", icon: Phone },
  { value: "crm", label: "CRM", icon: LayoutGrid },
];

export function ModeSwitcher() {
  const { mode, setMode } = useFlowMode();

  return (
    <div className="flex items-center rounded-full bg-sidebar-accent/60 p-0.5 gap-0.5">
      {modes.map((m) => {
        const active = mode === m.value;
        return (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <m.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
