// TODO_DEPRECATED: Legacy Laravel read-flow paths are now compatibility-mapped to Go API responses.
const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8081/api';

function roleHeaders() {
  return {
    'X-User-Role': localStorage.getItem('sc_role') || 'admin_pelunasan',
    'X-User-Id': localStorage.getItem('sc_user_id') || '1',
  };
}

async function go(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...roleHeaders(), ...(options.headers || {}) },
    ...options,
  });
  const ct = res.headers.get('content-type') || '';
  const body = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(typeof body === 'string' ? body : (body.error || `Request failed: ${res.status}`));
  return body;
}

function mapListParams(path) {
  const q = new URLSearchParams(path.split('?')[1] || '');
  const out = new URLSearchParams();
  out.set('page', q.get('page') || '1');
  out.set('per_page', q.get('per_page') || '12');
  out.set('search', q.get('q') || '');
  if (q.get('web_id')) out.set('assigned_web_id', q.get('web_id'));
  const filter = q.get('filter') || 'all';
  if (filter === 'unpaid') out.set('payment_status', 'unpaid');
  if (filter === 'process_revision') out.set('active_only', 'true');
  if (filter === 'revision_done') out.set('active_only', 'false');
  return out.toString();
}

async function loadRevisionProjectsTable(path) {
  const table = await go(`/revision-projects?${mapListParams(path)}`);
  const stats = await go('/dashboard/stats');
  return {
    items: (table.items || []).map((it) => ({
      group_id: it.id,
      revision_id: it.id,
      domain: it.temporary_domain,
      client_name: it.client_name,
      marketing_name: '-',
      web_name: it.web_executor_id ? `#${it.web_executor_id}` : '--',
      revision_label: `R${it.current_revision_no}`,
      revision_helper: it.current_revision_stage || '--',
      remaining_payment: it.remaining_payment,
      payment_class: it.payment_status === 'paid' ? 'is-paid' : 'is-unpaid',
      payment_label: it.payment_status,
      active_period: it.active_until ? new Date(it.active_until).toLocaleDateString('id-ID') : '-',
    })),
    stats: {
      total: stats.total_projects || 0,
      unpaid: stats.unpaid || 0,
      process_revision: (stats.total_projects || 0) - (stats.completed || 0),
      revision_done: stats.completed || 0,
    },
    page: table.page,
    per_page: table.per_page,
    total_items: table.total,
    total_pages: table.total_pages,
  };
}

async function detailBootstrap(id) {
  const [project, cycles, webUsers] = await Promise.all([
    go(`/revision-projects/${id}`),
    go(`/revision-projects/${id}/cycles`),
    go('/users/website'),
  ]);
  return {
    csrf_token: '',
    revision_id: id,
    domain: project.temporary_domain || '-',
    project_info: {
      domain_sementara: project.temporary_domain || '-',
      nama_klien: project.client_name || '-',
      tim_marketing: '-',
      tim_web: project.web_executor_id ? `#${project.web_executor_id}` : '--',
      sisa_pelunasan: money(project.remaining_payment),
      status_pembayaran: project.payment_status || '-',
      tanggal_pelunasan: '-',
    },
    project_notes: { package_website: '', biaya: '', domain_resmi: project.official_domain || '' },
    rows: (cycles.items || []).map((c) => ({ jenis: c.revision_no, label: c.revision_label, stage: c.revision_stage, work: c.work_status, note: c.notes || '' })),
    options: {
      stages: [{ value: '', label: '--' }, { value: 'waiting_client_data', label: 'waiting_client_data' }, { value: 'ready_to_revision', label: 'ready_to_revision' }, { value: 'ready_to_connection', label: 'ready_to_connection' }],
      work: [{ value: '', label: '--' }, { value: 'not_started', label: 'not_started' }, { value: 'on_progress', label: 'on_progress' }, { value: 'done', label: 'done' }],
      work_r0: [{ value: 'done', label: 'done' }],
      web_users: webUsers || [],
    },
  };
}

export async function fetchJSON(path) {
  if (path.startsWith('/revisions?')) return loadRevisionProjectsTable(path);
  if (path === '/users/marketing') return [];
  if (path === '/users/website') return go('/users/website');
  if (path === '/revisions/create-bootstrap') {
    const web = await go('/users/website');
    return { csrf_token: '', marketing_users: [], website_users: web, clients: [], defaults: {} };
  }
  const m = path.match(/^\/revisions\/(\d+)\/detail-bootstrap$/);
  if (m) return detailBootstrap(m[1]);
  if (path.startsWith('/debug/logs')) return { lines: [] };
  return go(path);
}

export function money(value) {
  if (!value && value !== 0) return '-';
  return `Rp ${new Intl.NumberFormat('id-ID').format(Number(value))}`;
}
