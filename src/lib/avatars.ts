// Avatar system — uses DiceBear (free, no key) for consistent generated avatars.
// Non-human / semi-anime / mascot styles only — keeps the anonymous vibe.

export const AVATAR_STYLES = [
  "bottts",      // robots
  "shapes",      // abstract shapes
  "identicon",   // geometric
  "thumbs",      // minimal thumbs
  "lorelei",     // semi-anime portrait
  "adventurer",  // mascot-y characters
] as const;

export type AvatarStyle = (typeof AVATAR_STYLES)[number];

const BG = "0a0a0a,141414,1a1a1a,202020";

export function avatarUrl(seed: string | null | undefined, style: AvatarStyle = "bottts"): string {
  const s = seed && seed.length > 0 ? seed : "anonymous";
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(s)}&backgroundColor=${BG}&radius=50`;
}

export function parseAvatar(url: string | null | undefined, fallbackSeed: string | null | undefined) {
  if (!url) return { style: "bottts" as AvatarStyle, seed: fallbackSeed ?? "anonymous" };
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/9\.x\/([^/]+)\/svg/);
    const style = (AVATAR_STYLES as readonly string[]).includes(m?.[1] ?? "")
      ? (m![1] as AvatarStyle)
      : "bottts";
    const seed = u.searchParams.get("seed") || fallbackSeed || "anonymous";
    return { style, seed };
  } catch {
    return { style: "bottts" as AvatarStyle, seed: fallbackSeed ?? "anonymous" };
  }
}

// Generates a deterministic palette of options the user can pick from.
export function generateAvatarOptions(userKey: string): { style: AvatarStyle; seed: string; url: string }[] {
  const seeds = [
    "ghost", "phantom", "hooded", "nova", "ember", "ronin", "kuro",
    "neon", "vapor", "shadow", "raven", "fox", "wolf", "owl", "lynx",
    "tiger", "panther", "hawk", "viper", "atlas", "drift", "echo",
    "halo", "ion",
  ];
  return AVATAR_STYLES.flatMap((style) =>
    seeds.map((s) => {
      const seed = `${s}-${userKey.slice(0, 6)}-${style}`;
      return { style, seed, url: avatarUrl(seed, style) };
    }),
  );
}
