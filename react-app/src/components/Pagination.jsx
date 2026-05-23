import React from 'react';
import { buildPageItems } from '../utils/revisions';

export function Pagination({ page, totalPages, totalItems, perPage, onPage }) {
  if (totalPages <= 1) return null;
  const start = totalItems === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, totalItems);
  const items = buildPageItems(page, totalPages);
  return <div className="pagination-wrap"><nav className="clean-pagination" role="navigation" aria-label="Pagination"><p className="pagination-summary">Showing {start} to {end} of {totalItems} results</p><ul className="pagination"><li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>{page <= 1 ? <span className="page-link" aria-hidden="true">&lsaquo;</span> : <a className="page-link" href="#" rel="prev" aria-label="Halaman sebelumnya" onClick={(event) => { event.preventDefault(); onPage(page - 1); }}>&lsaquo;</a>}</li>{items.map((item, index) => (<li key={`${item}-${index}`} className={`page-item ${item === '...' ? 'disabled' : item === page ? 'active' : ''}`}>{item === '...' ? <span className="page-link">...</span> : item === page ? <span className="page-link">{item}</span> : <a className="page-link" href="#" onClick={(event) => { event.preventDefault(); onPage(item); }}>{item}</a>}</li>))}<li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>{page >= totalPages ? <span className="page-link" aria-hidden="true">&rsaquo;</span> : <a className="page-link" href="#" rel="next" aria-label="Halaman berikutnya" onClick={(event) => { event.preventDefault(); onPage(page + 1); }}>&rsaquo;</a>}</li></ul></nav></div>;
}
