export const filters = [
  ['all', 'Semua'],
  ['unpaid', 'Belum Lunas'],
  ['process_revision', 'Proses Revisi'],
  ['revision_done', 'Revisi Sudah Selesai'],
];

export function readParamsFromURL() {
  const query = new URLSearchParams(window.location.search);
  return {
    q: query.get('q') || '',
    filter: query.get('filter') || 'all',
    marketing_id: query.get('marketing_id') || '',
    web_id: query.get('web_id') || '',
    page: Math.max(1, Number(query.get('page') || 1) || 1),
  };
}

export function writeParamsToURL(params) {
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

export function buildPageItems(currentPage, totalPages) {
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
