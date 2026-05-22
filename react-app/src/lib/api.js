const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8081/api';

export async function fetchJSON(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed: ${response.status}`);
  }
  return response.json();
}

export function money(value) {
  if (!value) return '-';
  return `Rp ${new Intl.NumberFormat('id-ID').format(Number(value))}`;
}
