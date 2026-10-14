// Public URLs only. Server/CRM/AI credentials must never be added to VITE_ variables.
export function trustedFacebookUrl(value,fallback){
 try {
  const url=new URL(value);
  if(url.protocol==='https:'&&!url.username&&!url.password&&['www.facebook.com','facebook.com','m.me'].includes(url.hostname))return url.href;
 } catch {}
 return fallback;
}
export const channels={
 facebook:trustedFacebookUrl(import.meta.env?.VITE_FACEBOOK_PAGE_URL,'https://www.facebook.com/dmciexplorer'),
 messenger:trustedFacebookUrl(import.meta.env?.VITE_MESSENGER_URL,'https://m.me/dmciexplorer')
};
