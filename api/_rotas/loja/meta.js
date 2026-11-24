// Pixel da Meta (anúncios no Facebook e Instagram):
// op "origem": a loja online guarda de onde o cliente veio (cookies da Meta, IP e navegador) logo depois do pedido.
// op "compra": avisa a compra à Meta pela API de Conversões, quando a venda está confirmada. Pode ser chamada
// pela loja do cliente ou pelo painel: o servidor confere o pedido e manda uma vez só.
import { corpoJson, erroServidor } from "../../_lib/base.js";
import { atualizar, compraMeta, pedido } from "../../_lib/loja.js";

const txt = (v, n = 500) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : undefined);
const DA_META = /^(facebook|fb|instagram|ig|meta)$/i;

export default async function meta(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  const b = corpoJson(req);
  const { order_id, op } = b;
  if (!order_id || !["origem", "compra"].includes(op)) return res.status(400).json({ erro: "Pedido inválido" });
  try {
    if (op === "compra") return res.status(200).json(await compraMeta(order_id));

    const o = await pedido(order_id);
    if (!o) return res.status(404).json({ erro: "Pedido não encontrado" });
    if (o.meta_rastreio) return res.status(200).json({ ok: true, ja: true });
    if (Date.now() - new Date(o.created_at).getTime() > 30 * 60e3) return res.status(400).json({ erro: "Pedido antigo" });

    const fbclid = txt(b.fbclid, 300);
    const fbc = txt(b.fbc, 400) || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined);
    const rastreio = {
      fbp: txt(b.fbp, 200),
      fbc,
      ip:
        String(req.headers["x-forwarded-for"] || "")
          .split(",")[0]
          .trim() || undefined,
      ua: txt(req.headers["user-agent"], 400),
      url: txt(b.url, 600),
      utm_source: txt(b.utm_source, 80),
      utm_medium: txt(b.utm_medium, 80),
      utm_campaign: txt(b.utm_campaign, 200),
    };
    const veioMeta = !!fbclid || DA_META.test(rastreio.utm_source || "");
    const campos = { meta_rastreio: rastreio, ...(veioMeta && ["Loja própria", "Link da bio"].includes(o.canal) ? { canal: "Anúncio da Meta" } : {}) };
    await atualizar("orders", `id=eq.${o.id}&meta_rastreio=is.null`, campos);
    // pedido já pago antes da origem chegar (Pix muito rápido): manda a compra agora, com os dados completos
    if (o.pago) await compraMeta(o.id).catch(() => null);
    return res.status(200).json({ ok: true, veio_meta: veioMeta });
  } catch (e) {
    await erroServidor("loja/meta", e);
    return res.status(200).json({ ok: false, erro: e.message });
  }
}
