export const CONSENT_VERSION = '2026-10-15';
export const CONSENT_TEXT = 'I consent to DMCI Explorer collecting my contact details and inquiry, storing them in HubSpot CRM, and using them to respond to this inquiry. This does not subscribe me to marketing. I understand my information will not be sold to third parties.';

export function normalizePhone(value) {
  const phone = value.replace(/[\s().-]/g, '');
  if (/^09\d{9}$/.test(phone)) return '+63' + phone.slice(1);
  if (/^639\d{9}$/.test(phone)) return '+' + phone;
  return phone;
}

export async function sendInquiry(form, token, fetcher = fetch) {
  const response = await fetcher('/api/inquiries', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({...form, consentVersion: CONSENT_VERSION, turnstileToken: token}),
    signal: AbortSignal.timeout(30000),
  });
  let result;
  try { result = await response.json(); }
  catch { throw new Error('We could not confirm delivery. Your draft is still here. Please try again or contact us on Messenger.'); }
  if (!response.ok || result.ok !== true) {
    const error = new Error(result.message || 'We could not confirm delivery. Please try again.');
    error.fields = result.errors;
    throw error;
  }
}
