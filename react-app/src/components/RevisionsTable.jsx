import React from 'react';
import { money } from '../lib/api';

export function Metric({ title, value }) {
  return <article className="metric-card"><span>{title}</span><strong>{new Intl.NumberFormat('id-ID').format(value || 0)}</strong></article>;
}

export function RevisionRow({ item, onOpenDetail }) {
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
      <td><div className="action-buttons">{item.revision_id ? <a className="action-button detail" href={`/revisions/${item.revision_id}/edit`} onClick={(event) => { event.preventDefault(); onOpenDetail(item.revision_id); }} aria-label={`Detail revisi ${item.domain || "-"}`} title="Detail"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" /></svg></a> : <span className="action-button detail is-disabled" aria-label="Detail tidak tersedia"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" /></svg></span>}<button className="action-button delete" type="button" aria-label="Hapus"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v5" /><path d="M14 11v5" /></svg></button></div></td>
    </tr>
  );
}
