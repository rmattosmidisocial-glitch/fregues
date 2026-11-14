// Funções compartilhadas pelas rotas de cobrança (rodam no servidor da Vercel).
import crypto from "node:crypto";

export const SUPA_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ASAAS_KEY = process.env.ASAAS_API_KEY;
// chave de sandbox começa com $aact_hmlg; produção com $aact_prod
export const ASAAS_URL = process.env.ASAAS_API_URL || (ASAAS_KEY && ASAAS_KEY.includes("_prod_") ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3");

export function faltando() {
  const f = [];
  if (!SUPA_URL || !ANON) f.push("endereço do Supabase");
  if (!SERVICE) f.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!ASAAS_KEY) f.push("ASAAS_API_KEY");
  return f;
}

// senha que a Asaas manda em cada aviso, derivada da chave (não precisa de outra variável)
export const tokenWebhook = () =>
  crypto
    .createHash("sha256")
    .update(`fregues-webhook:${ASAAS_KEY || ""}`)
    .digest("hex");

export async function asaas(caminho, opcoes = {}) {
  const r = await fetch(ASAAS_URL + caminho, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Fregues",
      access_token: ASAAS_KEY,
      ...(opcoes.headers || {}),
    },
  });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = corpo?.errors?.map((e) => e.description).join(" ") || `Asaas respondeu ${r.status}`;
    throw new Error(msg);
  }
  return corpo;
}

// RPC no Supabase como servidor (passa por cima das regras de acesso)
export async function rpcServidor(nome, args) {
  const r = await fetch(`${SUPA_URL}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const corpo = await r.json().catch(() => null);
  if (!r.ok) throw new Error(corpo?.message || `Supabase respondeu ${r.status}`);
  return corpo;
}

export async function lerServidor(tabela, filtro) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${tabela}?${filtro}`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  });
  if (!r.ok) throw new Error(`Supabase respondeu ${r.status}`);
  return r.json();
}

// confere se quem chamou é administrador do Freguês, usando a sessão dele
// devolve o e-mail do admin, ou null se quem chamou não é administrador
export async function exigirAdmin(req) {
  const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const h = {
    apikey: ANON,
    Authorization: `Bearer ${jwt}`,
    "Content-Type": "application/json",
  };
  const r = await fetch(`${SUPA_URL}/rest/v1/rpc/is_platform_admin`, {
    method: "POST",
    headers: h,
    body: "{}",
  });
  if (!(r.ok && (await r.json()) === true)) return null;
  const u = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: h })
    .then((x) => x.json())
    .catch(() => ({}));
  return u?.email || "admin";
}

export async function aplicarCobranca(p) {
  return rpcServidor("cobranca_evento", {
    p_assinatura: p.subscription,
    p_pagamento: p.id,
    p_valor: p.value,
    p_vencimento: p.dueDate,
    p_situacao: p.status,
    p_forma: p.billingType,
    p_link: p.invoiceUrl || null,
  });
}

export async function garantirWebhook(host, email) {
  const url = `https://${host}/api/asaas/webhook`;
  const lista = await asaas("/webhooks");
  if ((lista.data || []).some((w) => w.url === url)) return;
  await asaas("/webhooks", {
    method: "POST",
    body: JSON.stringify({
      name: "Freguês",
      url,
      email: process.env.ASAAS_WEBHOOK_EMAIL || (email && email.includes("@") ? email : undefined),
      enabled: true,
      interrupted: false,
      authToken: tokenWebhook(),
      sendType: "SEQUENTIALLY",
      events: ["PAYMENT_CREATED", "PAYMENT_UPDATED", "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PAYMENT_DELETED", "PAYMENT_REFUNDED"],
    }),
  });
}

export function corpoJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try {
    return JSON.parse(req.body || "{}");
  } catch {
    return {};
  }
}

// multa e juros das regras de cobrança (Configurações do Admin), no formato da Asaas
export async function regrasAsaas() {
  try {
    const [c] = await lerServidor("platform_config", "id=eq.1&select=multa_pct,juros_pct");
    return {
      fine: { value: Number(c?.multa_pct ?? 2), type: "PERCENTAGE" },
      interest: { value: Number(c?.juros_pct ?? 1) },
    };
  } catch {
    return { fine: { value: 2 }, interest: { value: 1 } };
  }
}

// Monitor: erro do servidor vai para a mesma lista de erros do Admin. Nunca derruba a resposta.
export async function erroServidor(rota, e) {
  try {
    if (!SUPA_URL || !SERVICE) return;
    await rpcServidor("registrar_erro", { p_origem: "servidor", p_mensagem: String(e?.message || e || "erro").slice(0, 500), p_pilha: String(e?.stack || "").slice(0, 2000), p_rota: rota });
  } catch {
    /* sem monitor, segue */
  }
}
