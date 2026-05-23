const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8081/api';
const LARAVEL_FALLBACK_BASE = import.meta.env.VITE_LARAVEL_API_BASE || 'http://127.0.0.1:8080/api';
const PARITY_VERIFY = (import.meta.env.VITE_PARITY_VERIFY || '1') === '1';

const DEV_LARAVEL_CANDIDATES = [
  '/api',
  'http://127.0.0.1:8080/api',
  'http://localhost:8080/api',
  'http://127.0.0.1:8000/api',
  'http://localhost:8000/api',
];

function collectShape(obj, prefix = '', out = {}) {
  if (obj === null || obj === undefined) {
    out[prefix || '$'] = 'null';
    return out;
  }
  if (Array.isArray(obj)) {
    out[prefix || '$'] = 'array';
    if (obj.length > 0) collectShape(obj[0], `${prefix}[]`, out);
    return out;
  }
  if (typeof obj !== 'object') {
    out[prefix || '$'] = typeof obj;
    return out;
  }
  out[prefix || '$'] = 'object';
  Object.entries(obj).forEach(([key, value]) => collectShape(value, prefix ? `${prefix}.${key}` : key, out));
  return out;
}

function parityKeys(path) {
  if (path.startsWith('/revisions?')) return ['items', 'stats', 'page', 'per_page', 'total_items', 'total_pages'];
  if (path === '/revisions/create-bootstrap') return ['csrf_token', 'marketing_users', 'website_users', 'clients', 'defaults'];
  if (/^\/revisions\/\d+\/detail-bootstrap$/.test(path)) return ['csrf_token', 'revision_id', 'domain', 'project_info', 'project_notes', 'rows', 'options'];
  return [];
}

function verifyParity(path, goPayload, laravelPayload) {
  const keys = parityKeys(path);
  if (!keys.length) return;

  const missingInGo = keys.filter((key) => !(key in (goPayload || {})));
  const missingInLaravel = keys.filter((key) => !(key in (laravelPayload || {})));

  const goShape = collectShape(goPayload || {});
  const laravelShape = collectShape(laravelPayload || {});
  const typeMismatches = [];
  Object.keys(laravelShape).forEach((key) => {
    if (goShape[key] && laravelShape[key] !== goShape[key]) {
      typeMismatches.push(`${key}: go=${goShape[key]} laravel=${laravelShape[key]}`);
    }
  });

  if (missingInGo.length || missingInLaravel.length || typeMismatches.length) {
    console.warn('[parity-check] READ contract mismatch', { path, missingInGo, missingInLaravel, typeMismatches: typeMismatches.slice(0, 12) });
  }
}

export async function fetchJSON(path) {
  const preferLaravel = /^\/revisions\/\d+\/detail-bootstrap$/.test(path);
  const bases = (preferLaravel
    ? [LARAVEL_FALLBACK_BASE, ...DEV_LARAVEL_CANDIDATES, API_BASE]
    : [API_BASE, LARAVEL_FALLBACK_BASE, ...DEV_LARAVEL_CANDIDATES]).filter(Boolean);
  const seen = new Set();
  let lastError = null;

  for (const base of bases) {
    if (seen.has(base)) continue;
    seen.add(base);

    const url = `${base}${path}`;
    try {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `Request failed: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const body = await response.text();
        throw new Error(`Non-JSON response from ${url}: ${body.slice(0, 120)}`);
      }

      const payload = await response.json();

      if (PARITY_VERIFY && base === API_BASE && /^\/revisions/.test(path)) {
        fetch(`${LARAVEL_FALLBACK_BASE}${path}`, { credentials: 'include' })
          .then(async (fallbackResponse) => {
            if (!fallbackResponse.ok) return;
            if (!(fallbackResponse.headers.get('content-type') || '').includes('application/json')) return;
            const laravelPayload = await fallbackResponse.json();
            verifyParity(path, payload, laravelPayload);
          })
          .catch(() => {});
      }

      return payload;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Request failed');
}

export function money(value) {
  if (!value) return '-';
  return `Rp ${new Intl.NumberFormat('id-ID').format(Number(value))}`;
}
