const BASE_URL = window.GO_API_BASE_URL || '/api';

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return query.toString() ? `?${query.toString()}` : '';
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${response.status}`);
  }
  return response.json();
}

export function listRevisionProjects(params = {}) {
  return request(`/revision-projects${buildQuery(params)}`);
}


export function createRevisionProject(payload) {
  return request('/revision-projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function getRevisionProject(id) {
  return request(`/revision-projects/${id}`);
}

export function getRevisionProjectCycles(id) {
  return request(`/revision-projects/${id}/cycles`);
}

export function mapProjectRowToListItem(row) {
  return {
    id: row.id,
    domain: row.temporary_domain || row.official_domain || '-',
    clientName: row.client_name,
    assignedWebId: row.web_executor_id,
    revisionNo: row.current_revision_no,
    revisionStage: row.current_revision_stage,
    workStatus: row.current_work_status,
    paymentStatus: row.payment_status,
    remainingPayment: row.remaining_payment,
    activeUntil: row.active_until || '-',
    updatedAt: row.updated_at,
  };
}

// TODO(deprecation): remove when Laravel blade revisions list is retired.
export function mapProjectRowToLegacyCard(row) {
  return {
    group_id: row.id,
    domain: row.temporary_domain || row.official_domain || '-',
    client_name: row.client_name,
    web_name: row.web_executor_id ? `#${row.web_executor_id}` : '-',
    revision_label: `R${row.current_revision_no}`,
    revision_helper: `${row.current_revision_stage} / ${row.current_work_status}`,
    payment_label: row.payment_status,
    remaining_payment: row.remaining_payment,
    active_period: row.active_until || '-',
  };
}
