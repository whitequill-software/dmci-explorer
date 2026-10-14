import {ChatError} from './http.js';
export const DAY = 86400000;
export async function takeQuota(db, bucket, limit, expiresAt) {
  const result = await db.prepare(`INSERT INTO chat_usage(bucket,calls,expires_at) VALUES(?,1,?)
    ON CONFLICT(bucket) DO UPDATE SET calls=calls+1 WHERE calls < ? RETURNING calls`).bind(bucket, expiresAt, limit).first();
  if (!result) throw new ChatError(429, 'The chat usage limit has been reached. Please contact us on Messenger.');
}
export async function openSession(db, id, now) {
  // Expired context must not be resurrected by an old browser cookie or queued message.
  await db.prepare('DELETE FROM chat_sessions WHERE id=? AND expires_at<=? AND lease_until<=?').bind(id,now,now).run();
  await db.prepare('INSERT OR IGNORE INTO chat_sessions(id,expires_at) VALUES(?,?)').bind(id,now+DAY).run();
  const lease = crypto.randomUUID();
  const row = await db.prepare('UPDATE chat_sessions SET lease=?,lease_until=? WHERE id=? AND lease_until<=? RETURNING state')
    .bind(lease,now+90000,id,now).first();
  if (!row) throw new ChatError(409, 'Another message is being processed. Please try again shortly.');
  return {lease, state:JSON.parse(row.state)};
}
export async function cachedEvent(db, id, event, now) {
  const row = await db.prepare('SELECT response,delivered FROM chat_events WHERE session_id=? AND event_id=? AND expires_at>?').bind(id,event,now).first();
  return row && {response:JSON.parse(row.response), delivered:!!row.delivered};
}
export async function finishSession(db, id, lease, state, event, response, now) {
  // A live lease is required for both writes. INSERT selects the owned session, so an expired
  // worker cannot overwrite a newer response after another worker acquired the lease.
  const results = await db.batch([
    db.prepare(`INSERT OR REPLACE INTO chat_events(session_id,event_id,response,expires_at)
      SELECT id,?,?,? FROM chat_sessions WHERE id=? AND lease=?`).bind(event,JSON.stringify(response),now+DAY,id,lease),
    db.prepare('UPDATE chat_sessions SET state=?,expires_at=?,lease=NULL,lease_until=0 WHERE id=? AND lease=?')
      .bind(JSON.stringify(state),now+DAY,id,lease),
  ]);
  if (!results[1].meta.changes) throw new ChatError(409, 'Chat changed. Please retry.');
}
export const releaseSession = (db,id,lease) => db.prepare('UPDATE chat_sessions SET lease=NULL,lease_until=0 WHERE id=? AND lease=?').bind(id,lease).run();
export const markDelivered = (db,id,event) => db.prepare('UPDATE chat_events SET delivered=1 WHERE session_id=? AND event_id=?').bind(id,event).run();
export async function sessionPaused(db,id) {
  const row = await db.prepare('SELECT state FROM chat_sessions WHERE id=?').bind(id).first();
  return !!row && JSON.parse(row.state).paused===true;
}
export async function purgeExpired(db, now = Date.now()) {
  await db.batch([
    db.prepare('DELETE FROM chat_events WHERE expires_at<=?').bind(now),
    db.prepare('DELETE FROM chat_sessions WHERE expires_at<=? AND lease_until<=?').bind(now,now),
    db.prepare('DELETE FROM chat_usage WHERE expires_at<=?').bind(now),
  ]);
}
