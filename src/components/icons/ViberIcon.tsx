import { cn } from "@/lib/utils";

interface ViberIconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export function ViberIcon({ className, size = 24, strokeWidth = 2 }: ViberIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("lucide", className)}
    >
      <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.557 1.522 4.82 3.889 6.115-.112.63-.403 2.08-.462 2.408-.073.41.15.404.316.294.13-.086 2.064-1.36 2.903-1.916.757.123 1.542.198 2.354.198 4.97 0 9-3.185 9-7.1S16.97 3 12 3z" />
      <path d="M12 6c-.5 0-1 .5-1 1v1c0 .5.5 1 1 1s1-.5 1-1V7c0-.5-.5-1-1-1z" />
      <path d="M12 11c-.5 0-1 .5-1 1s.5 1 1 1 1-.5 1-1-.5-1-1-1z" />
      <path d="M8.5 9.5c0-.5.5-1 1-1h1" />
      <path d="M14.5 9.5c0-.5-.5-1-1-1h-1" />
    </svg>
  );
}
