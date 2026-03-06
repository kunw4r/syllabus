// Lightweight fuzzy string matching (no dependencies)

/** Levenshtein edit distance between two strings */
function editDistance(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  const dp: number[] = Array.from({ length: lb + 1 }, (_, i) => i);

  for (let i = 1; i <= la; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= lb; j++) {
      const tmp = dp[j];
      dp[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[lb];
}

/**
 * Fuzzy match score (0–1, higher = better match).
 * Combines substring containment, edit distance, and word-level matching.
 */
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact substring → perfect score
  if (t.includes(q)) return 1;

  // Check if query words appear (possibly misspelled) in target words
  const qWords = q.split(/\s+/).filter(Boolean);
  const tWords = t.split(/\s+/).filter(Boolean);

  let totalScore = 0;

  for (const qw of qWords) {
    let bestWordScore = 0;

    for (const tw of tWords) {
      // Exact word substring
      if (tw.includes(qw) || qw.includes(tw)) {
        bestWordScore = Math.max(bestWordScore, 0.95);
        continue;
      }

      // Edit distance relative to word length
      const dist = editDistance(qw, tw);
      const maxLen = Math.max(qw.length, tw.length);
      const threshold = maxLen <= 3 ? 1 : maxLen <= 5 ? 2 : 3;

      if (dist <= threshold) {
        const wordScore = 1 - dist / maxLen;
        bestWordScore = Math.max(bestWordScore, wordScore * 0.9);
      }
    }

    totalScore += bestWordScore;
  }

  return qWords.length > 0 ? totalScore / qWords.length : 0;
}

/**
 * Filter and rank items by fuzzy match against a text field.
 * Returns items with score >= minScore, sorted best-first.
 */
export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getText: (item: T) => string,
  minScore = 0.4,
): (T & { _score: number })[] {
  return items
    .map((item) => ({ ...item, _score: fuzzyScore(query, getText(item)) }))
    .filter((item) => item._score >= minScore)
    .sort((a, b) => b._score - a._score);
}
