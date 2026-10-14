import {chatReady} from '../../../server/chat/engine.js';
import {json} from '../../../server/chat/http.js';
export const onRequestGet = ({env})=>json(200,{enabled:chatReady(env) && env.WEBSITE_CHAT_ENABLED==='true' && !!env.TURNSTILE_SECRET_KEY && !!env.CHAT_IP_SALT});
