const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8081/api';
const LARAVEL_FALLBACK_BASE = import.meta.env.VITE_LARAVEL_API_BASE || '/api';

export async function fetchJSON(path) {
  const targets = [API_BASE, LARAVEL_FALLBACK_BASE];
  let lastError = null;

  for (const base of targets) {
    try {
      const response = await fetch(`${base}${path}`, { credentials: 'include' });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `Request failed: ${response.status}`);
      }
      return await response.json();
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
