// Caixa do dia e venda no balcão. Demonstração em memória; modo real pelas funções caixa_* e venda_balcao do banco.
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { supabase, useDados } from "./dados";
import type { Pagamento } from "./salao";

export type Forma = Pagamento["forma"];
export type Resumo = { vendas: number; total: number; por_forma: Partial<Record<Forma, number>>; por_canal: Record<string, number>; retiradas: number; reforcos: number; valor_inicial: number; dinheiro_esperado: number; dinheiro_contado?: number; diferenca?: number };
export type Sessao = { id: string; status: "aberto" | "fechado"; operador: string; valor_inicial: number; aberto_em: string; fechado_em: string | null; dinheiro_contado: number | null; resumo: Resumo | null; observacao?: string | null };
export type Movimento = { id: string; tipo: "retirada" | "reforco"; valor: number; motivo: string | null; criado_em: string };
export type VendaDemo = { quando: string; canal: "Balcão" | "Salão" | "Delivery"; total: number; pagamentos: Pagamento[]; descricao: string };
export type ItemVenda = { produto: string; nome: string; preco: number; qtd: number; obs?: string };

const minAtras = (m: number) => new Date(Date.now() - m * 60000).toISOString();
const hojeAs = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

type Estado = { sessao: Sessao | null; vendas: VendaDemo[]; movimentos: Movimento[]; historico: Sessao[]; proximoNumero: number };
export const resumoDe = (s: Sessao, vendas: VendaDemo[], movs: Movimento[]): Resumo => {
  const v = vendas.filter((x) => x.quando >= s.aberto_em && (!s.fechado_em || x.quando <= s.fechado_em));
  const por_forma: Resumo["por_forma"] = {};
  const por_canal: Record<string, number> = {};
  for (const x of v) {
    por_canal[x.canal] = (por_canal[x.canal] ?? 0) + x.total;
    for (const p of x.pagamentos) por_forma[p.forma] = (por_forma[p.forma] ?? 0) + p.valor;
  }
  const retiradas = movs.filter((m) => m.tipo === "retirada").reduce((a, m) => a + m.valor, 0);
  const reforcos = movs.filter((m) => m.tipo === "reforco").reduce((a, m) => a + m.valor, 0);
  return { vendas: v.length, total: v.reduce((a, x) => a + x.total, 0), por_forma, por_canal, retiradas, reforcos, valor_inicial: s.valor_inicial, dinheiro_esperado: s.valor_inicial + (por_forma.dinheiro ?? 0) + reforcos - retiradas };
};

function inicial(): Estado {
  const abertura = minAtras(Math.min(200, Math.max(40, new Date().getHours() * 60 + new Date().getMinutes() - 17 * 60 - 58)));
  const v = (min: number, canal: VendaDemo["canal"], total: number, pagamentos: Pagamento[], descricao: string): VendaDemo => ({ quando: minAtras(min), canal, total, pagamentos, descricao });
  const vendas = [
    v(35, "Delivery", 92.1, [{ forma: "pix", valor: 92.1 }], "#1041 · Larissa Gomes"),
    v(31, "Balcão", 34.4, [{ forma: "dinheiro", valor: 34.4 }], "#1042 · Balcão"),
    v(27, "Delivery", 62.4, [{ forma: "cartao", valor: 62.4 }], "#1043 · Carlos Menezes"),
    v(22, "Salão", 186.4, [{ forma: "maquininha", valor: 120 }, { forma: "pix", valor: 66.4 }], "Mesa 2"),
    v(18, "Delivery", 48.8, [{ forma: "dinheiro", valor: 48.8 }], "#1044 · Paulo Lima"),
    v(14, "Balcão", 27.9, [{ forma: "pix", valor: 27.9 }], "#1045 · Balcão"),
    v(9, "Salão", 92.1, [{ forma: "maquininha", valor: 92.1 }], "Mesa 6"),
    v(5, "Delivery", 104.9, [{ forma: "pix", valor: 104.9 }], "#1046 · Ana Paula Ribeiro"),
  ];
  const fech = (dia: number, ini: number, contado: number, esperado: number, total: number, operador: string): Sessao => {
    const ab = new Date(hojeAs(17, 55));
    ab.setDate(ab.getDate() - dia);
    const fe = new Date(ab.getTime() + 6.3 * 3600000);
    return { id: `h${dia}`, status: "fechado", operador, valor_inicial: ini, aberto_em: ab.toISOString(), fechado_em: fe.toISOString(), dinheiro_contado: contado, resumo: { vendas: Math.round(total / 52), total, por_forma: { pix: total * 0.52, maquininha: total * 0.21, cartao: total * 0.12, dinheiro: total * 0.15 }, por_canal: { Delivery: total * 0.58, Salão: total * 0.3, Balcão: total * 0.12 }, retiradas: 50, reforcos: 0, valor_inicial: ini, dinheiro_esperado: esperado, dinheiro_contado: contado, diferenca: contado - esperado } };
  };
  return {
    sessao: { id: "cx-hoje", status: "aberto", operador: "Léo", valor_inicial: 150, aberto_em: abertura, fechado_em: null, dinheiro_contado: null, resumo: null },
    vendas: vendas.filter((x) => x.quando >= abertura),
    movimentos: [{ id: "mv1", tipo: "retirada", valor: 50, motivo: "Gelo e descartáveis", criado_em: minAtras(20) }],
    historico: [fech(1, 150, 497.3, 497.3, 3184.6, "Léo"), fech(2, 150, 610, 612.5, 3920.2, "Bia"), fech(3, 100, 388.9, 383.9, 2410.8, "Léo"), fech(4, 150, 702.4, 702.4, 4688.1, "Bia")],
    proximoNumero: 1050,
  };
}

let demo = inicial();
const ouvintes = new Set<() => void>();
const setDemo = (f: (s: Estado) => Estado) => {
  demo = f(demo);
  ouvintes.forEach((o) => o());
};
const sub = (o: () => void) => {
  ouvintes.add(o);
  return () => ouvintes.delete(o);
};

/** Demonstração: o salão avisa o caixa quando fecha uma conta. */
export function registrarVendaDemo(canal: VendaDemo["canal"], total: number, pagamentos: Pagamento[], descricao: string) {
  if (!demo.sessao) return;
  setDemo((s) => ({ ...s, vendas: [...s.vendas, { quando: new Date().toISOString(), canal, total, pagamentos: tirarTroco(pagamentos, total), descricao }] }));
}

/** Troco sai do dinheiro, como o banco faz. */
export function tirarTroco(p: Pagamento[], total: number): Pagamento[] {
  let troco = Math.max(0, p.reduce((a, x) => a + x.valor, 0) - total);
  return p
    .map((x) => {
      if (x.forma !== "dinheiro" || troco <= 0) return x;
      const tira = Math.min(x.valor, troco);
      troco -= tira;
      return { ...x, valor: Math.round((x.valor - tira) * 100) / 100 };
    })
    .filter((x) => x.valor > 0);
}

export function useCaixa() {
  const d = useDados();
  const real = !!supabase && !!d.sessao && !!d.loja.id;
  const demoEstado = useSyncExternalStore(sub, () => demo);
  const [rSessao, setRSessao] = useState<Sessao | null>(null);
  const [rResumo, setRResumo] = useState<Resumo | null>(null);
  const [rMovs, setRMovs] = useState<Movimento[]>([]);
  const [rHist, setRHist] = useState<Sessao[]>([]);
  const [carregando, setCarregando] = useState(real);

  const carregar = useCallback(async () => {
    if (!supabase || !d.loja.id) return;
    const [a, h] = await Promise.all([
      supabase.from("cash_sessions").select("*").eq("store_id", d.loja.id).eq("status", "aberto").maybeSingle(),
      supabase.from("cash_sessions").select("*").eq("store_id", d.loja.id).eq("status", "fechado").order("aberto_em", { ascending: false }).limit(10),
    ]);
    const s = a.data as Sessao | null;
    setRSessao(s ? { ...s, valor_inicial: Number(s.valor_inicial) } : null);
    setRHist(((h.data ?? []) as Sessao[]).map((x) => ({ ...x, valor_inicial: Number(x.valor_inicial), dinheiro_contado: x.dinheiro_contado === null ? null : Number(x.dinheiro_contado) })));
    if (s) {
      const [r, m] = await Promise.all([supabase.rpc("caixa_resumo", { p_caixa: s.id }), supabase.from("cash_moves").select("*").eq("session_id", s.id).order("criado_em")]);
      setRResumo(r.data as Resumo);
      setRMovs(((m.data ?? []) as Movimento[]).map((x) => ({ ...x, valor: Number(x.valor) })));
    } else {
      setRResumo(null);
      setRMovs([]);
    }
    setCarregando(false);
  }, [d.loja.id]);

  useEffect(() => {
    if (!real || !supabase) return;
    carregar();
    const canal = supabase
      .channel("caixa-" + d.loja.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `store_id=eq.${d.loja.id}` }, () => carregar())
      .subscribe();
    const t = setInterval(carregar, 30000);
    return () => {
      supabase!.removeChannel(canal);
      clearInterval(t);
    };
  }, [real, carregar, d.loja.id]);

  const sessao = real ? rSessao : demoEstado.sessao;
  const resumo = real ? rResumo : demoEstado.sessao ? resumoDe(demoEstado.sessao, demoEstado.vendas, demoEstado.movimentos) : null;
  const movimentos = real ? rMovs : demoEstado.movimentos;
  const historico = real ? rHist : demoEstado.historico;
  const vendas = real ? [] : demoEstado.vendas;
  const msg = (e: { message: string } | null) => (e ? e.message.replace(/^.*?:\s*(?=[A-ZÁÉ])/, "") : null);

  const acoes = {
    async abrir(valor: number, operador: string) {
      if (real) {
        const r = await supabase!.rpc("caixa_abrir", { p_store: d.loja.id, p_valor_inicial: valor, p_operador: operador });
        await carregar();
        return msg(r.error);
      }
      setDemo((s) => ({ ...s, sessao: { id: `cx${Date.now()}`, status: "aberto", operador: operador || "Caixa", valor_inicial: valor, aberto_em: new Date().toISOString(), fechado_em: null, dinheiro_contado: null, resumo: null }, movimentos: [], vendas: [] }));
      return null;
    },
    async movimento(tipo: Movimento["tipo"], valor: number, motivo: string) {
      if (!sessao) return "Caixa fechado";
      if (!(valor > 0)) return "Informe um valor";
      if (real) {
        const r = await supabase!.rpc("caixa_movimento", { p_caixa: sessao.id, p_tipo: tipo, p_valor: valor, p_motivo: motivo });
        await carregar();
        return msg(r.error);
      }
      setDemo((s) => ({ ...s, movimentos: [...s.movimentos, { id: `mv${Date.now()}`, tipo, valor, motivo, criado_em: new Date().toISOString() }] }));
      return null;
    },
    async fechar(contado: number, obs: string): Promise<{ erro?: string; resumo?: Resumo }> {
      if (!sessao) return { erro: "Caixa já fechado" };
      if (real) {
        const r = await supabase!.rpc("caixa_fechar", { p_caixa: sessao.id, p_dinheiro_contado: contado, p_obs: obs || null });
        await carregar();
        return r.error ? { erro: msg(r.error)! } : { resumo: r.data as Resumo };
      }
      const fechado_em = new Date().toISOString();
      const base = resumoDe({ ...sessao, fechado_em }, demo.vendas, demo.movimentos);
      const final: Resumo = { ...base, dinheiro_contado: contado, diferenca: contado - base.dinheiro_esperado };
      setDemo((s) => ({ ...s, sessao: null, historico: [{ ...sessao, status: "fechado", fechado_em, dinheiro_contado: contado, resumo: final, observacao: obs }, ...s.historico] }));
      return { resumo: final };
    },
    async vender(itens: ItemVenda[], pagamentos: Pagamento[], telefone: string, nome: string, desconto: number, servico = 0, couvert = 0): Promise<{ erro?: string; numero?: number; total?: number; troco?: number }> {
      if (real) {
        const r = await supabase!.rpc("venda_balcao", { p_store: d.loja.id, p_itens: itens.map((i) => ({ produto: i.produto, qtd: i.qtd, obs: i.obs ?? null })), p_pagamentos: pagamentos, p_telefone: telefone || null, p_nome: nome || null, p_desconto: desconto || 0, p_servico: servico || 0, p_couvert: couvert || 0 });
        await carregar();
        if (r.error) return { erro: msg(r.error)! };
        const x = r.data as { numero: number; total: number; troco: number };
        return { numero: x.numero, total: Number(x.total), troco: Number(x.troco) };
      }
      if (!demo.sessao) return { erro: "Abra o caixa antes de vender" };
      const sub = itens.reduce((a, i) => a + i.preco * i.qtd, 0);
      const total = Math.max(0, Math.round((sub + Math.round(sub * servico) / 100 + couvert - (desconto || 0)) * 100) / 100);
      const pago = pagamentos.reduce((a, p) => a + p.valor, 0);
      if (pago + 0.009 < total) return { erro: `Falta receber ${(total - pago).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` };
      const troco = Math.round((pago - total) * 100) / 100;
      if (troco > 0.009 && !pagamentos.some((p) => p.forma === "dinheiro" && p.valor >= troco)) return { erro: "Troco só pode sair de pagamento em dinheiro" };
      const numero = demo.proximoNumero;
      setDemo((s) => ({ ...s, proximoNumero: s.proximoNumero + 1, vendas: [...s.vendas, { quando: new Date().toISOString(), canal: "Balcão", total, pagamentos: tirarTroco(pagamentos, total), descricao: `#${numero} · ${nome || "Balcão"}` }] }));
      d.acoes.pedidoLocal({ num: numero, cliente: nome || "Balcão", bairro: "Balcão", itens: itens.map((i) => `${i.qtd}x ${i.nome}${i.obs ? ` (${i.obs})` : ""}`), total, pag: pagamentos[0]?.forma === "pix" ? "Pix pago" : pagamentos[0]?.forma === "dinheiro" ? "Dinheiro (troco p/ 100)" : "Maquininha", modo: "Balcão", min: 0, status: "novo" });
      return { numero, total, troco };
    },
    recarregar: carregar,
  };

  return { sessao, resumo, movimentos, historico, vendas, carregando: real && carregando, real, acoes };
}
