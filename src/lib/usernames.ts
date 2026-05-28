import { supabase } from "@/integrations/supabase/client";

const ADJECTIVES = [
  "silent", "hidden", "rapid", "midnight", "shadow", "bright", "quiet",
  "vivid", "crimson", "frost", "lone", "wild", "swift", "calm", "noble",
  "ember", "neon", "phantom", "rogue", "stoic", "stellar", "velvet",
  "hollow", "lucid", "mellow", "ronin", "dusky", "feral", "iron", "obsidian",
];

const ANIMALS = [
  "tiger", "eagle", "fox", "wolf", "panther", "falcon", "otter", "raven",
  "lynx", "heron", "bison", "koala", "viper", "hawk", "owl", "stag",
  "orca", "lion", "puma", "ibex", "moth", "phoenix", "drake", "serpent",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateUsername(): string {
  return `${pick(ADJECTIVES)}_${pick(ANIMALS)}_${Math.floor(100 + Math.random() * 900)}`;
}

/** Generate `count` unique usernames that are not already taken. */
export async function generateAvailableUsernames(count = 20): Promise<string[]> {
  const candidates = new Set<string>();
  // overshoot to leave room for taken names
  while (candidates.size < count * 3) candidates.add(generateUsername());

  const list = Array.from(candidates);
  const { data } = await supabase
    .from("profiles")
    .select("anonymous_username")
    .in("anonymous_username", list);

  const taken = new Set((data ?? []).map((p: any) => (p.anonymous_username ?? "").toLowerCase()));
  const available = list.filter((u) => !taken.has(u.toLowerCase()));

  // top-up if we somehow ran low
  while (available.length < count) {
    const u = generateUsername();
    if (!taken.has(u.toLowerCase()) && !available.includes(u)) available.push(u);
  }
  return available.slice(0, count);
}

export async function isUsernameAvailable(name: string): Promise<boolean> {
  const clean = name.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(clean)) return false;
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .ilike("anonymous_username", clean)
    .maybeSingle();
  return !data;
}
