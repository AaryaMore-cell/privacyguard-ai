/**
 * Priority ranking for deterministic overlap resolution.
 * Higher number = higher specificity / priority when two detections overlap.
 */
export const ENTITY_PRIORITY = {
  CREDIT_CARD: 70,
  IPV6: 60,
  EMAIL: 50,
  INDIAN_PAN: 40,
  AADHAAR: 30,
  IPV4: 20,
  PHONE: 10,
};

/**
 * Checks whether two half-open intervals [a.start, a.end) and [b.start, b.end) overlap.
 * @param {{ start: number, end: number }} a
 * @param {{ start: number, end: number }} b
 * @returns {boolean}
 */
export function spansOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

/**
 * Resolves overlapping PII detections deterministically:
 * 1. Prefer validated matches over unvalidated ones.
 * 2. Prefer higher-priority / more specific entity types (e.g., CREDIT_CARD over PHONE/AADHAAR).
 * 3. Prefer longer matched spans.
 * 4. Break remaining ties by earlier start index.
 * Finally returns accepted non-overlapping detections sorted by start index ascending.
 *
 * @param {Array<Object>} detections
 * @returns {Array<Object>}
 */
export function resolveOverlaps(detections) {
  if (!Array.isArray(detections) || detections.length === 0) {
    return [];
  }

  const ranked = [...detections].sort((a, b) => {
    if (Boolean(b.valid) !== Boolean(a.valid)) {
      return Number(Boolean(b.valid)) - Number(Boolean(a.valid));
    }
    const prioDiff = (ENTITY_PRIORITY[b.type] || 0) - (ENTITY_PRIORITY[a.type] || 0);
    if (prioDiff !== 0) return prioDiff;

    const lenDiff = (b.end - b.start) - (a.end - a.start);
    if (lenDiff !== 0) return lenDiff;

    return a.start - b.start;
  });

  const accepted = [];
  for (const candidate of ranked) {
    const hasConflict = accepted.some((existing) => spansOverlap(existing, candidate));
    if (!hasConflict) {
      accepted.push(candidate);
    }
  }

  return accepted.sort((a, b) => a.start - b.start || a.end - b.end);
}
