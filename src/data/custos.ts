// Ficha técnica e CMV: insumos com preço de compra e a receita de cada prato.
import { useCallback, useEffect, useState } from "react";
import { MODO, supabase, useDados } from "./dados";

export type Unidade = "kg" | "l" | "un";
export type Insumo = { id: string; nome: string; unidade: Unidade; custo: number };
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
  { id: "i1", nome: "Blend bovino", unidade: "kg", custo: 42 },
  { id: "i2", nome: "Pão brioche", unidade: "un", custo: 1.6 },
  { id: "i3", nome: "Queijo prato", unidade: "kg", custo: 48 },
  { id: "i4", nome: "Cheddar fatiado", unidade: "kg", custo: 52 },
  { id: "i5", nome: "Bacon", unidade: "kg", custo: 46 },
  { id: "i6", nome: "Molho da casa", unidade: "kg", custo: 18 },
  { id: "i7", nome: "Alface e tomate", unidade: "kg", custo: 12 },
  { id: "i8", nome: "Batata congelada", unidade: "kg", custo: 16 },
  { id: "i9", nome: "Embalagem", unidade: "un", custo: 1.2 },
  { id: "i10", nome: "Refrigerante lata", unidade: "un", custo: 3.1 },
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
const demo = { insumos: [...DEMO_INSUMOS], fichas: { ...DEMO_FICHAS } };
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
    const [{ data: ins }, { data: fs }] = await Promise.all([supabase!.from("insumos").select("id,nome,unidade,custo").eq("store_id", lojaId).order("nome"), supabase!.from("fichas_tecnicas").select("product_id,insumo_id,qtd").eq("store_id", lojaId)]);
    setInsumos(((ins as Insumo[]) ?? []).map((i) => ({ ...i, custo: Number(i.custo) })));
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
      else demo.insumos = [...demo.insumos, { ...i, nome, id: "i" + ++seq }].sort((a, b) => a.nome.localeCompare(b.nome));
      await carregar();
      return null;
    }
    const linha = { nome, unidade: i.unidade, custo: i.custo, store_id: lojaId };
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

  return { insumos, fichas, carregando, salvarInsumo, removerInsumo, salvarFicha, recarregar: carregar };
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
