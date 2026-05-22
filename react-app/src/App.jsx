import { useEffect, useMemo, useState } from 'react';
import { fetchJSON, money } from './lib/api';

const filters = [
  ['all', 'Semua'],
  ['unpaid', 'Belum Lunas'],
  ['process_revision', 'Proses Revisi'],
  ['revision_done', 'Revisi Sudah Selesai'],
];

export function App() {
  const [theme, setTheme] = useState(localStorage.getItem('revision-theme') || 'dark');
  const [view, setView] = useState('revisions');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('revision-theme', theme);
  }, [theme]);

  return (
    <div className="app-shell">
      <aside className="rail" aria-label="Navigasi utama">
        <div className="rail-top">
          <a className="rail-logo" href="#" aria-label="Smartchat">
            <img src="/logo-smartchat.webp" alt="Smartchat Logo" className="smartchat-logo-img" />
          </a>
          <button className={`rail-nav-button ${view === 'revisions' ? 'is-active' : ''}`} onClick={() => setView('revisions')} title="Data revisi">
            <svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" /><path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></svg>
          </button>
          <button className={`rail-nav-button ${view === 'logs' ? 'is-active' : ''}`} onClick={() => setView('logs')} title="Application Logs">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4" /><path d="M9 11h6" /><path d="M9 15h6" /></svg>
          </button>
        </div>
        <div className="rail-bottom">
          <button className="rail-nav-button theme-switch" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Ganti mode">
            <span className="theme-icon theme-icon-sun" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg></span>
            <span className="theme-icon theme-icon-moon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" /></svg></span>
          </button>
        </div>
      </aside>

      <main className="page-shell">
        <header className="topbar">
          <div>
            <h1>{view === 'logs' ? 'Application Logs' : 'Daftar Revisi Website'}</h1>
            <p>Smartchat Website Revision Workspace</p>
          </div>
          <div className="local-state"><span /> React + Go preview</div>
        </header>
        {view === 'logs' ? <LogsPage /> : <RevisionsPage />}
      </main>
    </div>
  );
}

function RevisionsPage() {
  const [data, setData] = useState(null);
  const [marketingUsers, setMarketingUsers] = useState([]);
  const [websiteUsers, setWebsiteUsers] = useState([]);
  const [params, setParams] = useState({ q: '', filter: 'all', marketing_id: '', web_id: '', page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const queryString = useMemo(() => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    query.set('per_page', '12');
    return query.toString();
  }, [params]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchJSON(`/revisions?${queryString}`)
      .then((payload) => alive && setData(payload))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [queryString]);

  useEffect(() => {
    fetchJSON('/users/marketing').then(setMarketingUsers).catch(() => {});
    fetchJSON('/users/website').then(setWebsiteUsers).catch(() => {});
  }, []);

  const stats = data?.stats || { total: 0, unpaid: 0, process_revision: 0, revision_done: 0 };

  return (
    <>
      <section className="workspace-head">
        <h2>Manajemen Revisi Website</h2>
        <form className="search-form" onSubmit={(event) => event.preventDefault()}>
          <label>
            <span>Cari revisi</span>
            <input type="search" value={params.q} onChange={(event) => setParams({ ...params, q: event.target.value, page: 1 })} placeholder="Cari domain, nama klien, atau tim" />
          </label>
          <label>
            <span>Filter tim marketing</span>
            <select value={params.marketing_id} onChange={(event) => setParams({ ...params, marketing_id: event.target.value, page: 1 })}>
              <option value="">Semua Marketing</option>
              {marketingUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </label>
          <label>
            <span>Filter tim web</span>
            <select value={params.web_id} onChange={(event) => setParams({ ...params, web_id: event.target.value, page: 1 })}>
              <option value="">Semua Tim Web</option>
              {websiteUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </label>
          <button className="primary-button icon-button search-button" type="button" aria-label="Cari">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m16.5 16.5 4 4" /></svg>
          </button>
        </form>
        <a className="primary-button add-button" href="#">Tambah Revisi Baru</a>
      </section>

      <section className="metric-grid" aria-label="Ringkasan revisi">
        <Metric title="Total Revisi" value={stats.total} />
        <Metric title="Belum Lunas" value={stats.unpaid} />
        <Metric title="Proses Revisi" value={stats.process_revision} />
        <Metric title="Revisi Selesai" value={stats.revision_done} />
      </section>

      <section className="revision-board">
        <div className="board-title"><h2>Daftar Revisi Aktif</h2></div>
        <div className="filter-tabs" aria-label="Filter revisi">
          {filters.map(([key, label]) => (
            <button key={key} className={params.filter === key ? 'is-selected' : ''} onClick={() => setParams({ ...params, filter: key, page: 1 })}>{label}</button>
          ))}
        </div>
        <div className="revision-table-wrap">
          {error && <div className="alert alert-danger">{error}</div>}
          <table className="revision-table">
            <thead>
              <tr>
                <th>Domain Sementara</th>
                <th>Nama Klien</th>
                <th>Tim Marketing</th>
                <th>Tim Web</th>
                <th>Status Revisi</th>
                <th>Sisa Pelunasan</th>
                <th>Status Pembayaran</th>
                <th>Periode Aktif</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="9" className="empty-state">Memuat data...</td></tr> : data?.items?.map((item) => <RevisionRow key={item.group_id} item={item} />)}
            </tbody>
          </table>
        </div>
        <Pagination
          page={data?.page || 1}
          totalPages={data?.total_pages || 1}
          totalItems={data?.total_items || 0}
          perPage={data?.per_page || 12}
          onPage={(page) => setParams({ ...params, page })}
        />
      </section>
    </>
  );
}

function Metric({ title, value }) {
  return <article className="metric-card"><span>{title}</span><strong>{new Intl.NumberFormat('id-ID').format(value || 0)}</strong></article>;
}

function RevisionRow({ item }) {
  return (
    <tr>
      <td className="domain-column"><strong>{item.domain || '-'}</strong></td>
      <td>{item.client_name || '-'}</td>
      <td>{item.marketing_name || '-'}</td>
      <td>{item.web_name || '--'}</td>
      <td><span className="revision-code">{item.revision_label}</span><small>{item.revision_helper}</small></td>
      <td>{money(item.remaining_payment)}</td>
      <td><span className={`payment-pill ${item.payment_class}`}>{item.payment_label}</span></td>
      <td>{item.active_period || '-'}</td>
      <td>
        <div className="action-buttons">
          <a className="action-button detail" href="#" aria-label="Detail"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" /></svg></a>
          <button className="action-button delete" type="button" aria-label="Hapus"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v5" /><path d="M14 11v5" /></svg></button>
        </div>
      </td>
    </tr>
  );
}

function Pagination({ page, totalPages, totalItems, perPage, onPage }) {
  const start = totalItems === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, totalItems);
  const pages = [];
  const from = Math.max(1, page - 2);
  const to = Math.min(totalPages, page + 2);

  for (let index = from; index <= to; index++) {
    pages.push(index);
  }

  return (
    <div className="pagination-wrap">
      <nav className="clean-pagination" aria-label="Pagination">
        <p className="pagination-summary">Showing {start} to {end} of {totalItems} results</p>
        <ul className="pagination">
          <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
            <button className="page-link" type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Halaman sebelumnya">&lsaquo;</button>
          </li>
          {from > 1 && <li className="page-item"><button className="page-link" type="button" onClick={() => onPage(1)}>1</button></li>}
          {from > 2 && <li className="page-item disabled"><span className="page-link">...</span></li>}
          {pages.map((item) => (
            <li key={item} className={`page-item ${item === page ? 'active' : ''}`}>
              <button className="page-link" type="button" onClick={() => onPage(item)}>{item}</button>
            </li>
          ))}
          {to < totalPages - 1 && <li className="page-item disabled"><span className="page-link">...</span></li>}
          {to < totalPages && <li className="page-item"><button className="page-link" type="button" onClick={() => onPage(totalPages)}>{totalPages}</button></li>}
          <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
            <button className="page-link" type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Halaman berikutnya">&rsaquo;</button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

function LogsPage() {
  const [lines, setLines] = useState([]);
  const [lineCount, setLineCount] = useState(300);

  useEffect(() => {
    fetchJSON(`/debug/logs?lines=${lineCount}`).then((payload) => setLines(payload.lines || [])).catch(() => setLines([]));
  }, [lineCount]);

  return (
    <section className="debug-page">
      <div className="debug-toolbar">
        <div>
          <h2>Application Logs</h2>
          <p>storage/logs/laravel.log</p>
        </div>
        <form className="debug-actions" onSubmit={(event) => event.preventDefault()}>
          <select value={lineCount} onChange={(event) => setLineCount(Number(event.target.value))}>
            {[100, 300, 500, 1000].map((option) => <option key={option} value={option}>{option} lines</option>)}
          </select>
          <button className="primary-button" type="button" onClick={() => setLineCount((value) => Number(value))}>Refresh</button>
        </form>
      </div>
      <div className="log-panel" aria-label="Application log output">
        {lines.length ? lines.map((line, index) => <div key={`${index}-${line}`} className={`log-line ${logClass(line)}`}>{line}</div>) : <div className="log-empty">Belum ada log yang bisa ditampilkan.</div>}
      </div>
    </section>
  );
}

function logClass(line) {
  if (line.includes('.ERROR') || line.includes(' ERROR:')) return 'is-error';
  if (line.includes('.WARNING') || line.includes(' WARNING:')) return 'is-warning';
  if (line.includes('.INFO') || line.includes(' INFO:')) return 'is-info';
  if (line.includes('.DEBUG') || line.includes(' DEBUG:')) return 'is-debug';
  return '';
}
