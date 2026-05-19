(function () {
    const root = document.documentElement;
    const savedTheme = localStorage.getItem('revision-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

    root.setAttribute('data-theme', initialTheme);

    document.addEventListener('DOMContentLoaded', () => {
        const toggle = document.querySelector('[data-theme-toggle]');
        const searchInput = document.querySelector('input[type="search"]');

        if (toggle) {
            toggle.addEventListener('click', () => {
                const nextTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                root.setAttribute('data-theme', nextTheme);
                localStorage.setItem('revision-theme', nextTheme);
            });
        }

        document.querySelectorAll('[data-auto-submit]').forEach((field) => {
            field.addEventListener('change', () => {
                field.closest('form')?.submit();
            });
        });

        document.querySelectorAll('[data-confirm-delete]').forEach((form) => {
            form.addEventListener('submit', (event) => {
                if (!confirm('Hapus data revisi ini?')) {
                    event.preventDefault();
                }
            });
        });

        const clientDataNode = document.getElementById('client-data');
        const marketingSelect = document.querySelector('[data-marketing-select]');
        const clientSearch = document.querySelector('[data-client-search]');
        const clientOptions = document.querySelector('[data-client-menu]');

        if (clientDataNode && marketingSelect && clientSearch && clientOptions) {
            const clients = JSON.parse(clientDataNode.textContent || '[]');
            let filteredClients = [];

            const renderClientOptions = () => {
                const marketingId = marketingSelect.value;
                const keyword = clientSearch.value.trim().toLowerCase();
                filteredClients = clients
                    .filter((client) => String(client.marketing_id) === String(marketingId))
                    .filter((client) => !keyword || String(client.name).toLowerCase().includes(keyword))
                    .slice(0, 80);

                const escapeAttr = (value) => String(value)
                    .replace(/&/g, '&amp;')
                    .replace(/"/g, '&quot;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');

                clientOptions.innerHTML = filteredClients.length
                    ? filteredClients.map((client) => `<button type="button" data-client-name="${escapeAttr(client.name)}">${escapeAttr(client.name)}</button>`).join('')
                    : '<div class="client-empty">Tidak ada klien yang cocok.</div>';

                clientOptions.hidden = !marketingId;
            };

            const closeClientMenu = () => {
                clientOptions.hidden = true;
            };

            const openClientMenu = () => {
                renderClientOptions();
                if (marketingSelect.value) {
                    clientOptions.hidden = false;
                }
            };

            marketingSelect.addEventListener('change', () => {
                clientSearch.value = '';
                openClientMenu();
            });

            clientSearch.addEventListener('focus', openClientMenu);
            clientSearch.addEventListener('input', openClientMenu);

            document.querySelector('[data-client-toggle]')?.addEventListener('click', openClientMenu);

            clientOptions.addEventListener('click', (event) => {
                const option = event.target.closest('[data-client-name]');
                if (!option) {
                    return;
                }

                clientSearch.value = option.dataset.clientName;
                closeClientMenu();
            });

            document.addEventListener('click', (event) => {
                if (!event.target.closest('.client-combobox')) {
                    closeClientMenu();
                }
            });

            closeClientMenu();
        }

        const moneyInput = document.querySelector('[data-money-input]');
        const moneyValue = document.querySelector('[data-money-value]');

        if (moneyInput && moneyValue) {
            const formatRupiah = (value) => {
                const number = String(value || '').replace(/\D/g, '');
                return number ? `Rp ${new Intl.NumberFormat('id-ID').format(Number(number))}` : '';
            };

            if (moneyValue.value) {
                moneyInput.value = formatRupiah(moneyValue.value);
            }

            moneyInput.addEventListener('input', () => {
                const raw = moneyInput.value.replace(/\D/g, '');
                moneyValue.value = raw;
                moneyInput.value = formatRupiah(raw);
            });
        }

        const noteModal = document.querySelector('[data-note-modal]');
        const noteEditor = document.querySelector('[data-note-editor]');
        let activeNoteInput = null;

        if (noteModal && noteEditor) {
            const openNote = (input) => {
                activeNoteInput = input;
                noteEditor.value = input.value || '';
                noteModal.hidden = false;
                noteEditor.focus();
            };

            const closeNote = () => {
                noteModal.hidden = true;
                activeNoteInput = null;
            };

            document.querySelectorAll('[data-note-open]').forEach((button) => {
                button.addEventListener('click', () => {
                    const input = document.querySelector(`[data-note-value="${button.dataset.noteOpen}"]`);
                    if (input) {
                        openNote(input);
                    }
                });
            });

            document.querySelector('[data-note-save]')?.addEventListener('click', () => {
                if (activeNoteInput) {
                    activeNoteInput.value = noteEditor.value;
                }
                closeNote();
            });

            document.querySelectorAll('[data-note-close]').forEach((button) => {
                button.addEventListener('click', closeNote);
            });

            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && !noteModal.hidden) {
                    closeNote();
                }
            });
        }

        document.querySelectorAll('[data-revision-stage]').forEach((stageSelect) => {
            stageSelect.addEventListener('change', () => {
                const row = stageSelect.closest('tr');
                const workSelect = row?.querySelector('[data-work-status]');
                if (stageSelect.value === 'ready_to_revision' && workSelect && !workSelect.value) {
                    workSelect.value = 'not_started';
                }
            });
        });

        if (searchInput && searchInput.value) {
            searchInput.focus();
            searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
        }
    });
})();
