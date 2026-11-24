// Funções das integrações da loja (Mercado Pago, WhatsApp oficial, Focus NFe). Rodam só no servidor.
import { createHash } from "node:crypto";
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
export async function marcarPago(orderId, ref) {
  const r = await rpcServidor("pedido_pago_srv", { p_order: orderId, p_ref: String(ref) });
  // pago: avisa a compra à Meta (só sai se a loja ligou o Pixel com a API de Conversões)
  await compraMeta(orderId).catch(() => null);
  return r;
}

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

/* ---------------- Meta: API de Conversões ---------------- */
const sha = (v) => createHash("sha256").update(String(v).trim().toLowerCase()).digest("hex");
const CONFIRMADO = ["preparo", "pronto", "rota", "entregue"];

/** Manda à Meta uma requisição da API de Conversões do Pixel. */
export async function metaEventos(pixel, token, eventos, teste) {
  const r = await fetch(`${GRAPH}/${encodeURIComponent(pixel)}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: eventos, access_token: token, ...(teste ? { test_event_code: teste } : {}) }),
  });
  const c = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(c.error?.error_user_msg || c.error?.message || `A Meta respondeu ${r.status}`);
  return c;
}

/**
 * Avisa a Meta da compra de um pedido da loja online. Só uma vez por pedido, e só quando a venda está
 * confirmada (pago, ou aceito pela loja). O mesmo ID vai no Pixel do navegador: a Meta junta os dois e conta uma compra.
 */
export async function compraMeta(orderId) {
  const o = await pedido(orderId);
  if (!o) return { enviado: false, motivo: "sem_pedido" };
  if (o.status === "cancelado" || !(o.pago || CONFIRMADO.includes(o.status))) return { enviado: false, motivo: "nao_confirmado" };
  if (o.modo === "mesa" || o.modo === "balcao") return { enviado: false, motivo: "fora_da_loja_online" };
  if (o.meta_enviado_em) return { enviado: false, motivo: "ja_enviado" };
  const st = await loja(o.store_id);
  if (!st?.meta_pixel_id) return { enviado: false, motivo: "sem_pixel" };
  const seg = await segredos(o.store_id);
  if (!seg.meta_token) return { enviado: false, motivo: "sem_token" };

  // marca antes de mandar: a mesma compra nunca sai duas vezes
  const trava = await fetch(`${SUPA_URL}/rest/v1/orders?id=eq.${o.id}&meta_enviado_em=is.null`, {
    method: "PATCH",
    headers: { ...hs, Prefer: "return=representation" },
    body: JSON.stringify({ meta_enviado_em: new Date().toISOString() }),
  });
  const linhas = await trava.json().catch(() => []);
  if (!trava.ok || !linhas.length) return { enviado: false, motivo: "ja_enviado" };

  const ras = o.meta_rastreio || {};
  const tel = String(o.customers?.telefone || "").replace(/\D/g, "");
  const nome = String(o.customers?.nome || "").split(" ")[0];
  const user = {
    ...(tel.length >= 10 ? { ph: [sha(tel.length <= 11 ? "55" + tel : tel)], external_id: [sha(tel)] } : {}),
    ...(nome ? { fn: [sha(nome)] } : {}),
    country: [sha("br")],
    ...(ras.ip ? { client_ip_address: ras.ip } : {}),
    ...(ras.ua ? { client_user_agent: ras.ua } : {}),
    ...(ras.fbp ? { fbp: ras.fbp } : {}),
    ...(ras.fbc ? { fbc: ras.fbc } : {}),
  };
  const itens = (o.order_items || []).filter((i) => i.product_id);
  const evento = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: o.id,
    action_source: ras.ua ? "website" : "system_generated",
    ...(ras.url ? { event_source_url: ras.url } : {}),
    user_data: user,
    custom_data: {
      currency: "BRL",
      value: Number(o.total),
      order_id: String(o.numero),
      content_type: "product",
      content_ids: itens.map((i) => i.product_id),
      contents: itens.map((i) => ({ id: i.product_id, quantity: i.qtd, item_price: Number(i.unit) })),
      num_items: (o.order_items || []).reduce((n, i) => n + i.qtd, 0),
    },
  };
  try {
    await metaEventos(st.meta_pixel_id, seg.meta_token, [evento], seg.meta_teste);
    await atualizar("orders", `id=eq.${o.id}`, { meta_resultado: "ok" });
    return { enviado: true };
  } catch (e) {
    // falhou: libera para tentar de novo e guarda o motivo
    await atualizar("orders", `id=eq.${o.id}`, { meta_enviado_em: null, meta_resultado: String(e.message).slice(0, 300) }).catch(() => null);
    throw e;
  }
}
