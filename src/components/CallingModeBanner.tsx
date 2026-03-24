import { Phone, ArrowRight } from "lucide-react";
import { useFlowMode } from "@/hooks/useFlowMode";

export function CallingModeBanner() {
  const { mode, setMode } = useFlowMode();

  if (mode !== "crm") return null;

  return (
    <button
      onClick={() => setMode("calling")}
      className="w-full flex items-center justify-center gap-2 py-1.5 px-4 bg-primary/10 text-primary text-xs font-medium hover:bg-primary/15 transition-colors"
    >
      <Phone className="h-3 w-3" />
      Try Calling Mode — faster way to work your leads
      <ArrowRight className="h-3 w-3" />
    </button>
  );
}
