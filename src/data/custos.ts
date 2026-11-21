// Ficha técnica e CMV: insumos com preço de compra e a receita de cada prato.
import { useCallback, useEffect, useState } from "react";
import { MODO, supabase, useDados } from "./dados";

export type Unidade = "kg" | "l" | "un";
export type Insumo = { id: string; nome: string; unidade: Unidade; custo: number; /** null = não controla estoque */ estoque?: number | null; minimo?: number };
export type TipoMov = "entrada" | "venda" | "estorno" | "perda" | "contagem";
export type Movimento = { id: number; insumo_id: string; tipo: TipoMov; qtd: number; saldo: number | null; obs: string | null; quando: string };
/** Situação do estoque de um insumo. */
export const situacao = (i: Insumo): "fora" | "acabou" | "baixo" | "ok" => (i.estoque == null ? "fora" : i.estoque <= 0 ? "acabou" : i.estoque <= (i.minimo ?? 0) ? "baixo" : "ok");
/** "3,2 kg", "12 un", "1,5 L" */
export const qtdTxt = (n: number, u: Unidade) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: u === "un" ? 0 : 3 })} ${u === "l" ? "L" : u}`;
export type LinhaFicha = { insumo_id: string; qtd: number };
/** Vendas dos últimos 30 dias por produto (quantidade e faturamento). */
export type VendaProduto = { qtd: number; receita: number };

export const UNIDADES: { id: Unidade; nome: string; compra: string; uso: string }[] = [
  { id: "kg", nome: "Quilo (kg)", compra: "kg", uso: "g" },
  { id: "l", nome: "Litro (L)", compra: "litro", uso: "ml" },
  { id: "un", nome: "Unidade", compra: "unidade", uso: "un" },
];
export const usoDe = (u: Unidade) => UNIDADES.find((x) => x.id === u)?.uso ?? "un";
export const compraDe = (u: Unidade) => UNIDADES.find((x) => x.id === u)?.compra ?? "unidade";

/** Custo de uma linha: gramas/ml viram kg/litro; unidade fica como está. */
export const custoLinha = (l: LinhaFicha, ins?: Insumo) => (ins ? (ins.unidade === "un" ? l.qtd : l.qtd / 1000) * ins.custo : 0);
export const custoFicha = (linhas: LinhaFicha[] | undefined, insumos: Insumo[]) => {
  if (!linhas?.length) return null;
  const m = new Map(insumos.map((i) => [i.id, i]));
  return Math.round(linhas.reduce((s, l) => s + custoLinha(l, m.get(l.insumo_id)), 0) * 100) / 100;
};
/** Faixa do CMV: até 30% ótimo, até 38% atenção, acima disso caro. */
export const faixaCmv = (pct: number) => (pct <= 30 ? "bom" : pct <= 38 ? "atencao" : "alto");
export const COR_FAIXA = { bom: "bg-manjericao/20 text-manjericao", atencao: "bg-mostarda/25 text-[#8a5a00]", alto: "bg-tomate/15 text-tomate" } as const;

// ---------- demonstração (fica na memória da página) ----------
const DEMO_INSUMOS: Insumo[] = [
  { id: "i1", nome: "Blend bovino", unidade: "kg", custo: 42, estoque: 18, minimo: 8 },
  { id: "i2", nome: "Pão brioche", unidade: "un", custo: 1.6, estoque: 140, minimo: 60 },
  { id: "i3", nome: "Queijo prato", unidade: "kg", custo: 48, estoque: 3.2, minimo: 2 },
  { id: "i4", nome: "Cheddar fatiado", unidade: "kg", custo: 52, estoque: 1.1, minimo: 2 },
  { id: "i5", nome: "Bacon", unidade: "kg", custo: 46, estoque: 0.6, minimo: 2 },
  { id: "i6", nome: "Molho da casa", unidade: "kg", custo: 18, estoque: 6, minimo: 2 },
  { id: "i7", nome: "Alface e tomate", unidade: "kg", custo: 12 },
  { id: "i8", nome: "Batata congelada", unidade: "kg", custo: 16, estoque: 24, minimo: 10 },
  { id: "i9", nome: "Embalagem", unidade: "un", custo: 1.2, estoque: 380, minimo: 150 },
  { id: "i10", nome: "Refrigerante lata", unidade: "un", custo: 3.1, estoque: 96, minimo: 48 },
];
const DEMO_FICHAS: Record<string, LinhaFicha[]> = {
  p1: [
    { insumo_id: "i1", qtd: 140 },
    { insumo_id: "i2", qtd: 1 },
    { insumo_id: "i3", qtd: 40 },
    { insumo_id: "i6", qtd: 20 },
    { insumo_id: "i9", qtd: 1 },
  ],
  p2: [
    { insumo_id: "i1", qtd: 140 },
    { insumo_id: "i2", qtd: 1 },
    { insumo_id: "i4", qtd: 40 },
    { insumo_id: "i5", qtd: 40 },
    { insumo_id: "i9", qtd: 1 },
  ],
  p4: [
    { insumo_id: "i1", qtd: 300 },
    { insumo_id: "i2", qtd: 1 },
    { insumo_id: "i5", qtd: 50 },
    { insumo_id: "i4", qtd: 40 },
    { insumo_id: "i7", qtd: 40 },
    { insumo_id: "i9", qtd: 1 },
  ],
  p10: [
    { insumo_id: "i8", qtd: 300 },
    { insumo_id: "i6", qtd: 30 },
    { insumo_id: "i9", qtd: 1 },
  ],
  p13: [{ insumo_id: "i10", qtd: 1 }],
};
const DEMO_VENDAS: Record<string, number> = { p1: 182, p2: 96, p3: 41, p4: 154, p5: 63, p8: 77, p10: 88, p11: 120, p13: 210, p14: 45 };
const agoraMenos = (h: number) => new Date(Date.now() - h * 3600e3).toISOString();
const DEMO_MOV: Movimento[] = [
  { id: 6, insumo_id: "i5", tipo: "venda", qtd: -0.09, saldo: 0.6, obs: null, quando: agoraMenos(1) },
  { id: 5, insumo_id: "i1", tipo: "venda", qtd: -0.44, saldo: 18, obs: null, quando: agoraMenos(1) },
  { id: 4, insumo_id: "i4", tipo: "perda", qtd: -0.3, saldo: 1.1, obs: "Venceu", quando: agoraMenos(20) },
  { id: 3, insumo_id: "i1", tipo: "entrada", qtd: 15, saldo: 21.2, obs: "Fornecedor Casa da Carne", quando: agoraMenos(30) },
  { id: 2, insumo_id: "i10", tipo: "contagem", qtd: -2, saldo: 96, obs: null, quando: agoraMenos(48) },
];
/** consumo dos últimos 7 dias por insumo (unidade de compra) */
const DEMO_CONSUMO: Record<string, number> = { i1: 21, i2: 98, i3: 2.6, i4: 3.1, i5: 4.2, i6: 4.4, i7: 1.8, i8: 19, i9: 310, i10: 70 };
const demo = { insumos: [...DEMO_INSUMOS], fichas: { ...DEMO_FICHAS }, mov: [...DEMO_MOV] };
let seq = 100;

export function useCustos() {
  const d = useDados();
  const lojaId = d.loja.id;
  const real = MODO === "real" && !!supabase && !!lojaId;
  const [insumos, setInsumos] = useState<Insumo[]>(real ? [] : demo.insumos);
  const [fichas, setFichas] = useState<Record<string, LinhaFicha[]>>(real ? {} : demo.fichas);
  const [carregando, setCarregando] = useState(real);

  const carregar = useCallback(async () => {
    if (!real) {
      setInsumos([...demo.insumos]);
      setFichas({ ...demo.fichas });
      return;
    }
    const [{ data: ins }, { data: fs }] = await Promise.all([supabase!.from("insumos").select("id,nome,unidade,custo,estoque,estoque_minimo").eq("store_id", lojaId).order("nome"), supabase!.from("fichas_tecnicas").select("product_id,insumo_id,qtd").eq("store_id", lojaId)]);
    setInsumos(((ins as (Insumo & { estoque_minimo: number })[]) ?? []).map(({ estoque_minimo, ...i }) => ({ ...i, custo: Number(i.custo), estoque: i.estoque == null ? null : Number(i.estoque), minimo: Number(estoque_minimo ?? 0) })));
    const f: Record<string, LinhaFicha[]> = {};
    for (const r of (fs as { product_id: string; insumo_id: string; qtd: number }[]) ?? []) (f[r.product_id] ??= []).push({ insumo_id: r.insumo_id, qtd: Number(r.qtd) });
    setFichas(f);
    setCarregando(false);
  }, [real, lojaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function salvarInsumo(i: Omit<Insumo, "id"> & { id?: string }): Promise<string | null> {
    const nome = i.nome.trim();
    if (!nome) return "Dê um nome ao insumo";
    if (!(i.custo >= 0)) return "Preço inválido";
    if (!real) {
      if (i.id) demo.insumos = demo.insumos.map((x) => (x.id === i.id ? { ...x, ...i, nome } : x));
      else demo.insumos = [...demo.insumos, { ...i, nome, id: "i" + ++seq, estoque: null, minimo: 0 }].sort((a, b) => a.nome.localeCompare(b.nome));
      await carregar();
      return null;
    }
    const linha = { nome, unidade: i.unidade, custo: i.custo, store_id: lojaId };
    // estoque e mínimo só mudam pelos lançamentos
    const { error } = i.id ? await supabase!.from("insumos").update(linha).eq("id", i.id) : await supabase!.from("insumos").insert(linha);
    if (error) return "Não consegui salvar o insumo";
    await carregar();
    return null;
  }

  async function removerInsumo(id: string): Promise<string | null> {
    if (!real) {
      demo.insumos = demo.insumos.filter((x) => x.id !== id);
      demo.fichas = Object.fromEntries(Object.entries(demo.fichas).map(([k, v]) => [k, v.filter((l) => l.insumo_id !== id)]));
      await carregar();
      return null;
    }
    const { error } = await supabase!.from("insumos").delete().eq("id", id);
    if (error) return "Não consegui excluir";
    await carregar();
    return null;
  }

  /** Troca a receita inteira do prato. */
  async function salvarFicha(productId: string, linhas: LinhaFicha[]): Promise<string | null> {
    const boas = linhas.filter((l) => l.insumo_id && l.qtd > 0);
    if (new Set(boas.map((l) => l.insumo_id)).size !== boas.length) return "Tem insumo repetido na receita";
    if (!real) {
      demo.fichas = { ...demo.fichas, [productId]: boas };
      await carregar();
      return null;
    }
    const { error: e1 } = await supabase!.from("fichas_tecnicas").delete().eq("product_id", productId);
    if (e1) return "Não consegui salvar a ficha";
    if (boas.length) {
      const { error } = await supabase!.from("fichas_tecnicas").insert(boas.map((l) => ({ ...l, product_id: productId, store_id: lojaId })));
      if (error) return "Não consegui salvar a ficha";
    }
    await carregar();
    return null;
  }

  /** Entrada (compra), perda ou contagem. Na contagem, qtd é o total que tem agora. */
  async function lancarEstoque(insumoId: string, tipo: "entrada" | "perda" | "contagem", qtd: number, opc: { custo?: number; obs?: string; minimo?: number; silencioso?: boolean } = {}): Promise<string | null> {
    if (!(qtd >= 0)) return "Quantidade inválida";
    if (!real) {
      const i = demo.insumos.find((x) => x.id === insumoId);
      if (!i) return "Insumo não encontrado";
      if (tipo !== "contagem" && i.estoque == null) return "Faça a primeira contagem antes";
      const delta = tipo === "entrada" ? qtd : tipo === "perda" ? -qtd : qtd - (i.estoque ?? 0);
      const saldo = Math.round(((i.estoque ?? 0) + delta) * 1000) / 1000;
      demo.insumos = demo.insumos.map((x) => (x.id === insumoId ? { ...x, estoque: saldo, minimo: opc.minimo ?? x.minimo, custo: tipo === "entrada" && opc.custo != null && opc.custo >= 0 ? opc.custo : x.custo } : x));
      demo.mov = [{ id: Date.now() + Math.random(), insumo_id: insumoId, tipo, qtd: delta, saldo, obs: opc.obs?.trim() || null, quando: new Date().toISOString() }, ...demo.mov];
      if (!opc.silencioso) await carregar();
      return null;
    }
    const { data, error } = await supabase!.rpc("estoque_lancar", { p_insumo: insumoId, p_tipo: tipo, p_qtd: qtd, p_custo: opc.custo ?? null, p_obs: opc.obs ?? null, p_minimo: opc.minimo ?? null });
    if (error) return "Não consegui lançar agora";
    if (data !== "ok") return ({ faca_a_contagem: "Faça a primeira contagem antes", sem_permissao: "Só o dono ou o gerente lançam estoque", quantidade_invalida: "Quantidade inválida" } as Record<string, string>)[String(data)] ?? "Não consegui lançar";
    if (!opc.silencioso) await carregar();
    return null;
  }

  /** Cria um insumo e devolve o id (para lançar em seguida, sem recarregar a tela). */
  async function criarInsumo(i: Omit<Insumo, "id">): Promise<{ id?: string; erro?: string }> {
    const nome = i.nome.trim();
    if (!nome) return { erro: "Insumo sem nome" };
    if (!real) {
      const id = "i" + ++seq;
      demo.insumos = [...demo.insumos, { ...i, nome, id, estoque: null, minimo: 0 }].sort((a, b) => a.nome.localeCompare(b.nome));
      return { id };
    }
    const { data, error } = await supabase!.from("insumos").insert({ nome, unidade: i.unidade, custo: i.custo, store_id: lojaId }).select("id").single();
    return error ? { erro: `Não consegui criar ${nome}` } : { id: (data as { id: string }).id };
  }

  /** Só troca o preço de compra (insumo sem controle de estoque). */
  async function atualizarCusto(id: string, custo: number): Promise<string | null> {
    if (!real) {
      demo.insumos = demo.insumos.map((x) => (x.id === id ? { ...x, custo } : x));
      return null;
    }
    const { error } = await supabase!.from("insumos").update({ custo }).eq("id", id);
    return error ? "Não consegui atualizar o preço" : null;
  }

  async function desligarEstoque(insumoId: string): Promise<string | null> {
    if (!real) {
      demo.insumos = demo.insumos.map((x) => (x.id === insumoId ? { ...x, estoque: null } : x));
      await carregar();
      return null;
    }
    const { data, error } = await supabase!.rpc("estoque_desligar", { p_insumo: insumoId });
    if (error || data !== "ok") return "Não consegui desligar";
    await carregar();
    return null;
  }

  /** Últimos movimentos e o consumo dos últimos 7 dias. */
  async function historico(): Promise<{ mov: Movimento[]; consumo7: Record<string, number> }> {
    if (!real) return { mov: demo.mov, consumo7: DEMO_CONSUMO };
    const desde = new Date(Date.now() - 7 * 86400e3).toISOString();
    const [{ data: ms }, { data: vs }] = await Promise.all([
      supabase!.from("estoque_movimentos").select("id,insumo_id,tipo,qtd,saldo,obs,criado_em").eq("store_id", lojaId).neq("tipo", "venda").order("criado_em", { ascending: false }).limit(60),
      supabase!.from("estoque_movimentos").select("insumo_id,qtd").eq("store_id", lojaId).in("tipo", ["venda", "estorno"]).gte("criado_em", desde).limit(20000),
    ]);
    const consumo7: Record<string, number> = {};
    for (const v of (vs as { insumo_id: string; qtd: number }[]) ?? []) consumo7[v.insumo_id] = (consumo7[v.insumo_id] ?? 0) - Number(v.qtd);
    return {
      mov: ((ms as (Omit<Movimento, "quando"> & { criado_em: string })[]) ?? []).map(({ criado_em, ...m }) => ({ ...m, qtd: Number(m.qtd), saldo: m.saldo == null ? null : Number(m.saldo), quando: criado_em })),
      consumo7,
    };
  }

  return { insumos, fichas, carregando, salvarInsumo, removerInsumo, salvarFicha, lancarEstoque, desligarEstoque, historico, criarInsumo, atualizarCusto, recarregar: carregar };
}

/** Quanto cada produto vendeu nos últimos 30 dias (para o CMV das vendas). */
export function useVendas30() {
  const d = useDados();
  const lojaId = d.loja.id;
  const real = MODO === "real" && !!supabase && !!lojaId;
  const [vendas, setVendas] = useState<Record<string, VendaProduto> | null>(null);
  useEffect(() => {
    if (!real) {
      setVendas(Object.fromEntries(d.cardapioTodo.filter((p) => DEMO_VENDAS[p.id]).map((p) => [p.id, { qtd: DEMO_VENDAS[p.id], receita: DEMO_VENDAS[p.id] * (p.promo ?? p.preco) }])));
      return;
    }
    let vivo = true;
    const desde = new Date(Date.now() - 30 * 86400e3).toISOString();
    supabase!
      .from("order_items")
      .select("product_id,qtd,unit,orders!inner(store_id,created_at,status)")
      .eq("orders.store_id", lojaId)
      .gte("orders.created_at", desde)
      .neq("orders.status", "cancelado")
      .not("product_id", "is", null)
      .limit(10000)
      .then(({ data }) => {
        if (!vivo) return;
        const v: Record<string, VendaProduto> = {};
        for (const r of (data as unknown as { product_id: string; qtd: number; unit: number }[]) ?? []) {
          const x = (v[r.product_id] ??= { qtd: 0, receita: 0 });
          x.qtd += r.qtd;
          x.receita += r.qtd * Number(r.unit);
        }
        setVendas(v);
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real, lojaId]);
  return vendas;
}
