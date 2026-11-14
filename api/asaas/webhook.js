// A Asaas avisa aqui quando uma cobrança é criada, paga, vence ou é estornada.
import { aplicarCobranca, corpoJson, faltando, tokenWebhook, erroServidor } from "../_lib/base.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).json({ ok: true, info: "Receptor de avisos da Asaas do Freguês" });
  if (faltando().length) return res.status(503).json({ erro: "Cobrança não configurada" });
  if (req.headers["asaas-access-token"] !== tokenWebhook()) return res.status(401).json({ erro: "Token inválido" });
  const { event, payment } = corpoJson(req);
  if (!payment?.subscription) return res.status(200).json({ ok: true, ignorado: "cobrança avulsa" });
  try {
    const situacao = await aplicarCobranca(payment);
    return res.status(200).json({ ok: true, event, situacao });
  } catch (e) {
    await erroServidor("asaas/webhook", e);
    // 500 faz a Asaas tentar de novo depois
    return res.status(500).json({ erro: e.message });
  }
}
