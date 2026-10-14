import {properties, validateInquiry} from '../../src/data.js';
import {CONSENT_TEXT, CONSENT_VERSION, normalizePhone} from '../../src/inquiry.js';

const CONTACTS = 'https://api.hubapi.com/crm/objects/2026-09/contacts';
const MAX_BYTES = 16384;
const json = (status, body, headers = {}) => new Response(JSON.stringify(body), {
  status, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', ...headers},
});
class ServiceError extends Error {
  constructor(status) { super('Upstream request failed'); this.status = status; }
}

async function readBody(request) {
  if (Number(request.headers.get('content-length')) > MAX_BYTES) throw new ServiceError(413);
  const reader = request.body?.getReader();
  if (!reader) throw new ServiceError(400);
  const chunks = []; let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new ServiceError(413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(400);
  } finally { reader.releaseLock(); }
}

export function validatePayload(body) {
  if (!body || Array.isArray(body) || typeof body !== 'object') return {payload: 'Invalid inquiry.'};
  const errors = {};
  for (const [key, max] of Object.entries({name:120, phone:40, email:254, project:100, bedroom:30, message:3000, website:200, turnstileToken:2048})) {
    if (typeof body[key] !== 'string' || body[key].length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body[key])) errors[key] = 'Invalid or oversized field.';
  }
  if (Object.keys(errors).length) return errors;
  Object.assign(errors, validateInquiry(body));
  if (body.consent !== true) errors.consent = 'Explicit consent is required.';
  if (body.consentVersion !== CONSENT_VERSION) errors.consent = 'Consent text has changed. Reload this page and review it.';
  if (!['Not sure yet', ...properties.map(p => p.name)].includes(body.project)) errors.project = 'Choose a listed project.';
  if (!['', '2BR', '3BR', 'Not sure yet'].includes(body.bedroom)) errors.bedroom = 'Choose a listed bedroom preference.';
  if (!body.turnstileToken.trim()) errors.turnstileToken = 'Complete the security check.';
  return errors;
}

async function hubspot(env, fetcher, path = '', method = 'GET', body) {
  const response = await fetcher(CONTACTS + path, {
    method, headers: {Authorization: `Bearer ${env.HUBSPOT_ACCESS_TOKEN}`, 'Content-Type':'application/json'},
    ...(body ? {body: JSON.stringify(body)} : {}), signal: AbortSignal.timeout(7000), redirect: 'error',
  });
  if (!response.ok) throw new ServiceError(response.status);
  const result = await response.json();
  if (!result || typeof result !== 'object') throw new ServiceError(502);
  return result;
}

async function lookup(env, fetcher, value, property) {
  try { return await hubspot(env, fetcher, `/${encodeURIComponent(value)}?idProperty=${property}`); }
  catch (error) { if (error.status === 404) return null; throw error; }
}

export async function saveContact(env, fetcher, body) {
  const email = body.email.trim().toLowerCase();
  const phone = normalizePhone(body.phone);
  // Email remains the primary identity. Never merge two people merely sharing a telephone.
  const identity = email || phone;
  const identityProperty = email ? 'email' : 'dmci_phone_identity';
  let existing = await lookup(env, fetcher, identity, identityProperty);
  if (!existing && !email) {
    const found = await hubspot(env, fetcher, '/search', 'POST', {
      filterGroups: [{filters: [{propertyName:'phone', operator:'EQ', value:phone}]}], limit:2,
    });
    if (!Array.isArray(found.results)) throw new ServiceError(502);
    if (found.total > 1 || found.results.length > 1) throw new ServiceError(409);
    existing = found.results[0];
  }
  const [firstname, ...last] = body.name.trim().split(/\s+/);
  const values = {
    firstname, ...(last.length ? {lastname:last.join(' ')} : {}), phone,
    ...(email ? {email} : {dmci_phone_identity:phone}),
    dmci_project:body.project, dmci_bedroom:body.bedroom, dmci_message:body.message.trim(),
    dmci_consent:'true', dmci_consent_version:CONSENT_VERSION, dmci_consent_text:CONSENT_TEXT,
    dmci_consent_at:new Date().toISOString(), dmci_source:'DMCI Explorer website',
  };
  const patch = id => hubspot(env, fetcher, `/${encodeURIComponent(id)}`, 'PATCH', {properties:values});
  let result;
  if (existing) {
    if (!existing.id) throw new ServiceError(502);
    result = await patch(existing.id);
  } else {
    try { result = await hubspot(env, fetcher, '', 'POST', {properties:values}); }
    catch (error) {
      if (error.status !== 409) throw error;
      // Recover a concurrent create without parsing PII from HubSpot error messages.
      const contact = await lookup(env, fetcher, identity, identityProperty);
      if (!contact?.id) throw error;
      result = await patch(contact.id);
    }
  }
  if (!result.id || result.archived === true) throw new ServiceError(502);
}

export async function handleInquiry(request, env, fetcher = fetch) {
  if (request.method !== 'POST') return json(405, {ok:false, message:'Use POST.'}, {Allow:'POST'});
  const origin = new URL(request.url).origin;
  if (request.headers.get('origin') !== origin || request.headers.get('sec-fetch-site') === 'cross-site') {
    return json(403, {ok:false, message:'Submit your inquiry from this website.'});
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return json(415, {ok:false, message:'JSON is required.'});
  }
  if (env.INQUIRIES_ENABLED !== 'true' || env.APPROVED_CONSENT_VERSION !== CONSENT_VERSION ||
      !env.HUBSPOT_ACCESS_TOKEN || !env.TURNSTILE_SECRET_KEY) {
    return json(503, {ok:false, message:'Inquiry delivery is unavailable. Please contact us on Messenger.'});
  }
  try {
    const body = await readBody(request);
    if (body && !Array.isArray(body) && typeof body === 'object') {
      for (const field of ['email', 'bedroom', 'message', 'website']) {
        if (body[field] === undefined) body[field] = '';
      }
    }
    const errors = validatePayload(body);
    if (Object.keys(errors).length) return json(400, {ok:false, message:'Check your inquiry details.', errors});
    if (body.website !== '') return json(400, {ok:false, message:'Unable to verify this inquiry.'});
    const verification = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY, response:body.turnstileToken,
        remoteip:request.headers.get('CF-Connecting-IP') || undefined}),
      signal:AbortSignal.timeout(7000), redirect:'error',
    });
    if (!verification.ok) throw new ServiceError(503);
    const verified = await verification.json();
    if (verified.success !== true || verified.action !== 'inquiry' || verified.hostname !== new URL(request.url).hostname) {
      return json(400, {ok:false, message:'Security check expired or failed. Please complete it again.'});
    }
    await saveContact(env, fetcher, body);
    return json(200, {ok:true, message:'Your inquiry was received.'});
  } catch (error) {
    if ([400,413].includes(error.status)) return json(error.status, {ok:false, message:error.status === 413 ? 'Inquiry is too large.' : 'Invalid JSON inquiry.'});
    if (error.status === 429) return json(503, {ok:false, message:'Inquiry delivery is busy. Please wait a minute and try again.'}, {'Retry-After':'60'});
    // Do not log personal data, tokens, or upstream error bodies. A timeout may follow a committed write.
    return json(502, {ok:false, message:'We could not confirm delivery. Your draft is still here. Please try again or contact us on Messenger.'});
  }
}

export const onRequest = ({request, env}) => handleInquiry(request, env);
