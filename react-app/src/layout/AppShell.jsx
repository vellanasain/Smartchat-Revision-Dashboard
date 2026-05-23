import React from 'react';

export function AppShell({ theme, setTheme, title, children, path, navigate }) {
  return (
    <div className="app-shell">
      <aside className="rail" aria-label="Navigasi utama">
        <div className="rail-top">
          <a className="rail-logo" href="#" aria-label="Smartchat"><img src="/images/logo-smartchat.webp" alt="Smartchat Logo" className="smartchat-logo-img" /></a>
          <a className={`rail-nav-button ${path.startsWith('/revisions') ? 'is-active' : ''}`} href="/revisions" onClick={(e) => { e.preventDefault(); navigate('/revisions'); }} title="Data revisi" aria-label="Data revisi"><svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" /><path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></svg></a>
          <a className={`rail-nav-button ${path === '/debug/logs' ? 'is-active' : ''}`} href="/debug/logs" onClick={(e) => { e.preventDefault(); navigate('/debug/logs'); }} title="Application Logs" aria-label="Application Logs"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4" /><path d="M9 11h6" /><path d="M9 15h6" /></svg></a>
        </div>
        <div className="rail-bottom">
          <button className="rail-nav-button theme-switch" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Ganti mode gelap terang" title="Ganti mode"><span className="theme-icon theme-icon-sun" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg></span><span className="theme-icon theme-icon-moon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" /></svg></span></button>
        </div>
      </aside>
      <main className="page-shell">
        <header className="topbar"><div><h1>{title}</h1><p>Smartchat Website Revision Workspace</p></div><div className="local-state"><span /> Local active</div></header>
        {children}
      </main>
    </div>
  );
}
