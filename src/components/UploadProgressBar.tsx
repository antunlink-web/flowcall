import { Progress } from "@/components/ui/progress";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadProgressBarProps {
  isVisible: boolean;
  progress: number;
  message: string;
  onCancel?: () => void;
}

export function UploadProgressBar({ 
  isVisible, 
  progress, 
  message,
  onCancel 
}: UploadProgressBarProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-primary text-primary-foreground shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-primary-foreground">
                {message}
              </span>
              <span className="text-sm text-primary-foreground/70">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2 bg-primary-foreground/20" />
          </div>
          {onCancel && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20" 
              onClick={onCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
