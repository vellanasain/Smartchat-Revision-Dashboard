const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8081/api';
const LARAVEL_FALLBACK_BASE = import.meta.env.VITE_LARAVEL_API_BASE || '/api';
const PARITY_VERIFY = (import.meta.env.VITE_PARITY_VERIFY || '1') === '1';

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
  const goURL = `${API_BASE}${path}`;
  const laravelURL = `${LARAVEL_FALLBACK_BASE}${path}`;

  const goFetch = fetch(goURL, { credentials: 'include' });
  const shouldVerify = PARITY_VERIFY && parityKeys(path).length > 0;
  const laravelFetch = shouldVerify ? fetch(laravelURL, { credentials: 'include' }).catch(() => null) : null;

  try {
    const response = await goFetch;
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const goPayload = await response.json();

    if (shouldVerify && laravelFetch) {
      laravelFetch.then(async (fallbackResponse) => {
        if (!fallbackResponse || !fallbackResponse.ok) return;
        const laravelPayload = await fallbackResponse.json();
        verifyParity(path, goPayload, laravelPayload);
      }).catch(() => {});
    }

    return goPayload;
  } catch (goError) {
    const fallbackResponse = await fetch(laravelURL, { credentials: 'include' });
    if (!fallbackResponse.ok) {
      const body = await fallbackResponse.text();
      throw new Error(body || goError.message || `Request failed: ${fallbackResponse.status}`);
    }
    return fallbackResponse.json();
  }
}

export function money(value) {
  if (!value) return '-';
  return `Rp ${new Intl.NumberFormat('id-ID').format(Number(value))}`;
}
