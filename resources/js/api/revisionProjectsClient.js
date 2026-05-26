const BASE_URL = window.GO_API_BASE_URL || '/api';

function headers(extra = {}) {
  return {
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${response.status}`);
  }
  return response.json();
}

export function listRevisionProjects() {
  return request('/revision-projects');
}

export function getRevisionProject(id) {
  return request(`/revision-projects/${id}`);
}

export function updateRevisionProject(id, payload) {
  return request(`/revision-projects/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(payload),
  });
}

export function createPaymentTransaction(payload) {
  return request('/payment-transactions', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  });
}

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
