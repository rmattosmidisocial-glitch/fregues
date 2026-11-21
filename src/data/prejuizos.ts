// Prejuízos: venda que voltou, desperdício e cortesia. O custo e a baixa no estoque saem da ficha técnica.
import { useCallback, useEffect, useState } from "react";
import { MODO, supabase, useDados } from "./dados";

export type TipoPrejuizo = "devolucao" | "desperdicio" | "cortesia";
export type Prejuizo = { id: number; tipo: TipoPrejuizo; descricao: string; qtd: number; valor_venda: number; custo: number; motivo: string | null; quem: string | null; lancado_por: string | null; quando: string };

export const TIPOS_PREJUIZO: Record<TipoPrejuizo, { nome: string; curto: string; cor: string }> = {
  devolucao: { nome: "Venda que voltou", curto: "Devolução", cor: "#e5665f" },
  desperdicio: { nome: "Desperdício", curto: "Desperdício", cor: "#f2a93b" },
  cortesia: { nome: "Cortesia", curto: "Cortesia", cor: "#3e9a93" },
};
export const MOTIVOS: Record<TipoPrejuizo, string[]> = {
  devolucao: ["Veio errado", "Atrasou", "Chegou frio", "Faltou item", "Cliente desistiu", "Problema de qualidade"],
  desperdicio: ["Queimou", "Caiu", "Venceu", "Sobrou", "Erro no preparo", "Estragou"],
  cortesia: ["Cliente da casa", "Aniversário", "Compensar problema", "Refeição da equipe", "Parceiro", "Degustação"],
};

const ERROS: Record<string, string> = {
  sem_permissao: "Sem permissão para lançar",
  quantidade_invalida: "Quantidade inválida",
  nao_encontrado: "Item não encontrado",
  sem_item: "Escolha o produto ou insumo",
  comanda_fechada: "A conta desta mesa já fechou",
  ja_cortesia: "Este item já é cortesia",
  ja_cancelado: "Este pedido já estava cancelado",
};

const h = (dias: number, horas = 0) => new Date(Date.now() - dias * 86400e3 - horas * 3600e3).toISOString();
let demo: Prejuizo[] = [
  { id: 9, tipo: "devolucao", descricao: "Pedido #1038", qtd: 1, valor_venda: 52.8, custo: 19.4, motivo: "Chegou frio", quem: null, lancado_por: "Larissa (caixa)", quando: h(0, 3) },
  { id: 8, tipo: "desperdicio", descricao: "Smash da Penha", qtd: 2, valor_venda: 55.8, custo: 17.84, motivo: "Queimou", quem: null, lancado_por: "Cozinha", quando: h(0, 5) },
  { id: 7, tipo: "cortesia", descricao: "Batata rústica", qtd: 1, valor_venda: 18.9, custo: 6.54, motivo: "Compensar problema", quem: "Mesa 4 · Marcos", lancado_por: "Léo (garçom)", quando: h(1) },
  { id: 6, tipo: "desperdicio", descricao: "Cheddar fatiado", qtd: 0.3, valor_venda: 0, custo: 15.6, motivo: "Venceu", quem: null, lancado_por: "Renan", quando: h(1, 4) },
  { id: 5, tipo: "cortesia", descricao: "X-Bacon Duplo", qtd: 2, valor_venda: 79.8, custo: 40.52, motivo: "Refeição da equipe", quem: "Equipe", lancado_por: "Renan", quando: h(2) },
  { id: 4, tipo: "devolucao", descricao: "Pedido #1029", qtd: 1, valor_venda: 38.9, custo: 13.1, motivo: "Veio errado", quem: null, lancado_por: "Larissa (caixa)", quando: h(3) },
  { id: 3, tipo: "desperdicio", descricao: "Batata congelada", qtd: 1.5, valor_venda: 0, custo: 24, motivo: "Estragou", quem: null, lancado_por: "Cozinha", quando: h(4) },
  { id: 2, tipo: "cortesia", descricao: "Milk-shake de Ovomaltine", qtd: 1, valor_venda: 19.9, custo: 7.2, motivo: "Aniversário", quem: "Juliana Prado", lancado_por: "Léo (garçom)", quando: h(6) },
  { id: 1, tipo: "desperdicio", descricao: "Frango Crocante", qtd: 1, valor_venda: 29.9, custo: 9.8, motivo: "Caiu", quem: null, lancado_por: "Cozinha", quando: h(9) },
];
let seq = 100;

const EVENTO = "fregues-prejuizo";
const avisarTelas = () => window.dispatchEvent(new Event(EVENTO));

function quemLanca(email?: string | null) {
  return email ? email.split("@")[0] : null;
}

/** Ações para lançar (qualquer pessoa da equipe). */
export function useLancarPrejuizo() {
  const d = useDados();
  const real = MODO === "real" && !!supabase && !!d.loja.id;
  const nome = quemLanca(d.sessao?.user.email) ?? (real ? null : "Você (demonstração)");
  const resp = (data: unknown, error: unknown) => {
    const r = error ? "Não consegui lançar agora" : data === "ok" ? null : (ERROS[String(data)] ?? "Não consegui lançar");
    if (!r) avisarTelas();
    return r;
  };

  return {
    /** Desperdício ou cortesia avulsa: produto do cardápio (unidades) ou insumo (kg, litro, unidade). */
    async lancar(tipo: "desperdicio" | "cortesia", item: { product_id?: string; insumo_id?: string; nome: string; preco?: number; custo?: number }, qtd: number, motivo: string, quem?: string): Promise<string | null> {
      if (!(qtd > 0)) return "Quantidade inválida";
      if (!real) {
        setTimeout(avisarTelas, 0);
        demo = [{ id: ++seq, tipo, descricao: item.nome, qtd, valor_venda: (item.preco ?? 0) * qtd, custo: (item.custo ?? 0) * qtd, motivo: motivo || null, quem: quem || null, lancado_por: nome, quando: new Date().toISOString() }, ...demo];
        return null;
      }
      const { data, error } = await supabase!.rpc("prejuizo_lancar", { p_store: d.loja.id, p_tipo: tipo, p_product: item.product_id ?? null, p_insumo: item.insumo_id ?? null, p_qtd: qtd, p_motivo: motivo, p_quem: quem ?? null, p_nome: nome });
      return resp(data, error);
    },
    /** Item da mesa vira cortesia (sai da conta). */
    async cortesia(itemId: string, info: { nome: string; valor: number; qtd: number }, motivo: string, quem?: string): Promise<string | null> {
      if (!real) {
        setTimeout(avisarTelas, 0);
        demo = [{ id: ++seq, tipo: "cortesia", descricao: info.nome, qtd: info.qtd, valor_venda: info.valor, custo: Math.round(info.valor * 0.35 * 100) / 100, motivo: motivo || null, quem: quem || null, lancado_por: nome, quando: new Date().toISOString() }, ...demo];
        return null;
      }
      const { data, error } = await supabase!.rpc("item_cortesia", { p_item: itemId, p_motivo: motivo, p_quem: quem ?? null, p_nome: nome });
      return resp(data, error);
    },
    /** Pedido que voltou: sai do caixa e entra nos prejuízos. */
    async devolver(orderId: string | undefined, info: { num: number; total: number }, motivo: string): Promise<string | null> {
      if (!real || !orderId) {
        setTimeout(avisarTelas, 0);
        demo = [{ id: ++seq, tipo: "devolucao", descricao: `Pedido #${info.num}`, qtd: 1, valor_venda: info.total, custo: Math.round(info.total * 0.35 * 100) / 100, motivo: motivo || null, quem: null, lancado_por: nome, quando: new Date().toISOString() }, ...demo];
        return null;
      }
      const { data, error } = await supabase!.rpc("pedido_devolver", { p_pedido: orderId, p_motivo: motivo, p_nome: nome });
      return resp(data, error);
    },
  };
}

/** Lista para o relatório (dono e gerente). */
export function usePrejuizos(dias: number) {
  const d = useDados();
  const real = MODO === "real" && !!supabase && !!d.loja.id;
  const [lista, setLista] = useState<Prejuizo[] | null>(null);
  const carregar = useCallback(async () => {
    const desde = new Date(Date.now() - dias * 86400e3).toISOString();
    if (!real) return setLista(demo.filter((p) => p.quando >= desde));
    const { data } = await supabase!.from("prejuizos").select("id,tipo,descricao,qtd,valor_venda,custo,motivo,quem,lancado_por,criado_em").eq("store_id", d.loja.id).gte("criado_em", desde).order("criado_em", { ascending: false }).limit(2000);
    setLista(((data as (Omit<Prejuizo, "quando"> & { criado_em: string })[]) ?? []).map(({ criado_em, ...p }) => ({ ...p, qtd: Number(p.qtd), valor_venda: Number(p.valor_venda), custo: Number(p.custo), quando: criado_em })));
  }, [real, d.loja.id, dias]);
  useEffect(() => {
    carregar();
    window.addEventListener(EVENTO, carregar);
    return () => window.removeEventListener(EVENTO, carregar);
  }, [carregar]);
  return { lista, recarregar: carregar };
}

export type ResumoPrejuizo = { total: number; devolucao: number; desperdicio: number; cortesia: number; n: number };

/** Totais pelo custo (CMV) desde um momento (ex.: abertura do caixa). A equipe toda vê. */
export function useResumoPrejuizo(desde: string | null | undefined) {
  const d = useDados();
  const real = MODO === "real" && !!supabase && !!d.loja.id;
  const [r, setR] = useState<ResumoPrejuizo | null>(null);
  const carregar = useCallback(async () => {
    if (!desde) return setR(null);
    if (!real) {
      const l = demo.filter((p) => p.quando >= desde);
      const s = (t?: TipoPrejuizo) => l.filter((p) => !t || p.tipo === t).reduce((x, p) => x + p.custo, 0);
      return setR({ total: s(), devolucao: s("devolucao"), desperdicio: s("desperdicio"), cortesia: s("cortesia"), n: l.length });
    }
    const { data } = await supabase!.rpc("prejuizo_resumo", { p_store: d.loja.id, p_desde: desde });
    if (data) {
      const x = data as Record<string, number>;
      setR({ total: Number(x.total), devolucao: Number(x.devolucao), desperdicio: Number(x.desperdicio), cortesia: Number(x.cortesia), n: Number(x.n) });
    }
  }, [desde, real, d.loja.id]);
  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 60_000);
    window.addEventListener(EVENTO, carregar);
    return () => {
      clearInterval(t);
      window.removeEventListener(EVENTO, carregar);
    };
  }, [carregar]);
  return { resumo: r, recarregar: carregar };
}
