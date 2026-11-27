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

function comparePreference(a, b) {
  if (Boolean(b.valid) !== Boolean(a.valid)) {
    return Number(Boolean(b.valid)) - Number(Boolean(a.valid));
  }
  const prioDiff = (ENTITY_PRIORITY[b.type] || 0) - (ENTITY_PRIORITY[a.type] || 0);
  if (prioDiff !== 0) return prioDiff;

  const lenDiff = (b.end - b.start) - (a.end - a.start);
  if (lenDiff !== 0) return lenDiff;

  return a.start - b.start;
}

function resolveCluster(cluster, output) {
  if (cluster.length === 1) {
    output.push(cluster[0]);
    return;
  }

  cluster.sort(comparePreference);
  const accepted = [];
  for (let i = 0; i < cluster.length; i += 1) {
    const candidate = cluster[i];
    let hasConflict = false;
    for (let j = 0; j < accepted.length; j += 1) {
      if (spansOverlap(accepted[j], candidate)) {
        hasConflict = true;
        break;
      }
    }
    if (!hasConflict) {
      accepted.push(candidate);
    }
  }

  accepted.sort((a, b) => a.start - b.start || a.end - b.end);
  for (let i = 0; i < accepted.length; i += 1) {
    output.push(accepted[i]);
  }
}

/**
 * Deterministically resolves overlapping detections in O(N log N) time by partitioning
 * start-sorted intervals into independent overlapping clusters before applying preference ranking:
 * 1. Validated matches over unvalidated ones.
 * 2. Higher-priority entity types (CREDIT_CARD > IPV6 > EMAIL > INDIAN_PAN > AADHAAR > IPV4 > PHONE).
 * 3. Longer matched spans.
 * 4. Earlier start index.
 *
 * @param {Array<Object>} detections
 * @returns {Array<Object>}
 */
export function resolveOverlaps(detections) {
  if (!Array.isArray(detections) || detections.length === 0) {
    return [];
  }
  if (detections.length === 1) {
    return [detections[0]];
  }

  const byStart = [...detections].sort((a, b) => a.start - b.start || a.end - b.end);
  const resolved = [];
  let cluster = [byStart[0]];
  let clusterMaxEnd = byStart[0].end;

  for (let i = 1; i < byStart.length; i += 1) {
    const current = byStart[i];
    if (current.start < clusterMaxEnd) {
      cluster.push(current);
      if (current.end > clusterMaxEnd) {
        clusterMaxEnd = current.end;
      }
    } else {
      resolveCluster(cluster, resolved);
      cluster = [current];
      clusterMaxEnd = current.end;
    }
  }

  resolveCluster(cluster, resolved);
  return resolved;
}
