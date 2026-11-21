// Admin ativa a cobrança automática de um cliente: cria cliente + assinatura na Asaas.
import { asaas, aplicarCobranca, regrasAsaas, corpoJson, exigirAdmin, faltando, garantirWebhook, hostWebhook, lerServidor, rpcServidor, erroServidor } from "../../_lib/base.js";

const hoje = () => new Date().toISOString().slice(0, 10);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  const f = faltando();
  if (f.length) return res.status(503).json({ erro: `Falta configurar na Vercel: ${f.join(", ")}` });
  try {
    const admin = await exigirAdmin(req);
    if (!admin) return res.status(403).json({ erro: "Só administradores do Freguês" });
    const { org_id, documento } = corpoJson(req);
    const doc = String(documento || "").replace(/\D/g, "");
    if (!org_id || !(doc.length === 11 || doc.length === 14)) return res.status(400).json({ erro: "Informe o CPF ou CNPJ do cliente" });

    const [s] = await lerServidor("subscriptions", `org_id=eq.${org_id}&select=*`);
    if (!s) return res.status(404).json({ erro: "Cliente sem assinatura" });
    const [org] = await lerServidor("organizations", `id=eq.${org_id}&select=*`);
    const [plano] = await lerServidor("plans", `id=eq.${s.plan_id}&select=nome,preco_primeiro_mes`);

    let aviso = null;
    try {
      await garantirWebhook(hostWebhook(req), admin);
    } catch (e) {
      aviso = `Aviso automático da Asaas não foi ligado (${e.message}). Use "Atualizar cobranças" para conferir pagamentos.`;
    }

    let customer = s.asaas_customer_id;
    if (!customer) {
      const c = await asaas("/customers", {
        method: "POST",
        body: JSON.stringify({
          name: org?.nome || s.responsavel || "Cliente Freguês",
          cpfCnpj: doc,
          email: s.email || undefined,
          mobilePhone: (s.telefone || "").replace(/\D/g, "") || undefined,
          externalReference: org_id,
          notificationDisabled: false,
        }),
      });
      customer = c.id;
    }

    // primeira cobrança: fim do teste, ou hoje se o teste já acabou
    const primeira = s.teste_ate && s.teste_ate > hoje() ? s.teste_ate : hoje();
    let assinatura = s.asaas_subscription_id;
    const novaAssinatura = !assinatura;
    if (!assinatura) {
      const a = await asaas("/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          customer,
          billingType: "UNDEFINED", // o cliente escolhe: Pix, boleto ou cartão
          value: Number(s.valor),
          nextDueDate: primeira,
          cycle: "MONTHLY",
          description: `Freguês · plano ${plano?.nome || s.plan_id}`,
          externalReference: org_id,
          ...(await regrasAsaas()),
        }),
      });
      assinatura = a.id;
    }

    let pg = await asaas(`/subscriptions/${assinatura}/payments`);
    // preço de entrada no primeiro mês (ex.: R$ 60), só para cliente que nunca pagou uma fatura
    const entrada = plano?.preco_primeiro_mes == null ? null : Number(plano.preco_primeiro_mes);
    if (novaAssinatura && entrada != null && entrada < Number(s.valor)) {
      const pagas = await lerServidor("invoices", `org_id=eq.${org_id}&status=eq.paga&select=id&limit=1`);
      const primeiraPendente = (pg.data || []).filter((p) => p.status === "PENDING").sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
      if (!pagas.length && primeiraPendente) {
        await asaas(`/payments/${primeiraPendente.id}`, { method: "PUT", body: JSON.stringify({ value: entrada, description: `Freguês · plano ${plano?.nome || s.plan_id} · primeiro mês` }) });
        pg = await asaas(`/subscriptions/${assinatura}/payments`);
      }
    }
    const primeiraCobranca = (pg.data || []).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
    const link = primeiraCobranca?.invoiceUrl || null;

    await rpcServidor("cobranca_salvar", {
      p_org: org_id,
      p_documento: doc,
      p_customer: customer,
      p_assinatura: assinatura,
      p_link: link,
    });
    for (const p of pg.data || []) await aplicarCobranca({ ...p, subscription: assinatura });

    return res.status(200).json({
      ok: true,
      link,
      assinatura,
      vencimento: primeiraCobranca?.dueDate || primeira,
      aviso,
    });
  } catch (e) {
    await erroServidor("cobranca/ativar", e);
    return res.status(500).json({ erro: e.message || "Erro ao falar com a Asaas" });
  }
}
