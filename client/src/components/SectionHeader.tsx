interface SectionHeaderProps {
  title: string;
  accentColor?: string;
  className?: string;
}

export function SectionHeader({ title, accentColor = "#C8102E", className = "" }: SectionHeaderProps) {
  return (
    <div className={`flex items-center gap-2 mb-3 ${className}`}>
      <div
        className="rounded-[1px] flex-shrink-0"
        style={{ width: 3, height: 18, background: accentColor }}
      />
      <h2
        className="font-condensed font-bold uppercase tracking-[0.5px] text-[#111] text-[14px]"
        style={{ lineHeight: 1 }}
      >
        {title}
      </h2>
    </div>
  );
}
