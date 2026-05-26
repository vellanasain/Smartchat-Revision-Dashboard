const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8081/api';

function getRoleHeaders() {
  const role = localStorage.getItem('sc_role') || 'admin_pelunasan';
  const userId = localStorage.getItem('sc_user_id') || '1';
  return {
    'X-User-Role': role,
    'X-User-Id': userId,
  };
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...getRoleHeaders(),
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(typeof body === 'string' ? body : (body.error || `Request failed: ${response.status}`));
  }
  return body;
}

export function loadRevisionProjectsTable(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) query.set(k, String(v));
  });
  return apiRequest(`/revision-projects?${query.toString()}`);
}

export function money(value) {
  if (value === null || value === undefined || value === '') return '-';
  return `Rp ${new Intl.NumberFormat('id-ID').format(Number(value))}`;
}
