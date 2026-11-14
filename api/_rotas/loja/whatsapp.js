// WhatsApp oficial (Cloud API da Meta): manda ao cliente os avisos do pedido, com os modelos aprovados na Meta.
// "recebido" pode ser pedido pela própria loja online logo depois do pedido; os outros, só pela equipe.
import { corpoJson, erroServidor } from "../../_lib/base.js";
import { MODELOS_WA, atualizar, inserir, loja, papelNaLoja, pedido, segredos, wa } from "../../_lib/loja.js";

export default async function whatsapp(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  const { order_id, evento, teste_para } = corpoJson(req);
  try {
    // teste do dono: manda o modelo "recebido" para o número dele
    if (teste_para) {
      const { store_id } = corpoJson(req);
      if (!["dono", "gerente"].includes(await papelNaLoja(req, store_id))) return res.status(403).json({ erro: "Sem permissão" });
      const st = await loja(store_id);
      const seg = await segredos(store_id);
      if (!seg.wa_token) return res.status(400).json({ erro: "Ligue o WhatsApp primeiro" });
      const tel = String(teste_para).replace(/\D/g, "");
      await enviar(seg, "recebido", tel.length <= 11 ? "55" + tel : tel, ["Teste", "123", st.nome]);
      return res.status(200).json({ ok: true });
    }

    if (!["recebido", "preparo", "rota", "pronto"].includes(evento)) return res.status(400).json({ erro: "Evento inválido" });
    const o = order_id && (await pedido(order_id));
    if (!o) return res.status(404).json({ erro: "Pedido não encontrado" });
    if (evento === "recebido") {
      if (Date.now() - new Date(o.created_at).getTime() > 15 * 60e3) return res.status(400).json({ erro: "Pedido antigo" });
    } else if (!(await papelNaLoja(req, o.store_id))) return res.status(403).json({ erro: "Sem permissão" });

    const st = await loja(o.store_id);
    if (!st?.whatsapp_ativo || !st.whatsapp_eventos?.[evento]) return res.status(200).json({ enviado: false, motivo: "desligado" });
    const seg = await segredos(o.store_id);
    if (!seg.wa_token || !seg.wa_phone_id) return res.status(200).json({ enviado: false, motivo: "sem_chave" });
    const tel = String(o.customers?.telefone || "").replace(/\D/g, "");
    if (tel.length < 10) return res.status(200).json({ enviado: false, motivo: "sem_telefone" });

    // marca antes de mandar: o mesmo aviso nunca sai duas vezes
    const reg = await inserir("whatsapp_envios", { order_id: o.id, evento, ok: false }, "return=minimal");
    if (!reg.ok) return res.status(200).json({ enviado: false, motivo: "ja_enviado" });
    try {
      await enviar(seg, evento, "55" + tel.slice(-11), [(o.customers?.nome || "").split(" ")[0] || "cliente", String(o.numero), st.nome]);
      await atualizar("whatsapp_envios", `order_id=eq.${o.id}&evento=eq.${evento}`, { ok: true });
      return res.status(200).json({ enviado: true });
    } catch (e) {
      await atualizar("whatsapp_envios", `order_id=eq.${o.id}&evento=eq.${evento}`, { detalhe: String(e.message).slice(0, 300) });
      throw e;
    }
  } catch (e) {
    await erroServidor("loja/whatsapp", e);
    return res.status(502).json({ erro: e.message });
  }
}

async function enviar(seg, evento, para, params) {
  const nome = seg.wa_modelos?.[evento] || MODELOS_WA[evento];
  return wa(seg.wa_token, `/${seg.wa_phone_id}/messages`, {
    messaging_product: "whatsapp",
    to: para,
    type: "template",
    template: { name: nome, language: { code: "pt_BR" }, components: [{ type: "body", parameters: params.map((t) => ({ type: "text", text: String(t).slice(0, 60) })) }] },
  });
}
