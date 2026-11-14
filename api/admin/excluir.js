// Exclui um cliente de vez: cancela a assinatura na Asaas, apaga a loja e todos os dados dela, e apaga o login do dono.
import { SUPA_URL, asaas, exigirAdmin, lerServidor, rpcServidor, erroServidor } from "../_lib/base.js";

const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  if (!SERVICE) return res.status(500).json({ erro: "Falta a chave SUPABASE_SERVICE_ROLE_KEY na Vercel" });
  if (!(await exigirAdmin(req))) return res.status(403).json({ erro: "Só o administrador do Freguês pode excluir clientes" });
  const { org_id } = req.body || {};
  if (!org_id) return res.status(400).json({ erro: "Cliente não informado" });

  try {
    // 1) para de cobrar na Asaas
    const [sub] = await lerServidor("subscriptions", `select=asaas_subscription_id&org_id=eq.${encodeURIComponent(org_id)}&limit=1`);
    let avisoAsaas = "";
    if (sub?.asaas_subscription_id && process.env.ASAAS_API_KEY) {
      try {
        await asaas(`/subscriptions/${sub.asaas_subscription_id}`, {
          method: "DELETE",
        });
      } catch (e) {
        avisoAsaas = `Confira na Asaas se a assinatura foi cancelada (${e.message}).`;
      }
    }
    // guarda no histórico (entra no relatório de cancelamentos)
    const [org] = await lerServidor("organizations", `select=nome&id=eq.${encodeURIComponent(org_id)}&limit=1`).catch(() => []);
    // 2) apaga a loja e tudo dela
    const users = (await rpcServidor("excluir_cliente_srv", { p_org: org_id })) || [];
    // 3) apaga os logins que eram só desta loja
    for (const u of users) {
      const id = u.user_id || u;
      await fetch(`${SUPA_URL}/auth/v1/admin/users/${id}`, {
        method: "DELETE",
        headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
      }).catch(() => null);
    }
    await fetch(`${SUPA_URL}/rest/v1/admin_audit`, {
      method: "POST",
      headers: {
        apikey: SERVICE,
        Authorization: `Bearer ${SERVICE}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        org_id,
        acao: `excluiu o cliente ${org?.nome || ""}`.trim(),
      }),
    }).catch(() => null);
    return res.status(200).json({ ok: true, logins_apagados: users.length, aviso: avisoAsaas });
  } catch (e) {
    await erroServidor("admin/excluir", e);
    return res.status(500).json({ erro: e.message });
  }
}
