// Maquininha integrada: o caixa ou o garçom manda a cobrança do Freguês para a maquininha do restaurante
// e o resultado volta sozinho. Mercado Pago Point já funciona; a Stone fica pronta para ligar depois.
// op: aparelhos · modo_pdv (dono/gerente) · cobrar · situacao · cancelar (qualquer pessoa da equipe)
import { corpoJson, erroServidor, lerServidor } from "../../_lib/base.js";
import { atualizar, inserir, loja, mp, papelNaLoja, segredos } from "../../_lib/loja.js";

const FINAIS = ["aprovada", "recusada", "cancelada", "expirada", "erro"];

const MOTIVOS = {
  rejected_by_issuer: "Recusado pelo banco do cartão",
  insufficient_amount: "Saldo ou limite insuficiente",
  card_disabled: "Cartão bloqueado",
  high_risk: "Recusado por segurança",
  bad_filled_card_data: "Dados do cartão incorretos",
  max_attempts_exceeded: "Tentativas demais com esse cartão",
  amount_limit_exceeded: "Valor acima do limite",
  invalid_installments: "Parcelamento não aceito",
  required_call_for_authorize: "O banco pede que o cliente ligue para autorizar",
  processing_error: "Erro ao processar, tente de novo",
  in_review: "Pagamento em análise",
};

/* ---------- Mercado Pago Point (API Orders) ---------- */
const mercadoPago = {
  nome: "Mercado Pago",
  async aparelhos(seg) {
    const r = await mp(seg.mp_token, "/terminals/v1/list?limit=50&offset=0");
    return (r.data?.terminals || []).map((t) => ({ id: t.id, modo: t.operating_mode, pos_id: t.pos_id }));
  },
  async modoPdv(seg, id) {
    await mp(seg.mp_token, "/terminals/v1/setup", { method: "PATCH", body: JSON.stringify({ terminals: [{ id, operating_mode: "PDV" }] }) });
  },
  async cobrar(seg, c, descricao) {
    const corpo = {
      type: "point",
      external_reference: c.id,
      expiration_time: "PT15M",
      transactions: { payments: [{ amount: Number(c.valor).toFixed(2) }] },
      config: { point: { terminal_id: c.aparelho, print_on_terminal: "no_ticket" } },
      description: descricao.slice(0, 150),
    };
    if (c.forma === "credito" || c.forma === "debito") corpo.config.payment_method = { default_type: c.forma === "credito" ? "credit_card" : "debit_card" };
    const o = await mp(seg.mp_token, "/v1/orders", { method: "POST", headers: { "X-Idempotency-Key": `fregues-maq-${c.id}` }, body: JSON.stringify(corpo) });
    return { externo_id: o.id, ...this.ler(o) };
  },
  async situacao(seg, externoId) {
    return this.ler(await mp(seg.mp_token, `/v1/orders/${encodeURIComponent(externoId)}`));
  },
  async cancelar(seg, c) {
    await mp(seg.mp_token, `/v1/orders/${encodeURIComponent(c.externo_id)}/cancel`, {
      method: "POST",
      headers: { "X-Idempotency-Key": `fregues-maq-cancel-${c.id}`, "x-allow-cancelable-status": "at_terminal" },
    });
  },
  /** Traduz a order do Mercado Pago para a situação do Freguês. */
  ler(o) {
    const pg = o.transactions?.payments?.[0] || {};
    const det = pg.status_detail || o.status_detail || "";
    const tipo = pg.payment_method?.type || "";
    const forma = /debit/.test(tipo) ? "debito" : /credit/.test(tipo) ? "credito" : /pix|bank_transfer/.test(tipo) ? "pix" : null;
    switch (o.status) {
      case "processed":
        return { status: "aprovada", pagamento_id: pg.id ? String(pg.id) : null, forma, detalhe: null };
      case "created":
        return { status: "enviada", detalhe: null };
      case "at_terminal":
        return { status: "na_maquininha", detalhe: det === "cancellation_requested" ? "Cancelando…" : null };
      case "action_required":
        return { status: "na_maquininha", detalhe: "Confira a tela da maquininha" };
      case "canceled":
      case "refunded":
        return { status: "cancelada", detalhe: det === "canceled_on_terminal" ? "Cancelada na maquininha" : null };
      case "expired":
        return { status: "expirada", detalhe: "Ninguém pagou em 15 minutos" };
      case "failed":
        return { status: "recusada", detalhe: MOTIVOS[det] || "Pagamento não aprovado" };
      default:
        return { status: "na_maquininha", detalhe: null };
    }
  },
};

/* ---------- Stone (Connect) — liga quando a parceria for aprovada ---------- */
const stone = {
  nome: "Stone",
  async aparelhos() {
    throw new Error("A integração com a Stone ainda não está liberada. Use o Mercado Pago por enquanto.");
  },
  async modoPdv() {
    throw new Error("A integração com a Stone ainda não está liberada.");
  },
  async cobrar() {
    throw new Error("A integração com a Stone ainda não está liberada.");
  },
  async situacao() {
    return { status: "erro", detalhe: "Stone ainda não liberada" };
  },
  async cancelar() {},
};

const PROVEDORES = { mp: mercadoPago, stone };

function chaveDoProvedor(prov, seg) {
  if (prov === "mp" && !seg.mp_token) return "Conecte a conta do Mercado Pago em Configurações > Pagamentos > Pagamento online.";
  if (prov === "stone" && !seg.stone_token) return "A conta da Stone ainda não foi conectada.";
  return null;
}

async function cobranca(id, storeId) {
  const [c] = await lerServidor("maquininha_cobrancas", `id=eq.${encodeURIComponent(id)}&store_id=eq.${encodeURIComponent(storeId)}&select=*`);
  return c || null;
}

/** Consulta o provedor e grava a nova situação (só se a cobrança ainda não terminou). */
async function atualizarSituacao(c, seg) {
  if (FINAIS.includes(c.status) || !c.externo_id) return c;
  const p = PROVEDORES[c.provedor];
  const s = await p.situacao(seg, c.externo_id);
  const novo = { status: s.status, detalhe: s.detalhe ?? null, atualizado_em: new Date().toISOString() };
  if (s.pagamento_id) novo.pagamento_id = s.pagamento_id;
  if (s.forma) novo.forma = s.forma;
  if (novo.status !== c.status || novo.detalhe !== c.detalhe || novo.pagamento_id) await atualizar("maquininha_cobrancas", `id=eq.${c.id}`, novo);
  return { ...c, ...novo };
}

const publico = (c) => ({ id: c.id, status: c.status, detalhe: c.detalhe, valor: Number(c.valor), forma: c.forma, pagamento_id: c.pagamento_id, aparelho: c.aparelho });

export default async function maquininha(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  const b = corpoJson(req);
  const { store_id, op } = b;
  if (!store_id || !op) return res.status(400).json({ erro: "Pedido inválido" });
  const papel = await papelNaLoja(req, store_id);
  if (!papel) return res.status(403).json({ erro: "Entre com a conta da equipe da loja" });

  try {
    const st = await loja(store_id);
    const seg = await segredos(store_id);
    const provNome = ["mp", "stone"].includes(b.provedor) ? b.provedor : st?.maquininha_provedor || "mp";
    const prov = PROVEDORES[provNome];

    if (op === "aparelhos" || op === "modo_pdv") {
      if (!["dono", "gerente"].includes(papel)) return res.status(403).json({ erro: "Só o dono ou o gerente configuram as maquininhas" });
      const falta = chaveDoProvedor(provNome, seg);
      if (falta) return res.status(400).json({ erro: falta });
      if (op === "modo_pdv") {
        if (!b.aparelho) return res.status(400).json({ erro: "Escolha a maquininha" });
        await prov.modoPdv(seg, String(b.aparelho));
        return res.status(200).json({ ok: true });
      }
      return res.status(200).json({ aparelhos: await prov.aparelhos(seg) });
    }

    if (op === "cobrar") {
      if (!st?.maquininha_ativo) return res.status(400).json({ erro: "A maquininha integrada está desligada nas Configurações" });
      const falta = chaveDoProvedor(provNome, seg);
      if (falta) return res.status(400).json({ erro: falta });
      const valor = Math.round(Number(b.valor) * 100) / 100;
      if (!(valor >= 1 && valor <= 100000)) return res.status(400).json({ erro: "Valor inválido (mínimo R$ 1,00)" });
      const lista = Array.isArray(st.maquininha_aparelhos) ? st.maquininha_aparelhos : [];
      const aparelho = String(b.aparelho || lista[0]?.id || "");
      if (!lista.some((a) => a.id === aparelho)) return res.status(400).json({ erro: "Essa maquininha não está cadastrada no Freguês" });
      const forma = ["credito", "debito"].includes(b.forma) ? b.forma : null;
      const ref = String(b.referencia || "").slice(0, 80) || null;

      const ins = await inserir("maquininha_cobrancas", { store_id, provedor: provNome, aparelho, valor, referencia: ref, forma, status: "enviada" });
      if (!ins.ok) throw new Error(`Não consegui registrar a cobrança (${ins.status})`);
      const c = Array.isArray(ins.dados) ? ins.dados[0] : ins.dados;
      try {
        const r = await prov.cobrar(seg, c, `${ref || "Venda"} · ${st.nome}`);
        const novo = { externo_id: r.externo_id, status: r.status, detalhe: r.detalhe ?? null, atualizado_em: new Date().toISOString() };
        await atualizar("maquininha_cobrancas", `id=eq.${c.id}`, novo);
        return res.status(200).json(publico({ ...c, ...novo }));
      } catch (e) {
        await atualizar("maquininha_cobrancas", `id=eq.${c.id}`, { status: "erro", detalhe: e.message.slice(0, 300), atualizado_em: new Date().toISOString() });
        return res.status(502).json({ erro: `A maquininha não recebeu a cobrança: ${e.message}` });
      }
    }

    if (op === "situacao" || op === "cancelar") {
      let c = b.id && (await cobranca(b.id, store_id));
      if (!c) return res.status(404).json({ erro: "Cobrança não encontrada" });
      if (op === "cancelar" && !FINAIS.includes(c.status)) {
        if (c.externo_id) await PROVEDORES[c.provedor].cancelar(seg, c).catch(() => {});
        c = await atualizarSituacao(c, seg).catch(() => c);
        if (c.status === "enviada") {
          await atualizar("maquininha_cobrancas", `id=eq.${c.id}`, { status: "cancelada", atualizado_em: new Date().toISOString() });
          c = { ...c, status: "cancelada" };
        }
        return res.status(200).json(publico(c));
      }
      c = await atualizarSituacao(c, seg);
      return res.status(200).json(publico(c));
    }

    return res.status(400).json({ erro: "Ação desconhecida" });
  } catch (e) {
    await erroServidor("loja/maquininha", e);
    return res.status(502).json({ erro: e.message });
  }
}

/** Aviso do Mercado Pago (Webhook "Order"): /api/loja/point?s=<loja>. Nunca confia no corpo: consulta a order. */
export async function avisoPoint(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const b = corpoJson(req);
  const id = b?.data?.id || req.query["data.id"];
  const storeId = req.query.s;
  if (!id || !storeId) return res.status(200).json({ ok: true, ignorado: true });
  try {
    const [c] = await lerServidor("maquininha_cobrancas", `externo_id=eq.${encodeURIComponent(id)}&store_id=eq.${encodeURIComponent(storeId)}&select=*`);
    if (!c) return res.status(200).json({ ok: true, ignorado: "desconhecida" });
    const seg = await segredos(storeId);
    await atualizarSituacao(c, seg);
    return res.status(200).json({ ok: true });
  } catch (e) {
    await erroServidor("loja/point", e);
    return res.status(500).json({ erro: e.message });
  }
}

export const _teste = { ler: (o) => mercadoPago.ler(o) };
