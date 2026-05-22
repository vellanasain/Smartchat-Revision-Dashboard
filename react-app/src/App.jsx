import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchJSON, money } from './lib/api';

const filters = [
  ['all', 'Semua'],
  ['unpaid', 'Belum Lunas'],
  ['process_revision', 'Proses Revisi'],
  ['revision_done', 'Revisi Sudah Selesai'],
];

function readParamsFromURL() {
  const query = new URLSearchParams(window.location.search);
  return {
    q: query.get('q') || '',
    filter: query.get('filter') || 'all',
    marketing_id: query.get('marketing_id') || '',
    web_id: query.get('web_id') || '',
    page: Math.max(1, Number(query.get('page') || 1) || 1),
  };
}

function writeParamsToURL(params) {
  const query = new URLSearchParams();
  if (params.filter && params.filter !== 'all') query.set('filter', params.filter);
  if (params.q) query.set('q', params.q);
  if (params.marketing_id) query.set('marketing_id', params.marketing_id);
  if (params.web_id) query.set('web_id', params.web_id);
  if (params.page && params.page > 1) query.set('page', String(params.page));
  const queryString = query.toString();
  const nextURL = `${window.location.pathname}${queryString ? `?${queryString}` : ''}`;
  window.history.pushState({}, '', nextURL);
}



function buildPageItems(currentPage, totalPages) {
  const pages = new Set([1, totalPages]);
  for (let page = currentPage - 1; page <= currentPage + 1; page++) {
    if (page >= 1 && page <= totalPages) pages.add(page);
  }
  const sortedPages = [...pages].sort((a, b) => a - b);
  const items = [];
  for (let index = 0; index < sortedPages.length; index++) {
    const page = sortedPages[index];
    if (index > 0 && page - sortedPages[index - 1] > 1) items.push('...');
    items.push(page);
  }
  return items;
}
export function App() {
  const [theme, setTheme] = useState(localStorage.getItem('revision-theme') || 'dark');
  const [view, setView] = useState(() => (window.location.pathname === '/revisions/create' ? 'create' : 'revisions'));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('revision-theme', theme);
  }, [theme]);

  return (
    <div className="app-shell">
      <aside className="rail" aria-label="Navigasi utama">
        <div className="rail-top">
          <a className="rail-logo" href="#" aria-label="Smartchat">
            <img src="/images/logo-smartchat.webp" alt="Smartchat Logo" className="smartchat-logo-img" />
          </a>
          <a className={`rail-nav-button ${view === 'revisions' ? 'is-active' : ''}`} href="#" onClick={(event) => { event.preventDefault(); setView('revisions'); }} title="Data revisi" aria-label="Data revisi">
            <svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" /><path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></svg>
          </a>
          <a className={`rail-nav-button ${view === 'logs' ? 'is-active' : ''}`} href="#" onClick={(event) => { event.preventDefault(); setView('logs'); }} title="Application Logs" aria-label="Application Logs">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4" /><path d="M9 11h6" /><path d="M9 15h6" /></svg>
          </a>
        </div>
        <div className="rail-bottom">
          <button className="rail-nav-button theme-switch" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Ganti mode gelap terang" title="Ganti mode">
            <span className="theme-icon theme-icon-sun" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg></span>
            <span className="theme-icon theme-icon-moon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" /></svg></span>
          </button>
          <button className="rail-nav-button" type="button" aria-label="Pengaturan" title="Pengaturan">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 .9-1.6V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6.9h.1a2 2 0 0 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" /></svg>
          </button>
          <button className="rail-nav-button logout-button" type="button" aria-label="Logout" title="Logout">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" /><path d="M10 12h10" /><path d="m17 9 3 3-3 3" /></svg>
          </button>
        </div>
      </aside>

      <main className="page-shell">
        <header className="topbar">
          <div>
            <h1>{view === 'logs' ? 'Application Logs' : view === 'create' ? 'Tambah Revisi Baru' : 'Daftar Revisi Website'}</h1>
            <p>Smartchat Website Revision Workspace</p>
          </div>
          <div className="local-state"><span /> Local active</div>
        </header>
        {view === 'logs' ? <LogsPage /> : view === 'create' ? <CreateRevisionPage onBack={() => setView('revisions')} /> : <RevisionsPage onCreate={() => setView('create')} />}
      </main>
    </div>
  );
}

function RevisionsPage({ onCreate }) {
  const [data, setData] = useState(null);
  const [marketingUsers, setMarketingUsers] = useState([]);
  const [websiteUsers, setWebsiteUsers] = useState([]);
  const [params, setParams] = useState(() => readParamsFromURL());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchDraft, setSearchDraft] = useState(() => readParamsFromURL().q);

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

  useEffect(() => {
    const onPopState = () => {
      const nextParams = readParamsFromURL();
      setParams(nextParams);
      setSearchDraft(nextParams.q);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const updateParams = (nextParams) => {
    setParams(nextParams);
    writeParamsToURL(nextParams);
  };

  const stats = data?.stats || { total: 0, unpaid: 0, process_revision: 0, revision_done: 0 };

  return (
    <>
      <section className="workspace-head">
        <h2>Manajemen Revisi Website</h2>
        <form className="search-form" onSubmit={(event) => { event.preventDefault(); updateParams({ ...params, q: searchDraft, page: 1 }); }}>
          <label>
            <span>Cari revisi</span>
            <input type="search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Cari domain, nama klien, atau tim" />
          </label>
          <label>
            <span>Filter tim marketing</span>
            <select value={params.marketing_id} onChange={(event) => updateParams({ ...params, marketing_id: event.target.value, page: 1 })}>
              <option value="">Semua Marketing</option>
              {marketingUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </label>
          <label>
            <span>Filter tim web</span>
            <select value={params.web_id} onChange={(event) => updateParams({ ...params, web_id: event.target.value, page: 1 })}>
              <option value="">Semua Tim Web</option>
              {websiteUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </label>
          <button className="primary-button icon-button search-button" type="submit" aria-label="Cari">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m16.5 16.5 4 4" /></svg>
          </button>
        </form>
        <a className="primary-button add-button" href="/revisions/create" onClick={(event) => { event.preventDefault(); onCreate(); }}>Tambah Revisi Baru</a>
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
            <a key={key} href="#" className={params.filter === key ? 'is-selected' : ''} onClick={(event) => { event.preventDefault(); updateParams({ ...params, filter: key, page: 1 }); }}>{label}</a>
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
              {loading ? <tr><td colSpan="9" className="empty-state">Memuat data...</td></tr> : (data?.items?.length ? data.items.map((item) => <RevisionRow key={item.group_id} item={item} />) : <tr><td colSpan="9" className="empty-state">Tidak ada revisi yang cocok dengan filter.</td></tr>)}
            </tbody>
          </table>
        </div>
        <Pagination
          page={data?.page || 1}
          totalPages={data?.total_pages || 1}
          totalItems={data?.total_items || 0}
          perPage={data?.per_page || 12}
          onPage={(page) => updateParams({ ...params, page })}
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
          {item.revision_id ? <a className="action-button detail" href={`/revisions/${item.revision_id}/edit`} aria-label={`Detail revisi ${item.domain || "-"}`} title="Detail"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" /></svg></a> : <span className="action-button detail is-disabled" aria-label="Detail tidak tersedia"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" /></svg></span>}
          <button className="action-button delete" type="button" aria-label="Hapus"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v5" /><path d="M14 11v5" /></svg></button>
        </div>
      </td>
    </tr>
  );
}

function Pagination({ page, totalPages, totalItems, perPage, onPage }) {
  if (totalPages <= 1) return null;

  const start = totalItems === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, totalItems);
  const items = buildPageItems(page, totalPages);

  return (
    <div className="pagination-wrap">
      <nav className="clean-pagination" role="navigation" aria-label="Pagination">
        <p className="pagination-summary">Showing {start} to {end} of {totalItems} results</p>
        <ul className="pagination">
          <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
            {page <= 1 ? (
              <span className="page-link" aria-hidden="true">&lsaquo;</span>
            ) : (
              <a className="page-link" href="#" rel="prev" aria-label="Halaman sebelumnya" onClick={(event) => { event.preventDefault(); onPage(page - 1); }}>&lsaquo;</a>
            )}
          </li>

          {items.map((item, index) => (
            <li key={`${item}-${index}`} className={`page-item ${item === '...' ? 'disabled' : item === page ? 'active' : ''}`}>
              {item === '...' ? (
                <span className="page-link">...</span>
              ) : item === page ? (
                <span className="page-link">{item}</span>
              ) : (
                <a className="page-link" href="#" onClick={(event) => { event.preventDefault(); onPage(item); }}>{item}</a>
              )}
            </li>
          ))}

          <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
            {page >= totalPages ? (
              <span className="page-link" aria-hidden="true">&rsaquo;</span>
            ) : (
              <a className="page-link" href="#" rel="next" aria-label="Halaman berikutnya" onClick={(event) => { event.preventDefault(); onPage(page + 1); }}>&rsaquo;</a>
            )}
          </li>
        </ul>
      </nav>
    </div>
  );
}


function CreateRevisionPage({ onBack }) {
  const [marketingUsers, setMarketingUsers] = useState([]);
  const [websiteUsers, setWebsiteUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [csrfToken, setCsrfToken] = useState('');
  const [form, setForm] = useState({ domain: '', user_id: '', nama: '', tim_design_id: '', sisa_pelunasan: '' });
  const [moneyInput, setMoneyInput] = useState('');
  const [error, setError] = useState('');
  const [clientMenuOpen, setClientMenuOpen] = useState(false);
  const comboboxRef = useRef(null);

  useEffect(() => {
    fetchJSON('/users/marketing').then(setMarketingUsers).catch(() => {});
    fetchJSON('/users/website').then(setWebsiteUsers).catch(() => {});
    fetch('/revisions/create', { credentials: 'include' })
      .then((response) => response.text())
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const token = doc.querySelector('input[name="_token"]')?.value || '';
        const clientRaw = doc.getElementById('client-data')?.textContent || '[]';
        const serverError = doc.querySelector('.alert.alert-danger')?.textContent?.trim() || '';
        const domain = doc.querySelector('input[name="domain"]')?.value || '';
        const userId = doc.querySelector('select[name="user_id"]')?.value || '';
        const nama = doc.querySelector('input[name="nama"]')?.value || '';
        const timDesignId = doc.querySelector('select[name="tim_design_id"]')?.value || '';
        const sisaPelunasan = doc.querySelector('input[name="sisa_pelunasan"]')?.value || '';

        setCsrfToken(token);
        setClients(JSON.parse(clientRaw));
        setForm({ domain, user_id: userId, nama, tim_design_id: timDesignId, sisa_pelunasan: sisaPelunasan });
        setMoneyInput(formatRupiah(sisaPelunasan));
        setError(serverError);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const closeOnOutside = (event) => {
      if (!comboboxRef.current?.contains(event.target)) {
        setClientMenuOpen(false);
      }
    };

    document.addEventListener('click', closeOnOutside);
    return () => document.removeEventListener('click', closeOnOutside);
  }, []);

  const formatRupiah = (value) => {
    const number = String(value || '').replace(/\D/g, '');
    return number ? `Rp ${new Intl.NumberFormat('id-ID').format(Number(number))}` : '';
  };

  const filteredClients = clients
    .filter((client) => String(client.marketing_id) === String(form.user_id))
    .filter((client) => !form.nama.trim() || String(client.name).toLowerCase().includes(form.nama.trim().toLowerCase()))
    .slice(0, 80);

  const onSubmit = (event) => {
    if (!form.domain || !form.user_id) {
      event.preventDefault();
      setError('Domain sementara dan tim marketing wajib diisi.');
    }
  };

  return (
    <section className="form-page">
      <form className="edit-panel create-revision-form" action="/revisions" method="POST" onSubmit={onSubmit}>
        <input type="hidden" name="_token" value={csrfToken} />
        <div className="form-header">
          <div>
            <p className="eyebrow">Revisi Website</p>
            <h2>Data Revisi Baru</h2>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="form-grid">
          <label className="field">
            <span>Domain Sementara</span>
            <input type="text" name="domain" value={form.domain} onChange={(event) => setForm({ ...form, domain: event.target.value })} placeholder="contoh: namadomain.asa17.com" required />
          </label>

          <label className="field">
            <span>Tim Marketing</span>
            <select name="user_id" value={form.user_id} onChange={(event) => { setForm({ ...form, user_id: event.target.value, nama: '' }); setClientMenuOpen(Boolean(event.target.value)); }} required>
              <option value="">Pilih tim marketing</option>
              {marketingUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </label>

          <label className="field client-combobox" ref={comboboxRef}>
            <span>Nama Klien</span>
            <input type="search" name="nama" value={form.nama} onFocus={() => form.user_id && setClientMenuOpen(true)} onInput={() => form.user_id && setClientMenuOpen(true)} onChange={(event) => setForm({ ...form, nama: event.target.value })} placeholder="Pilih marketing dulu, lalu cari klien" autoComplete="off" />
            <button type="button" className="combo-trigger" onClick={() => form.user_id && setClientMenuOpen((open) => !open)} aria-label="Tampilkan pilihan klien">▾</button>
            <div className="client-menu" hidden={!clientMenuOpen || !form.user_id}>
              {filteredClients.length ? filteredClients.map((client) => (
                <button key={`${client.marketing_id}-${client.name}`} type="button" onClick={() => { setForm({ ...form, nama: client.name }); setClientMenuOpen(false); }}>
                  {client.name}
                </button>
              )) : <div className="client-empty">Tidak ada klien yang cocok.</div>}
            </div>
          </label>

          <label className="field">
            <span>Tim Website</span>
            <select name="tim_design_id" value={form.tim_design_id} onChange={(event) => setForm({ ...form, tim_design_id: event.target.value })}>
              <option value="">--</option>
              {websiteUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Sisa Pelunasan</span>
            <input
              type="text"
              data-money-input
              placeholder="Rp 0"
              inputMode="numeric"
              value={moneyInput}
              onChange={(event) => {
                const raw = event.target.value.replace(/\D/g, '');
                setForm({ ...form, sisa_pelunasan: raw });
                setMoneyInput(formatRupiah(raw));
              }}
            />
            <input type="hidden" name="sisa_pelunasan" value={form.sisa_pelunasan} data-money-value />
          </label>
        </div>

        <div className="form-actions">
          <a className="ghost-button" href="/revisions" onClick={(event) => { event.preventDefault(); onBack(); }}>Back</a>
          <button className="primary-button" type="submit">Save</button>
        </div>
      </form>
    </section>
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
