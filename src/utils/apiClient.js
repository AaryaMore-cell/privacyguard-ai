/**
 * Optional FastAPI backend client used only when Server API mode is explicitly selected.
 * In default Local Browser mode, zero network requests are made.
 */

const API_BASE = (import.meta.env?.VITE_API_BASE_URL || '').replace(/\/+$/, '');

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

async function parseErrorDetail(res) {
  try {
    const body = await res.json();
    if (body && typeof body.detail === 'string') return body.detail;
  } catch {
    // Ignore non-JSON error body
  }
  return `Server responded with status ${res.status}`;
}

/**
 * Checks FastAPI backend availability via GET /api/health.
 */
export async function checkBackendHealth(signal) {
  const res = await fetch(apiUrl('/api/health'), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res));
  }
  return res.json();
}

/**
 * Sends text to FastAPI POST /api/redact for server-side detection and masking.
 */
export async function redactViaBackend({ text, mode, enabledTypes, format, signal }) {
  const res = await fetch(apiUrl('/api/redact'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      text,
      mode,
      enabled_types: enabledTypes,
      format,
    }),
    signal,
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res));
  }
  return res.json();
}

/**
 * Uploads a validated .txt or .csv file to FastAPI POST /api/upload for server-side sanitization.
 */
export async function uploadAndRedactViaBackend({ file, mode, enabledTypes, signal }) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);
  formData.append('enabled_types', JSON.stringify(enabledTypes));

  const res = await fetch(apiUrl('/api/upload'), {
    method: 'POST',
    body: formData,
    signal,
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res));
  }
  return res.json();
}
