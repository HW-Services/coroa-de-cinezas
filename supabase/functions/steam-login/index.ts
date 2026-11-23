// Login pela Steam (versão desktop)
// 1. O jogo envia um ticket da Steam (GetAuthTicketForWebApi, identidade "coroa-de-cinzas").
// 2. Esta função valida o ticket na API da Valve e descobre a SteamID.
// 3. Abre (ou cria, com o apelido escolhido) a conta ligada a essa SteamID
//    e devolve um token de uso único que o jogo troca por uma sessão.
//
// Segredos necessários (Supabase → Edge Functions → Secrets):
//   STEAM_WEB_API_KEY  chave de editor (Steamworks → Users & Permissions → Manage Groups → Web API Key)
//   STEAM_APP_ID       o App ID do jogo na Steam
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const resp = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resp({ erro: 'método' }, 405);
  let corpo: { ticket?: string; apelido?: string };
  try { corpo = await req.json(); } catch { return resp({ erro: 'json' }, 400); }
  const ticket = String(corpo.ticket || '');
  if (!/^[0-9a-f]{20,4096}$/i.test(ticket)) return resp({ erro: 'ticket inválido' }, 400);

  const chave = Deno.env.get('STEAM_WEB_API_KEY'), appid = Deno.env.get('STEAM_APP_ID');
  if (!chave || !appid) return resp({ erro: 'Login pela Steam ainda não configurado no servidor.' }, 503);

  // valida o ticket na Valve
  const url = `https://partner.steam-api.com/ISteamUserAuth/AuthenticateUserTicket/v1/?key=${encodeURIComponent(chave)}&appid=${encodeURIComponent(appid)}&ticket=${ticket}&identity=coroa-de-cinzas`;
  const r = await fetch(url);
  const j = await r.json().catch(() => null);
  const p = j?.response?.params;
  if (!p || p.result !== 'OK' || !/^\d{17}$/.test(String(p.steamid))) return resp({ erro: 'A Steam não confirmou o login.' }, 401);
  if (p.vacbanned || p.publisherbanned) return resp({ erro: 'Conta Steam bloqueada.' }, 403);
  const steamid = String(p.steamid);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const email = `steam_${steamid}@steam.coroadecinzas.invalid`;
  const { data: ligada } = await admin.from('contas_steam').select('usuario').eq('steamid', steamid).maybeSingle();

  if (!ligada) {
    // primeira vez: precisa do apelido
    const ap = String(corpo.apelido || '').trim();
    if (!ap) return resp({ precisaApelido: true });
    if (!/^[A-Za-z0-9_]{3,16}$/.test(ap)) return resp({ erro: 'O apelido deve ter de 3 a 16 letras, números ou _.' }, 400);
    const { data: livre } = await admin.rpc('apelido_livre', { p: ap });
    if (!livre) return resp({ erro: 'Esse apelido já está em uso.' }, 409);
    const { data: novo, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { apelido: ap, steamid } });
    if (error || !novo?.user) return resp({ erro: 'Não foi possível criar a conta.' }, 500);
    const { error: e2 } = await admin.from('contas_steam').insert({ steamid, usuario: novo.user.id });
    if (e2) return resp({ erro: 'Não foi possível ligar a conta Steam.' }, 500);
  }

  // token de uso único (o jogo chama auth.verifyOtp com ele)
  const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error || !link?.properties?.hashed_token) return resp({ erro: 'Não foi possível abrir a sessão.' }, 500);
  return resp({ token: link.properties.hashed_token });
});
