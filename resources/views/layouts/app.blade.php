@php
    $accountName = optional(auth()->user())->name ?: 'Smartchat';
@endphp

<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title', 'Revisi Website')</title>
    <link rel="stylesheet" href="/css/revision-ui.css">
    <script src="/js/revision-ui.js" defer></script>
</head>
<body>
    <div class="app-shell">
        <aside class="rail" aria-label="Navigasi utama">
            <div class="rail-top">
                <a class="rail-logo" href="{{ route('revisions.index', [], false) }}" title="Smartchat" aria-label="Smartchat">
                    <img 
                        src="/images/logo-smartchat.webp" 
                        alt="Smartchat Logo"
                        class="smartchat-logo-img"
                    >
                </a>
                <a class="rail-nav-button is-active" href="{{ route('revisions.index', [], false) }}" title="Data revisi" aria-label="Data revisi">
                    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                        <ellipse cx="12" cy="5" rx="7" ry="3"></ellipse>
                        <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5"></path>
                        <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"></path>
                    </svg>
                </a>
            </div>

            <div class="rail-bottom">
                <button class="rail-nav-button theme-switch" type="button" data-theme-toggle aria-label="Ganti mode gelap terang" title="Ganti mode">
                    <span class="theme-icon theme-icon-sun" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"></path></svg>
                    </span>
                    <span class="theme-icon theme-icon-moon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false"><path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z"></path></svg>
                    </span>
                </button>
                <button class="rail-nav-button" type="button" aria-label="Pengaturan" title="Pengaturan">
                    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                        <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"></path>
                        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 .9-1.6V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6.9h.1a2 2 0 0 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z"></path>
                    </svg>
                </button>
                <button class="rail-nav-button logout-button" type="button" aria-label="Logout" title="Logout">
                    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                        <path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2"></path>
                        <path d="M10 12h10"></path>
                        <path d="m17 9 3 3-3 3"></path>
                    </svg>
                </button>
            </div>
        </aside>

        <div class="page-shell">
            <header class="topbar">
                <div>
                    <h1>@yield('page_title', 'Daftar Revisi Website')</h1>
                    <p>Smartchat Website Revision Workspace</p>
                </div>
                <div class="local-state">
                    <span></span>
                    Local active
                </div>
            </header>

            @if (session('success'))
                <div class="alert alert-success">{{ session('success') }}</div>
            @endif

            @yield('content')
        </div>
    </div>
</body>
</html>
