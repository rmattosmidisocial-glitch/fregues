// Busca na Asaas as cobranças de um cliente e atualiza as faturas (reserva caso um aviso se perca).
import { asaas, aplicarCobranca, regrasAsaas, corpoJson, exigirAdmin, faltando, lerServidor } from "../_lib/base.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  const f = faltando();
  if (f.length) return res.status(503).json({ erro: `Falta configurar na Vercel: ${f.join(", ")}` });
  try {
    if (!(await exigirAdmin(req))) return res.status(403).json({ erro: "Só administradores do Freguês" });
    const { org_id } = corpoJson(req);
    const [s] = await lerServidor("subscriptions", `org_id=eq.${org_id}&select=asaas_subscription_id`);
    if (!s?.asaas_subscription_id) return res.status(400).json({ erro: "Cobrança automática não está ativa" });
    // aplica as regras atuais de multa e juros também nas cobranças em aberto
    await asaas(`/subscriptions/${s.asaas_subscription_id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...(await regrasAsaas()),
        updatePendingPayments: true,
      }),
    }).catch(() => null);
    const pg = await asaas(`/subscriptions/${s.asaas_subscription_id}/payments`);
    const r = [];
    for (const p of pg.data || [])
      r.push({
        vencimento: p.dueDate,
        situacao: await aplicarCobranca({
          ...p,
          subscription: s.asaas_subscription_id,
        }),
      });
    return res.status(200).json({ ok: true, cobrancas: r });
  } catch (e) {
    return res.status(500).json({ erro: e.message });
  }
}
