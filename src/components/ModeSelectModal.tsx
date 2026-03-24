import { useState } from "react";
import { Phone, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFlowMode, type FlowMode } from "@/hooks/useFlowMode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const options: {
  value: FlowMode;
  label: string;
  description: string;
  icon: typeof Phone;
  recommended?: boolean;
}[] = [
  {
    value: "calling",
    label: "Calling Mode",
    description: "Start calling leads immediately with a simple interface.",
    icon: Phone,
    recommended: true,
  },
  {
    value: "crm",
    label: "CRM Mode",
    description: "Use full CRM features and advanced workflow management.",
    icon: LayoutGrid,
  },
];

export function ModeSelectModal() {
  const { isFirstTime, setMode, dismissFirstTime } = useFlowMode();
  const [selected, setSelected] = useState<FlowMode>("calling");

  if (!isFirstTime) return null;

  const handleConfirm = () => {
    setMode(selected);
    dismissFirstTime();
  };

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl text-center">
            How do you want to use FlowCall?
          </DialogTitle>
          <DialogDescription className="text-center">
            You can switch modes anytime from the top navigation bar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={cn(
                "relative flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200",
                selected === opt.value
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/30"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  selected === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <opt.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{opt.label}</span>
                  {opt.recommended && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {opt.description}
                </p>
              </div>
              <div
                className={cn(
                  "mt-1 h-5 w-5 shrink-0 rounded-full border-2 transition-colors",
                  selected === opt.value
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                )}
              >
                {selected === opt.value && (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm} className="w-full">
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
