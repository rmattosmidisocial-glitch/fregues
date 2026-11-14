// Pagamento online: gera o Pix do pedido no Mercado Pago do restaurante (o dinheiro cai direto para ele).
// O pedido é confirmado sozinho quando o Mercado Pago avisa (rota mp) ou quando a loja confere (rota conferir).
import { corpoJson, erroServidor } from "../../_lib/base.js";
import { atualizar, host, loja, marcarPago, mp, pedido, segredos } from "../../_lib/loja.js";

export default async function pix(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  const { order_id } = corpoJson(req);
  try {
    const o = order_id && (await pedido(order_id));
    if (!o) return res.status(404).json({ erro: "Pedido não encontrado" });
    if (o.pago) return res.status(200).json({ pago: true });
    if (o.pagamento !== "pix" || o.status === "cancelado") return res.status(400).json({ erro: "Este pedido não é Pix" });
    if (Date.now() - new Date(o.created_at).getTime() > 3 * 3600e3) return res.status(400).json({ erro: "Pedido antigo" });
    // já gerado e ainda válido: devolve o mesmo
    if (o.pix_online?.copia_cola && new Date(o.pix_online.expira_em).getTime() > Date.now() + 60e3) return res.status(200).json(o.pix_online);

    const st = await loja(o.store_id);
    const seg = await segredos(o.store_id);
    if (!st?.pagamento_online || !seg.mp_token) return res.status(200).json({ online: false });

    const expira = new Date(Date.now() + 30 * 60e3);
    const p = await mp(seg.mp_token, "/v1/payments", {
      method: "POST",
      headers: { "X-Idempotency-Key": `fregues-${o.id}-${expira.toISOString().slice(0, 15)}` },
      body: JSON.stringify({
        transaction_amount: Number(o.total),
        description: `Pedido ${o.numero} · ${st.nome}`.slice(0, 120),
        payment_method_id: "pix",
        external_reference: o.id,
        notification_url: `https://${host(req)}/api/loja/mp?s=${o.store_id}`,
        date_of_expiration: expira.toISOString().replace("Z", "+00:00"),
        payer: { email: `pedido${o.numero}@clientes.fregues.app`, first_name: (o.customers?.nome || "Cliente").split(" ")[0] },
      }),
    });
    const t = p.point_of_interaction?.transaction_data || {};
    const info = { online: true, id: String(p.id), copia_cola: t.qr_code, qr: t.qr_code_base64, expira_em: expira.toISOString() };
    await atualizar("orders", `id=eq.${o.id}`, { pix_online: info });
    if (p.status === "approved") await marcarPago(o.id, `mp:${p.id}`);
    return res.status(200).json(info);
  } catch (e) {
    await erroServidor("loja/pix", e);
    return res.status(502).json({ erro: "Não consegui gerar o Pix agora. Use o código Pix da loja ou outra forma de pagamento.", detalhe: e.message });
  }
}

/** Confere no Mercado Pago se o Pix do pedido foi pago (reserva caso o aviso automático atrase). */
export async function conferir(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const { order_id } = corpoJson(req);
  try {
    const o = order_id && (await pedido(order_id));
    if (!o) return res.status(404).json({ erro: "Pedido não encontrado" });
    if (o.pago) return res.status(200).json({ pago: true });
    if (!o.pix_online?.id) return res.status(200).json({ pago: false });
    const seg = await segredos(o.store_id);
    if (!seg.mp_token) return res.status(200).json({ pago: false });
    const p = await mp(seg.mp_token, `/v1/payments/${encodeURIComponent(o.pix_online.id)}`);
    if (p.status === "approved" && p.external_reference === o.id) {
      await marcarPago(o.id, `mp:${p.id}`);
      return res.status(200).json({ pago: true });
    }
    return res.status(200).json({ pago: false, situacao: p.status });
  } catch (e) {
    await erroServidor("loja/conferir", e);
    return res.status(200).json({ pago: false });
  }
}

/** Aviso do Mercado Pago. Nunca confia no corpo: busca o pagamento com a chave da própria loja. */
export async function avisoMP(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const b = corpoJson(req);
  const id = b?.data?.id || req.query["data.id"] || (req.query.topic === "payment" ? req.query.id : null);
  const storeId = req.query.s;
  if (!id || !storeId) return res.status(200).json({ ok: true, ignorado: true });
  try {
    const seg = await segredos(storeId);
    if (!seg.mp_token) return res.status(200).json({ ok: true, ignorado: "sem chave" });
    const p = await mp(seg.mp_token, `/v1/payments/${encodeURIComponent(id)}`);
    if (p.status !== "approved" || !p.external_reference) return res.status(200).json({ ok: true, situacao: p.status });
    const o = await pedido(p.external_reference);
    if (!o || o.store_id !== storeId || Math.abs(Number(o.total) - Number(p.transaction_amount)) > 0.01) return res.status(200).json({ ok: true, ignorado: "não confere" });
    await marcarPago(o.id, `mp:${p.id}`);
    return res.status(200).json({ ok: true, pago: true });
  } catch (e) {
    await erroServidor("loja/mp", e);
    return res.status(500).json({ erro: e.message }); // 500: o Mercado Pago tenta de novo
  }
}
