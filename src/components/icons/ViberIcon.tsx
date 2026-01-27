import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideProps } from "lucide-react";

const ViberIcon = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ className, size = 24, strokeWidth = 2, ...props }, ref) => {
    const iconSize = typeof size === "number" ? size : 24;
    const iconStrokeWidth = typeof strokeWidth === "number" ? strokeWidth : 2;
    
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={iconStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("lucide", className)}
        {...props}
      >
        <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.557 1.522 4.82 3.889 6.115-.112.63-.403 2.08-.462 2.408-.073.41.15.404.316.294.13-.086 2.064-1.36 2.903-1.916.757.123 1.542.198 2.354.198 4.97 0 9-3.185 9-7.1S16.97 3 12 3z" />
        <path d="M9.5 8.5a2.5 2.5 0 0 1 5 0v1a2.5 2.5 0 0 1-5 0v-1z" />
        <path d="M12 14v1" />
      </svg>
    );
  }
);

ViberIcon.displayName = "ViberIcon";

export { ViberIcon };
