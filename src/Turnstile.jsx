import React, {useEffect, useRef, useState} from 'react';

let loading;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loading) loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => { script.remove(); loading = undefined; reject(new Error('Security check unavailable.')); };
    document.head.append(script);
  });
  return loading;
}

export function Turnstile({onToken, resetKey, siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY}) {
  const container = useRef(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true, widget;
    setFailed(false);
    onToken('');
    if (siteKey) loadTurnstile().then(api => {
      if (!active) return;
      widget = api.render(container.current, {
        sitekey:siteKey, action:'inquiry', size:'flexible',
        callback:token => { if (active) { setFailed(false); onToken(token); } },
        'expired-callback':() => { if (active) onToken(''); },
        'error-callback':() => { if (active) { onToken(''); setFailed(true); } },
      });
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; if (widget !== undefined) window.turnstile?.remove(widget); };
  }, [siteKey, resetKey, onToken]);
  return <div className="security-check"><div ref={container}/>{(!siteKey || failed) && <p className="error" role="status">Security check unavailable. Please reload or contact us on Messenger.</p>}</div>;
}
