import React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchJSON } from './lib/api';
import { AppShell } from './layout/AppShell';
import { filters, readParamsFromURL, writeParamsToURL } from './utils/revisions';
import { Metric, RevisionRow } from './components/RevisionsTable';
import { Pagination } from './components/Pagination';

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
  const [path, setPath] = useState(() => window.location.pathname || '/revisions');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('revision-theme', theme);
  }, [theme]);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname || '/revisions');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (to) => {
    if (window.location.pathname !== to) {
      window.history.pushState({}, '', to);
      setPath(to);
    }
  };

  const detailMatch = path.match(/^\/revisions\/(\d+)(?:\/edit)?$/);
  const title = path === '/debug/logs' ? 'Application Logs' : path === '/revisions/create' ? 'Tambah Revisi Baru' : detailMatch ? 'Detail Revisi' : 'Daftar Revisi Website';

  return (
    <AppShell theme={theme} setTheme={setTheme} title={title} path={path} navigate={navigate}>
      {path === '/debug/logs' ? <LogsPage /> : path === '/revisions/create' ? <CreateRevisionPage onBack={() => navigate('/revisions')} /> : detailMatch ? <DetailRevisionPage revisionId={Number(detailMatch[1])} onBack={() => navigate('/revisions')} /> : <RevisionsPage onCreate={() => navigate('/revisions/create')} onOpenDetail={(revisionId) => navigate(`/revisions/${revisionId}/edit`)} />}
    </AppShell>
  );
}

function RevisionsPage({ onCreate, onOpenDetail }) {
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
    setError('');
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
              {loading ? <tr><td colSpan="9" className="empty-state">Memuat data...</td></tr> : (data?.items?.length ? data.items.map((item) => <RevisionRow key={item.group_id} item={item} onOpenDetail={onOpenDetail} />) : <tr><td colSpan="9" className="empty-state">Tidak ada revisi yang cocok dengan filter.</td></tr>)}
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

function DetailRevisionPage({ revisionId, onBack }) {
  const [csrfToken, setCsrfToken] = useState('');
  const [error, setError] = useState('');
  const [domain, setDomain] = useState('-');
  const [rows, setRows] = useState([0, 1, 2, 3].map((jenis) => ({ jenis, stage: '', work: '', note: '' })));
  const [projectNotes, setProjectNotes] = useState({ package_website: '', biaya: '', domain_resmi: '' });
  const [projectInfo, setProjectInfo] = useState({ domain_sementara: '-', nama_klien: '-', tim_marketing: '-', tim_web: '--', sisa_pelunasan: '-', status_pembayaran: '-', tanggal_pelunasan: '-' });
  const [noteDialog, setNoteDialog] = useState({ open: false, jenis: null, value: '' });
  const [options, setOptions] = useState({ stages: [], work: [], work_r0: [] });

  useEffect(() => {
    if (!revisionId) return;
    let alive = true;
    fetchJSON(`/revisions/${revisionId}/detail-bootstrap`)
      .then((payload) => {
        if (!alive) return;
        setCsrfToken(payload.csrf_token || '');
        setError('');
        setDomain(payload.domain || '-');
        setRows(payload.rows || []);
        setProjectNotes(payload.project_notes || { package_website: '', biaya: '', domain_resmi: '' });
        setProjectInfo(payload.project_info || { domain_sementara: '-', nama_klien: '-', tim_marketing: '-', tim_web: '--', sisa_pelunasan: '-', status_pembayaran: '-', tanggal_pelunasan: '-' });
        setOptions(payload.options || { stages: [], work: [], work_r0: [] });
      })
      .catch(() => alive && setError('Gagal memuat detail revisi.'));
    return () => { alive = false; };
  }, [revisionId]);

  if (!revisionId) return <section className="form-page"><div className="alert alert-danger">Detail revisi tidak tersedia.</div></section>;


  return (
    <section className="detail-layout">
      <form id="revision-detail-form" className="revision-work-panel" action={`/revisions/${revisionId}`} method="POST">
        <input type="hidden" name="_token" value={csrfToken} />
        <input type="hidden" name="_method" value="PUT" />
        <div className="form-header"><div><p className="eyebrow">Revision Workflow</p><h2>{domain}</h2></div></div>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="workflow-table-wrap">
          <table className="workflow-table">
            <thead><tr><th>Status Revisi</th><th>Revision Stage</th><th>Work Status</th><th>Notes</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.jenis}>
                  <td><span className="revision-code">R{row.jenis}</span><small>{row.jenis === 0 ? 'Website sudah jadi' : `Revisi ${row.jenis}`}</small></td>
                  <td>{row.jenis === 0 ? <span className="static-select">--</span> : <select name={`stages[${row.jenis}]`} value={row.stage} onChange={(e)=>setRows(rows.map(r=>{ if(r.jenis!==row.jenis) return r; const nextStage=e.target.value; const nextWork=nextStage==='ready_to_revision' && !r.work ? 'not_started' : r.work; return {...r,stage:nextStage,work:nextWork}; }))}>{options.stages.map((opt) => <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>)}</select>}</td>
                  <td><select name={`work_statuses[${row.jenis}]`} value={row.work} onChange={(e)=>setRows(rows.map(r=>r.jenis===row.jenis?{...r,work:e.target.value}:r))}>{(row.jenis === 0 ? options.work_r0 : options.work).map((opt) => <option key={opt.value || `empty-${row.jenis}`} value={opt.value}>{opt.label}</option>)}</select></td>
                  <td><input type="hidden" name={`revision_notes[${row.jenis}]`} value={row.note} /><button className="note-button" type="button" onClick={()=>setNoteDialog({open:true,jenis:row.jenis,value:row.note})}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"></path><path d="M14 3v5h5"></path><path d="M9 13h6"></path><path d="M9 17h6"></path></svg></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="form-actions"><a className="ghost-button" href="/revisions" onClick={(e)=>{e.preventDefault();onBack();}}>Back</a><button className="primary-button" type="submit">Update</button></div>
      </form>
      <aside className="revision-info-panel">
        <div className="side-section">
          <p className="eyebrow">Project Info</p>
          <dl className="info-list">
            <div><dt>Domain Sementara</dt><dd>{projectInfo.domain_sementara}</dd></div>
            <div><dt>Nama Klien</dt><dd>{projectInfo.nama_klien}</dd></div>
            <div><dt>Tim Marketing</dt><dd>{projectInfo.tim_marketing}</dd></div>
            <div><dt>Tim Web</dt><dd>{projectInfo.tim_web}</dd></div>
            <div><dt>Sisa Pelunasan</dt><dd>{projectInfo.sisa_pelunasan}</dd></div>
            <div><dt>Status Pembayaran</dt><dd>{projectInfo.status_pembayaran}</dd></div>
            <div><dt>Tanggal Pelunasan</dt><dd>{projectInfo.tanggal_pelunasan}</dd></div>
          </dl>
        </div>
        <div className="side-section project-notes">
          <p className="eyebrow">Notes Project</p>
          <label className="field"><span>Paket Website</span><input form="revision-detail-form" type="text" name="project_notes[package_website]" value={projectNotes.package_website} onChange={(e)=>setProjectNotes({...projectNotes,package_website:e.target.value})} /></label>
          <label className="field"><span>Biaya</span><input form="revision-detail-form" type="text" name="project_notes[biaya]" value={projectNotes.biaya} onChange={(e)=>setProjectNotes({...projectNotes,biaya:e.target.value})} /></label>
          <label className="field"><span>Domain Resmi</span><input form="revision-detail-form" type="text" name="project_notes[domain_resmi]" value={projectNotes.domain_resmi} onChange={(e)=>setProjectNotes({...projectNotes,domain_resmi:e.target.value})} /></label>
        </div>
      </aside>
      {noteDialog.open && <div className="note-modal"><div className="note-modal-backdrop" onClick={()=>setNoteDialog({open:false,jenis:null,value:''})}></div><section className="note-dialog" role="dialog" aria-modal="true"><header><h2>Notes</h2></header><div className="note-dialog-body"><label className="field"><span>Notes</span><textarea rows="10" value={noteDialog.value} onChange={(e)=>setNoteDialog({...noteDialog,value:e.target.value})}></textarea></label></div><footer><button className="ghost-button" type="button" onClick={()=>setNoteDialog({open:false,jenis:null,value:''})}>Back</button><button className="primary-button" type="button" onClick={()=>{setRows(rows.map(r=>r.jenis===noteDialog.jenis?{...r,note:noteDialog.value}:r));setNoteDialog({open:false,jenis:null,value:''});}}>Save</button></footer></section></div>}
    </section>
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
    let alive = true;
    fetchJSON('/revisions/create-bootstrap')
      .then((payload) => {
        if (!alive) return;
        setCsrfToken(payload.csrf_token || '');
        setMarketingUsers(payload.marketing_users || []);
        setWebsiteUsers(payload.website_users || []);
        setClients(payload.clients || []);
        const defaults = payload.defaults || {};
        const nextForm = {
          domain: defaults.domain || '',
          user_id: defaults.user_id || '',
          nama: defaults.nama || '',
          tim_design_id: defaults.tim_design_id || '',
          sisa_pelunasan: defaults.sisa_pelunasan || '',
        };
        setForm(nextForm);
        setMoneyInput(formatRupiah(nextForm.sisa_pelunasan));
        setError(payload.error || '');
      })
      .catch(() => {});
    return () => { alive = false; };
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
    if (!csrfToken) {
      event.preventDefault();
      setError('Token keamanan belum siap. Coba beberapa detik lagi.');
      return;
    }
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
