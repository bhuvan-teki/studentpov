import { avatarUrl, type AvatarStyle } from "@/lib/avatars";
import { cn } from "@/lib/utils";

interface AvatarProps {
  url?: string | null;
  seed?: string | null;
  style?: AvatarStyle;
  name?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ url, seed, style = "bottts", name, size = 36, className }: AvatarProps) {
  const src = url || avatarUrl(seed, style);
  const initial = (name?.[0] ?? "A").toUpperCase();
  return (
    <div
      className={cn(
        "shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-white/15 to-white/[0.03] border border-white/10 grid place-items-center text-[11px] font-semibold text-foreground/70",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img
          src={src}
          alt={name ? `${name} avatar` : "avatar"}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        initial
      )}
    </div>
  );
}
