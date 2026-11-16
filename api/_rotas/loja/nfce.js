// Nota fiscal do consumidor (NFC-e) pela Focus NFe. Opcional: só funciona com a opção ligada pelo dono.
// A Focus guarda o certificado digital e o CSC da empresa; aqui só montamos a nota com os itens do pedido.
import { corpoJson, erroServidor } from "../../_lib/base.js";
import { atualizar, focus, focusBase, inserir, loja, papelNaLoja, pedido, segredos } from "../../_lib/loja.js";

const FORMA = { dinheiro: "01", cartao: "03", maquininha: "03", pix: "17" };
const v2 = (n) => (Math.round(Number(n) * 100) / 100).toFixed(2);

export default async function nfce(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  const { order_id } = corpoJson(req);
  try {
    const o = order_id && (await pedido(order_id));
    if (!o) return res.status(404).json({ erro: "Pedido não encontrado" });
    if (!(await papelNaLoja(req, o.store_id))) return res.status(403).json({ erro: "Sem permissão" });
    if (o.status === "cancelado") return res.status(400).json({ erro: "Pedido cancelado não tem nota" });
    const st = await loja(o.store_id);
    if (!st.nfce_ativo) return res.status(400).json({ erro: "A nota fiscal está desligada nas Configurações" });
    const cnpj = String(st.nfce_cnpj || "").replace(/\D/g, "");
    if (cnpj.length !== 14) return res.status(400).json({ erro: "Cadastre o CNPJ da empresa em Configurações > Recursos extras > Nota fiscal" });
    const seg = await segredos(o.store_id);
    if (!seg.focus_token) return res.status(400).json({ erro: "Cole o token da Focus NFe em Configurações > Recursos extras > Nota fiscal" });

    const ref = `fregues-${o.numero}-${o.id.slice(0, 8)}-${Date.now().toString(36)}`;
    const reg = await inserir("notas", { store_id: o.store_id, order_id: o.id, ref, producao: !!st.nfce_producao });
    if (!reg.ok) return res.status(409).json({ erro: "Este pedido já tem nota emitida (ou em emissão)" });

    // itens + taxa de entrega e embalagem como "outras despesas"; desconto repartido entre os itens
    const itens = o.order_items || [];
    const bruto = itens.reduce((s, i) => s + i.qtd * Number(i.unit), 0) || 1;
    const outras = Number(o.taxa_entrega || 0) + Number(o.taxa_embalagem || 0);
    let descRest = Number(o.desconto || 0);
    const items = itens.map((i, k) => {
      const valor = i.qtd * Number(i.unit);
      const desc = k === itens.length - 1 ? descRest : Math.round((Number(o.desconto || 0) * valor) / bruto * 100) / 100;
      descRest -= desc;
      return {
        numero_item: String(k + 1),
        codigo_produto: (i.product_id || `item${k + 1}`).slice(0, 60),
        descricao: i.nome.slice(0, 120),
        codigo_ncm: st.nfce_ncm || "21069090",
        cfop: "5102",
        unidade_comercial: "UN",
        quantidade_comercial: v2(i.qtd),
        valor_unitario_comercial: v2(i.unit),
        unidade_tributavel: "UN",
        quantidade_tributavel: v2(i.qtd),
        valor_unitario_tributavel: v2(i.unit),
        valor_bruto: v2(valor),
        ...(desc > 0 ? { valor_desconto: v2(desc) } : {}),
        ...(k === itens.length - 1 && outras > 0 ? { valor_outras_despesas: v2(outras) } : {}),
        icms_origem: "0",
        icms_situacao_tributaria: "102", // Simples Nacional sem crédito (o contador ajusta se precisar)
      };
    });
    const pags = Array.isArray(o.pagamentos) && o.pagamentos.length ? o.pagamentos : [{ forma: o.pagamento, valor: o.total }];
    const nota = {
      cnpj_emitente: cnpj,
      data_emissao: new Date().toISOString(),
      natureza_operacao: "VENDA AO CONSUMIDOR",
      presenca_comprador: o.modo === "entrega" ? "4" : "1",
      modalidade_frete: "9",
      local_destino: "1",
      items,
      formas_pagamento: pags.map((p) => ({ forma_pagamento: FORMA[p.forma] || "99", valor_pagamento: v2(p.valor) })),
    };
    const r = await focus(seg.focus_token, !!st.nfce_producao, `/v2/nfce?ref=${encodeURIComponent(ref)}`, { method: "POST", body: JSON.stringify(nota) });
    const d = r.dados || {};
    const base = focusBase(!!st.nfce_producao);
    const autorizada = d.status === "autorizado";
    const campos = {
      status: autorizada ? "autorizada" : r.ok && d.status === "processando_autorizacao" ? "processando" : "erro",
      numero: d.numero ? String(d.numero) : null,
      chave: d.chave_nfe || null,
      url_danfe: d.caminho_danfe ? base + d.caminho_danfe : null,
      url_qr: d.qrcode_url || null,
      mensagem: d.mensagem_sefaz || d.mensagem || (r.ok ? null : `Focus respondeu ${r.status}`),
      atualizado_em: new Date().toISOString(),
    };
    await atualizar("notas", `ref=eq.${encodeURIComponent(ref)}`, campos);
    return res.status(200).json({ ...campos, ref });
  } catch (e) {
    await erroServidor("loja/nfce", e);
    return res.status(500).json({ erro: e.message });
  }
}
