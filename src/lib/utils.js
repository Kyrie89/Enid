import { STALE_MONTHS } from "./taxonomy";

// Lightweight fuzzy match: lowest edit-distance among the haystack's words vs each query word.
// Returns null if no word is within a reasonable typo-distance of every query word.
export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function fuzzyScore(haystack, query) {
  const hayWords = haystack.split(/\W+/).filter(Boolean);
  const qWords = query.split(/\W+/).filter(Boolean);
  if (qWords.length === 0 || hayWords.length === 0) return null;
  let total = 0;
  for (const qw of qWords) {
    let best = Infinity;
    for (const hw of hayWords) {
      const d = levenshtein(qw, hw);
      const tolerance = qw.length <= 4 ? 1 : qw.length <= 7 ? 2 : 3;
      if (d <= tolerance && d < best) best = d;
    }
    if (best === Infinity) return null; // this query word matched nothing closely — reject
    total += best;
  }
  return total;
}

export const uid = () => "r_" + Math.random().toString(36).slice(2, 10);

// Finds which synonym trigger phrases appear in the (already lowercased) query
// and returns the flattened, deduped list of their expansions.
export function expandSearchQuery(lowerQuery, synonyms) {
  const expansions = new Set();
  for (const [key, values] of Object.entries(synonyms)) {
    if (lowerQuery.includes(key)) values.forEach((v) => expansions.add(v));
  }
  return [...expansions];
}

// Normalizes org names before comparing, so "The Salvation Army" and "Salvation Army, The" match.
export function normalizeName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, "")
    .replace(/[.,()&']/g, "")
    .replace(/\binc\b|\bllc\b|\bpllc\b|\bcenter\b|\bcentre\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function findLikelyDuplicate(resources, name, excludeId) {
  const target = normalizeName(name);
  if (!target) return null;
  for (const r of resources) {
    if (r.id === excludeId) continue;
    const candidate = normalizeName(r.name);
    if (!candidate) continue;
    if (candidate === target) return r;
    if (candidate.includes(target) || target.includes(candidate)) return r;
    const dist = levenshtein(candidate, target);
    const tolerance = Math.max(2, Math.floor(target.length * 0.15));
    if (dist <= tolerance) return r;
  }
  return null;
}

export function getVerificationInfo(resource) {
  if (!resource.verifiedDate) return { level: "never", label: "Never verified" };
  const verified = new Date(resource.verifiedDate + "T00:00:00");
  const now = new Date();
  const months = (now.getFullYear() - verified.getFullYear()) * 12 + (now.getMonth() - verified.getMonth());
  const dateStr = verified.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (months >= STALE_MONTHS) return { level: "stale", label: `Verified ${dateStr} — ${months} months ago, due for a recheck` };
  return { level: "fresh", label: `Verified ${dateStr}` };
}

export function timeToMinutes(t) {
  const m = /(\d{1,2}):?(\d{2})?\s*(am|pm)/i.exec(t || "");
  if (!m) return 9999;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = (m[3] || "").toLowerCase();
  if (ampm === "pm" && h !== 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  return h * 60 + min;
}
