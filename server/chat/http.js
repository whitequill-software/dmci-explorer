export class ChatError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const json = (status, body, headers = {}) => new Response(JSON.stringify(body), {
  status, headers: {'Content-Type':'application/json', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', ...headers},
});
export async function readText(request, max = 16384) {
  if (Number(request.headers.get('content-length')) > max) throw new ChatError(413, 'Message is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new ChatError(400, 'A message is required.');
  let size = 0; const chunks = [];
  try {
    while (true) {
      const {done, value} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > max) { await reader.cancel(); throw new ChatError(413, 'Message is too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return new TextDecoder('utf-8', {fatal:true}).decode(bytes); }
  catch { throw new ChatError(400, 'Invalid message encoding.'); }
}
export function parseJson(text) {
  try { return JSON.parse(text); } catch { throw new ChatError(400, 'Invalid JSON.'); }
}
export async function digest(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), n => n.toString(16).padStart(2,'0')).join('');
}
