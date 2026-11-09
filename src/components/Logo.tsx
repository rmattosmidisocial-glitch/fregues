export function Brasinha({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="#ff5b1f" />
      <path d="M16 6c3 4 7 7 7 12a7 7 0 0 1-14 0c0-3 2-5 3-7 0 2 1 3 2 3 0-3 0-5 2-8z" fill="#fff6e9" />
      <path d="M16 15c2 2 3 3 3 5a3 3 0 0 1-6 0c0-2 1-3 3-5z" fill="#ffc03a" />
    </svg>
  );
}

export function Logo({ className = "", tone = "claro" }: { className?: string; tone?: "claro" | "escuro" }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Brasinha className="h-7 w-7" />
      <span
        className={`font-display text-[1.45rem] font-extrabold leading-none tracking-[-0.03em] ${tone === "claro" ? "text-papel" : "text-carvao"}`}
        style={{ fontVariationSettings: '"wdth" 85, "opsz" 48' }}
      >
        freguês
      </span>
    </span>
  );
}
