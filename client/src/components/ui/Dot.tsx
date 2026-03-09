import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DotProps {
  color?: "green" | "red" | "orange";
  pulse?: boolean;
  className?: string;
}

export function Dot({ color = "green", pulse = true, className }: DotProps) {
  const colorMap = {
    green: "bg-[#10b981]",
    red: "bg-[#EF5350]",
    orange: "bg-[#E65100]",
  };

  return (
    <div className={cn("relative flex items-center justify-center w-2 h-2", className)}>
      <div 
        className={cn(
          "w-full h-full rounded-full z-10", 
          colorMap[color],
          pulse && "animate-pulse-dot"
        )} 
      />
    </div>
  );
}
