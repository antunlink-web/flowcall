import { cn } from "@/lib/utils";

interface WhatsAppIconProps {
  className?: string;
  size?: number;
}

export function WhatsAppIcon({ className, size = 24 }: WhatsAppIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("lucide", className)}
    >
      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
      <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
      <path d="M9.5 9.5c0-.5.5-1 1-1s1 .5 1 1v1c0 .5-.5 1-1 1" />
      <path d="M13.5 13.5c.5 0 1 .5 1 1s-.5 1-1 1h-1c-.5 0-1-.5-1-1" />
    </svg>
  );
}
