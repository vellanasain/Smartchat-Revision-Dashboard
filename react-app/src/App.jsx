import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest, loadRevisionProjectsTable, money } from './lib/api';

const STAGE_OPTIONS = ['', '--', 'waiting_client_data', 'ready_to_revision', 'ready_to_connection'];
const WORK_OPTIONS = ['', '--', 'not_started', 'on_progress', 'done'];

export function App() {
  const [view, setView] = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2500); return () => clearTimeout(t); }, [toast]);

  return <main className="page-shell">{toast && <div className="alert alert-success">{toast}</div>}
    {view === 'list' && <RevisionsPage onOpen={(id) => { setSelectedId(id); setView('detail'); }} onToast={setToast} />}
    {view === 'detail' && <DetailPage projectId={selectedId} onBack={() => setView('list')} onToast={setToast} />}
  </main>;
}

function RevisionsPage({ onOpen, onToast }) {
  const [params, setParams] = useState({ search: '', revision_stage: '', work_status: '', payment_status: '', assigned_web_id: '', current_revision_no: '', active_only: '1', sort_by: 'updated_at', sort_dir: 'desc', page: 1, per_page: 12 });
  const [list, setList] = useState({ items: [] });
  const [stats, setStats] = useState({ total_projects: 0, unpaid: 0, assigned_projects: 0, completed: 0 });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const query = useMemo(() => params, [params]);
  const refresh = () => {
    setLoading(true);
    Promise.all([
      loadRevisionProjectsTable(query),
      apiRequest('/dashboard/stats'),
      apiRequest('/users/website'),
    ]).then(([table, stat, webUsers]) => { setList(table); setStats(stat); setUsers(webUsers); setError(''); })
      .catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(refresh, [query.page, query.search, query.revision_stage, query.work_status, query.payment_status, query.assigned_web_id, query.current_revision_no, query.active_only, query.sort_by, query.sort_dir]);

  return <section>
    <h2>Revision Projects</h2>
    <div className="metric-grid">
      <Metric title="Total Revisions" value={stats.total_projects} />
      <Metric title="Unpaid" value={stats.unpaid} />
      <Metric title="Active Revisions" value={stats.total_projects - stats.completed} />
      <Metric title="Completed Projects" value={stats.completed} />
    </div>

    <div className="form-grid">
      <input placeholder="Search" value={params.search} onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })} />
      <select value={params.revision_stage} onChange={(e) => setParams({ ...params, revision_stage: e.target.value, page: 1 })}>{STAGE_OPTIONS.map((x) => <option key={x} value={x}>{x || 'All stage'}</option>)}</select>
      <select value={params.work_status} onChange={(e) => setParams({ ...params, work_status: e.target.value, page: 1 })}>{WORK_OPTIONS.map((x) => <option key={x} value={x}>{x || 'All work'}</option>)}</select>
      <select value={params.payment_status} onChange={(e) => setParams({ ...params, payment_status: e.target.value, page: 1 })}><option value="">All payment</option><option value="paid">paid</option><option value="unpaid">unpaid</option><option value="overdue">overdue</option></select>
      <select value={params.assigned_web_id} onChange={(e) => setParams({ ...params, assigned_web_id: e.target.value, page: 1 })}><option value="">All web</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
      <button onClick={refresh} disabled={loading}>Refresh</button>
    </div>
    {error && <div className="alert alert-danger">{error}</div>}
    <div className="revision-table-wrap"><table className="revision-table"><thead><tr><th>Client</th><th>Temporary Domain</th><th>Web</th><th>Stage</th><th>Work</th><th>Payment</th><th>Remaining</th><th>Updated</th><th /></tr></thead><tbody>
      {loading ? <tr><td colSpan="9">Loading...</td></tr> : (list.items?.length ? list.items.map((it) => <tr key={it.id}><td>{it.client_name}</td><td>{it.temporary_domain}</td><td>{it.web_executor_id || '--'}</td><td><StatusBadge value={it.current_revision_stage} /></td><td><StatusBadge value={it.current_work_status} /></td><td><StatusBadge value={it.payment_status} /></td><td>{money(it.remaining_payment)}</td><td>{new Date(it.updated_at).toLocaleString('id-ID')}</td><td><button onClick={() => onOpen(it.id)}>Detail</button></td></tr>) : <tr><td colSpan="9">Empty state: tidak ada data.</td></tr>)}
    </tbody></table></div>
    <div className="form-actions"><button disabled={params.page <= 1} onClick={() => setParams({ ...params, page: params.page - 1 })}>Prev</button><span>Page {list.page || 1}/{list.total_pages || 1}</span><button disabled={(list.page || 1) >= (list.total_pages || 1)} onClick={() => setParams({ ...params, page: params.page + 1 })}>Next</button></div>
  </section>;
}

function DetailPage({ projectId, onBack, onToast }) {
  const [project, setProject] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const role = localStorage.getItem('sc_role') || 'admin_pelunasan';

  const load = () => {
    setLoading(true);
    Promise.all([apiRequest(`/revision-projects/${projectId}`), apiRequest(`/revision-projects/${projectId}/cycles`), apiRequest('/users/website')])
      .then(([p, c, u]) => { setProject(p); setCycles(c.items || []); setUsers(u); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [projectId]);

  const updateProject = async (payload) => { setSubmitting(true); try { await apiRequest(`/revision-projects/${projectId}`, { method: 'PATCH', body: JSON.stringify(payload) }); onToast('Update berhasil'); load(); } catch (e) { onToast(e.message); } finally { setSubmitting(false); } };
  const updateCycle = async (cycleId, field, value) => { setSubmitting(true); try { await apiRequest(`/revision-cycles/${cycleId}/${field}`, { method: 'PATCH', body: JSON.stringify(field === 'stage' ? { stage: value } : { work_status: value }) }); onToast('Cycle updated'); load(); } catch (e) { onToast(e.message); } finally { setSubmitting(false); } };

  if (loading) return <div>Loading detail...</div>;
  if (!project) return <div className="alert alert-danger">Project not found</div>;
  return <section>
    <button onClick={onBack}>← Back</button>
    <h3>{project.client_name} ({project.temporary_domain})</h3>
    <div className="form-grid">
      <div>payment: <StatusBadge value={project.payment_status} /></div><div>remaining: {money(project.remaining_payment)}</div><div>revision: R{project.current_revision_no}</div><div>active until: {project.active_until ? new Date(project.active_until).toLocaleDateString('id-ID') : '-'}</div>
      {role === 'admin_pelunasan' && <><select disabled={submitting} defaultValue={project.web_executor_id || ''} onChange={(e) => updateProject({ web_executor_id: e.target.value ? Number(e.target.value) : null })}><option value="">assign web</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
      <button disabled={submitting} onClick={() => apiRequest(`/revision-projects/${projectId}/cycles`, { method: 'POST', body: JSON.stringify({}) }).then(() => { onToast('Cycle created'); load(); })}>Create Next Cycle</button></>}
    </div>
    <h4>Revision Timeline R0-R4</h4>
    <div>{cycles.map((c) => <div key={c.id || c.revision_no} className="metric-card"><strong>R{c.revision_no} - {c.revision_label}</strong><div>stage: <StatusBadge value={c.revision_stage} /></div><div>work: <StatusBadge value={c.work_status} /></div><div>assigned: {c.assigned_web_id || '--'}</div><div>notes: {c.notes || '-'}</div><div>{c.started_at || '-'} → {c.completed_at || '-'}</div><div className="form-actions">{role === 'admin_pelunasan' && <select disabled={submitting} value={c.revision_stage || ''} onChange={(e) => updateCycle(c.id, 'stage', e.target.value)}>{STAGE_OPTIONS.map((x) => <option key={x} value={x}>{x || '--'}</option>)}</select>}<select disabled={submitting} value={c.work_status || ''} onChange={(e) => updateCycle(c.id, 'work-status', e.target.value)}>{WORK_OPTIONS.map((x) => <option key={x} value={x}>{x || '--'}</option>)}</select></div></div>)}</div>
  </section>;
}

function Metric({ title, value }) { return <article className="metric-card"><span>{title}</span><strong>{value || 0}</strong></article>; }
function StatusBadge({ value }) { return <span className="payment-pill">{value || '--'}</span>; }

