import { cn } from "@/lib/utils";
import type { LucideProps } from "lucide-react";

type WhatsAppIconProps = LucideProps;

export function WhatsAppIcon({ className, size = 24, strokeWidth = 2, ...props }: WhatsAppIconProps) {
  const iconSize = typeof size === "number" ? size : 24;
  const iconStrokeWidth = typeof strokeWidth === "number" ? strokeWidth : 2;
  
  return (
    <svg
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
      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
      <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
    </svg>
  );
}
