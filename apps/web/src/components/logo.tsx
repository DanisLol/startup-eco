/** Sprout mark: a seedling with two leaves inside a soft rounded square. */
export function SproutMark({ className = "h-9 w-9", inverted = false }: { className?: string; inverted?: boolean }) {
  const bg = inverted ? "rgba(255,255,255,0.18)" : "var(--color-brand)";
  const leaf = inverted ? "#ffffff" : "#ffffff";
  const soil = inverted ? "rgba(255,255,255,0.45)" : "var(--color-sun)";
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="12" fill={bg} />
      {/* soil */}
      <path d="M12 31h16" stroke={soil} strokeWidth="3.2" strokeLinecap="round" />
      {/* stem, curving gently to the right */}
      <path d="M20 31c0-5 .4-8.5 1.5-12" stroke={leaf} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      {/* left leaf: teardrop leaning up-left */}
      <path d="M20.2 23.5c-6.4.6-10.6-3.2-11-9.6 5.8-.4 10 3.4 11 9.6Z" fill={leaf} />
      {/* right leaf: teardrop leaning up-right, slightly higher */}
      <path d="M21.6 19c.2-6.4 4.2-10.4 10.6-10.6-.2 6.4-4.2 10.4-10.6 10.6Z" fill={leaf} />
      {/* leaf veins */}
      <path d="M20 23.2 13.5 17M21.7 18.8 27.6 13" stroke={bg === "var(--color-brand)" ? "var(--color-brand)" : "rgba(0,0,0,0.18)"} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-black tracking-tight ${className}`}>Sprout</span>;
}
