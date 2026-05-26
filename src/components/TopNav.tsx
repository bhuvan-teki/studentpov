import { Link } from "@tanstack/react-router";

interface TopNavProps {
  rightSlot?: React.ReactNode;
  centerSlot?: React.ReactNode;
}

export function TopNav({ rightSlot, centerSlot }: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.04] bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-white/90 to-white/40 grid place-items-center">
            <span className="text-[11px] font-bold text-black">S</span>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            Studentpov
          </span>
        </Link>

        <div className="hidden md:flex flex-1 justify-center">{centerSlot}</div>

        <div className="flex items-center gap-3">{rightSlot}</div>
      </div>
    </header>
  );
}

export function LiveCount({ count = 124532 }: { count?: number }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-1.5 text-xs text-muted-foreground">
      <span className="pulse-dot" />
      <span className="tabular-nums text-foreground/90">
        {count.toLocaleString("en-IN")}
      </span>
      <span>Verified Students</span>
    </div>
  );
}
