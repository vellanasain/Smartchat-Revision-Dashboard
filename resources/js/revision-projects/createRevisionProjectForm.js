import { createRevisionProject } from '../api/revisionProjectsClient';

export function validateCreateRevisionProject(payload) {
  const errors = {};
  if (!payload.client_name || payload.client_name.trim().length < 2) errors.client_name = 'Client name wajib diisi.';
  if (payload.remaining_payment != null && Number(payload.remaining_payment) < 0) errors.remaining_payment = 'Remaining payment tidak boleh negatif.';
  if (payload.payment_status && !['unpaid','partial_paid','paid','overdue'].includes(payload.payment_status)) errors.payment_status = 'Payment status tidak valid.';
  return errors;
}

export async function submitCreateRevisionProject(payload, options = {}) {
  const errors = validateCreateRevisionProject(payload);
  if (Object.keys(errors).length) {
    const e = new Error('validation_error');
    e.validation = errors;
    throw e;
  }
  return createRevisionProject(payload, options);
}
