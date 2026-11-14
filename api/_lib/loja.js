// Funções das integrações da loja (Mercado Pago, WhatsApp oficial, Focus NFe). Rodam só no servidor.
import { SUPA_URL, lerServidor, rpcServidor } from "./base.js";

const ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hs = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

export const host = (req) => req.headers["x-forwarded-host"] || req.headers.host;

/** Papel de quem chamou (dono, gerente, caixa...) na loja, pela sessão dele. null = não é da loja. */
export async function papelNaLoja(req, storeId) {
  const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const [st] = await lerServidor("stores", `id=eq.${encodeURIComponent(storeId)}&select=org_id`);
  if (!st) return null;
  const r = await fetch(`${SUPA_URL}/rest/v1/rpc/meu_papel`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_org: st.org_id }),
  });
  if (!r.ok) return null;
  return (await r.json()) || null;
}

export async function loja(storeId) {
  const [s] = await lerServidor("stores", `id=eq.${encodeURIComponent(storeId)}&select=*`);
  return s || null;
}
export async function segredos(storeId) {
  const [s] = await lerServidor("store_secrets", `store_id=eq.${encodeURIComponent(storeId)}&select=*`);
  return s || {};
}
export async function salvarSegredos(storeId, campos) {
  const r = await fetch(`${SUPA_URL}/rest/v1/store_secrets?on_conflict=store_id`, {
    method: "POST",
    headers: { ...hs, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ store_id: storeId, ...campos, atualizado_em: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error(`Supabase respondeu ${r.status}`);
}
export async function atualizar(tabela, filtro, campos) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${tabela}?${filtro}`, { method: "PATCH", headers: { ...hs, Prefer: "return=minimal" }, body: JSON.stringify(campos) });
  if (!r.ok) throw new Error(`Supabase respondeu ${r.status}`);
}
export async function inserir(tabela, linha, prefer = "return=representation") {
  const r = await fetch(`${SUPA_URL}/rest/v1/${tabela}`, { method: "POST", headers: { ...hs, Prefer: prefer }, body: JSON.stringify(linha) });
  const c = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, dados: c };
}
export async function pedido(orderId) {
  const [o] = await lerServidor("orders", `id=eq.${encodeURIComponent(orderId)}&select=*,customers(nome,telefone),order_items(nome,qtd,unit,product_id)`);
  return o || null;
}
export const marcarPago = (orderId, ref) => rpcServidor("pedido_pago_srv", { p_order: orderId, p_ref: String(ref) });

/* ---------------- Mercado Pago ---------------- */
export async function mp(token, caminho, opcoes = {}) {
  const r = await fetch(`https://api.mercadopago.com${caminho}`, { ...opcoes, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(opcoes.headers || {}) } });
  const c = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(c.message || c.error || `Mercado Pago respondeu ${r.status}`);
  return c;
}

/* ---------------- WhatsApp oficial (Cloud API da Meta) ---------------- */
const GRAPH = "https://graph.facebook.com/v21.0";
export async function wa(token, caminho, corpo) {
  const r = await fetch(`${GRAPH}${caminho}`, {
    method: corpo ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const c = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(c.error?.error_user_msg || c.error?.message || `WhatsApp respondeu ${r.status}`);
  return c;
}
export const MODELOS_WA = { recebido: "fregues_pedido_recebido", preparo: "fregues_pedido_preparo", rota: "fregues_pedido_saiu", pronto: "fregues_pedido_pronto" };

/* ---------------- Focus NFe ---------------- */
export const focusBase = (producao) => (producao ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br");
export async function focus(token, producao, caminho, opcoes = {}) {
  const r = await fetch(focusBase(producao) + caminho, {
    ...opcoes,
    headers: { Authorization: "Basic " + Buffer.from(`${token}:`).toString("base64"), "Content-Type": "application/json", ...(opcoes.headers || {}) },
  });
  const c = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, dados: c };
}
