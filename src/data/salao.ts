// Salão: mesas, comandas, itens e chamados. Modo demonstração em memória; modo real no Supabase com tempo real.
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { CARDAPIO } from "./mock";
import { SLUG, supabase, useDados } from "./dados";

export type Mesa = { id: string; numero: number; area: string; lugares: number; forma: "quadrada" | "redonda" | "retangular"; ativa: boolean; reservada_para: string | null };
export type StatusComanda = "aberta" | "conta" | "fechada" | "cancelada";
export type Comanda = { id: string; table_id: string; status: StatusComanda; pessoas: number; garcom: string | null; cliente_nome: string | null; telefone: string | null; taxa_servico: number; desconto: number; aberta_em: string; fechada_em?: string | null; total_fechado?: number };
export type StatusItem = "novo" | "preparo" | "pronto" | "entregue" | "cancelado";
export type ItemComanda = { id: string; tab_id: string; product_id: string | null; nome: string; qtd: number; unit: number; obs: string | null; status: StatusItem; origem: "garcom" | "cliente"; criado_em: string };
export type Chamado = { id: number; table_id: string; tipo: "garcom" | "conta"; criado_em: string };
export type Pagamento = { forma: "pix" | "cartao" | "dinheiro" | "maquininha"; valor: number };
export type NovoItem = { produto: string; nome: string; preco: number; qtd: number; obs?: string };

type Estado = { mesas: Mesa[]; comandas: Comanda[]; itens: ItemComanda[]; chamados: Chamado[]; fechadasHoje: { total: number; pessoas: number }[] };

const uid = () => Math.random().toString(36).slice(2, 10);
const minAtras = (m: number) => new Date(Date.now() - m * 60000).toISOString();

function inicial(): Estado {
  const mesas: Mesa[] = [
    ...Array.from({ length: 10 }, (_, i) => ({ id: `m${i + 1}`, numero: i + 1, area: "Salão", lugares: i === 4 || i === 5 ? 6 : i === 9 ? 2 : 4, forma: (i === 4 || i === 5 ? "retangular" : i >= 8 ? "redonda" : "quadrada") as Mesa["forma"], ativa: true, reservada_para: null })),
    ...Array.from({ length: 4 }, (_, i) => ({ id: `m${i + 11}`, numero: i + 11, area: "Varanda", lugares: 4, forma: "redonda" as const, ativa: true, reservada_para: null })),
  ];
  mesas[4].reservada_para = "20h · Diego (12 pessoas)";
  const p = (nome: string) => CARDAPIO.find((x) => x.nome === nome)!;
  const comandas: Comanda[] = [
    { id: "c3", table_id: "m3", status: "aberta", pessoas: 2, garcom: "Léo", cliente_nome: null, telefone: null, taxa_servico: 10, desconto: 0, aberta_em: minAtras(34) },
    { id: "c8", table_id: "m8", status: "aberta", pessoas: 4, garcom: "Bia", cliente_nome: "Carlos Menezes", telefone: "(21) 99999-0001", taxa_servico: 10, desconto: 0, aberta_em: minAtras(18) },
    { id: "c7", table_id: "m7", status: "conta", pessoas: 3, garcom: "Léo", cliente_nome: null, telefone: null, taxa_servico: 10, desconto: 0, aberta_em: minAtras(71) },
    { id: "c12", table_id: "m12", status: "aberta", pessoas: 2, garcom: "Bia", cliente_nome: null, telefone: null, taxa_servico: 10, desconto: 0, aberta_em: minAtras(6) },
  ];
  const it = (tab: string, nome: string, qtd: number, status: StatusItem, min: number, origem: ItemComanda["origem"] = "garcom", obs: string | null = null): ItemComanda => {
    const pr = p(nome);
    return { id: uid(), tab_id: tab, product_id: pr.id, nome, qtd, unit: pr.promo ?? pr.preco, obs, status, origem, criado_em: minAtras(min) };
  };
  const itens: ItemComanda[] = [
    it("c3", "Smash Bacon", 2, "entregue", 30),
    it("c3", "Refrigerante lata", 2, "entregue", 30),
    it("c3", "Brownie com sorvete", 1, "preparo", 4),
    it("c8", "X-Bacon Duplo", 2, "preparo", 12, "garcom", "Um sem cebola"),
    it("c8", "Combo Smash", 2, "preparo", 12),
    it("c8", "Batata cheddar e bacon", 1, "pronto", 10),
    it("c7", "Combo Casal", 1, "entregue", 60),
    it("c7", "Milk-shake de Ovomaltine", 1, "entregue", 55),
    it("c7", "Suco de maracujá", 1, "entregue", 55),
    it("c12", "Triplo Brasa", 1, "novo", 2, "cliente"),
    it("c12", "Suco de maracujá", 2, "novo", 2, "cliente"),
  ];
  return { mesas, comandas, itens, chamados: [{ id: 1, table_id: "m12", tipo: "garcom", criado_em: minAtras(1) }], fechadasHoje: [{ total: 186.4, pessoas: 4 }, { total: 92.1, pessoas: 2 }, { total: 254.9, pessoas: 5 }, { total: 61.3, pessoas: 1 }, { total: 143.8, pessoas: 3 }] };
}

// estado de demonstração compartilhado entre o painel e a página da mesa
let demo = inicial();
const ouvintes = new Set<() => void>();
const setDemo = (f: (s: Estado) => Estado) => {
  demo = f(demo);
  ouvintes.forEach((o) => o());
};
const subDemo = (o: () => void) => {
  ouvintes.add(o);
  return () => ouvintes.delete(o);
};

export const subtotal = (itens: ItemComanda[], tab: string) => itens.filter((i) => i.tab_id === tab && i.status !== "cancelado").reduce((s, i) => s + i.qtd * i.unit, 0);
export const totais = (c: Comanda, itens: ItemComanda[]) => {
  const sub = subtotal(itens, c.id);
  const servico = Math.round(sub * c.taxa_servico) / 100;
  return { sub, servico, total: Math.max(0, sub + servico - c.desconto) };
};

export function useSalao() {
  const d = useDados();
  const real = !!supabase && !!d.sessao && !!d.loja.id;
  const demoEstado = useSyncExternalStore(subDemo, () => demo);
  const [rEstado, setREstado] = useState<Estado>({ mesas: [], comandas: [], itens: [], chamados: [], fechadasHoje: [] });
  const [carregando, setCarregando] = useState(real);

  const carregar = useCallback(async () => {
    if (!supabase || !d.loja.id) return;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const [m, c, ch, f] = await Promise.all([
      supabase.from("dining_tables").select("*").eq("store_id", d.loja.id).order("numero"),
      supabase.from("tabs").select("*").eq("store_id", d.loja.id).in("status", ["aberta", "conta"]),
      supabase.from("table_calls").select("*").eq("store_id", d.loja.id).is("atendido_em", null).order("criado_em"),
      supabase.from("tabs").select("pessoas, orders(total)").eq("store_id", d.loja.id).eq("status", "fechada").gte("fechada_em", hoje.toISOString()),
    ]);
    const ids = (c.data ?? []).map((x) => x.id);
    const it = ids.length ? await supabase.from("tab_items").select("*").in("tab_id", ids).order("criado_em") : { data: [] };
    setREstado({
      mesas: (m.data ?? []) as Mesa[],
      comandas: ((c.data ?? []) as Comanda[]).map((x) => ({ ...x, taxa_servico: Number(x.taxa_servico), desconto: Number(x.desconto) })),
      itens: ((it.data ?? []) as ItemComanda[]).map((x) => ({ ...x, unit: Number(x.unit) })),
      chamados: (ch.data ?? []) as Chamado[],
      fechadasHoje: (f.data ?? []).map((x) => ({ pessoas: x.pessoas, total: Number((x.orders as unknown as { total: number } | null)?.total ?? 0) })),
    });
    setCarregando(false);
  }, [d.loja.id]);

  useEffect(() => {
    if (!real || !supabase) return;
    carregar();
    const canal = supabase
      .channel("salao-" + d.loja.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "tabs", filter: `store_id=eq.${d.loja.id}` }, () => carregar())
      .on("postgres_changes", { event: "*", schema: "public", table: "tab_items" }, () => carregar())
      .on("postgres_changes", { event: "*", schema: "public", table: "table_calls", filter: `store_id=eq.${d.loja.id}` }, () => carregar())
      .subscribe();
    const t = setInterval(carregar, 30000);
    return () => {
      supabase!.removeChannel(canal);
      clearInterval(t);
    };
  }, [real, carregar, d.loja.id]);

  const e = real ? rEstado : demoEstado;
  const err = (x: { error: { message: string } | null }) => (x.error ? x.error.message : null);

  const acoes = {
    async abrirMesa(mesa: string, pessoas: number, garcom: string): Promise<string | null> {
      if (real) {
        const r = await supabase!.rpc("abrir_mesa", { p_mesa: mesa, p_pessoas: pessoas, p_garcom: garcom || null });
        await carregar();
        return (r.data as string) ?? null;
      }
      const ja = demo.comandas.find((c) => c.table_id === mesa);
      if (ja) return ja.id;
      const id = uid();
      setDemo((s) => ({ ...s, mesas: s.mesas.map((m) => (m.id === mesa ? { ...m, reservada_para: null } : m)), comandas: [...s.comandas, { id, table_id: mesa, status: "aberta", pessoas, garcom, cliente_nome: null, telefone: null, taxa_servico: 10, desconto: 0, aberta_em: new Date().toISOString() }] }));
      return id;
    },
    async lancar(tab: string, novos: NovoItem[]) {
      if (real) {
        const r = await supabase!.rpc("lancar_itens", { p_comanda: tab, p_itens: novos.map((n) => ({ produto: n.produto, qtd: n.qtd, obs: n.obs ?? null })) });
        await carregar();
        return err(r);
      }
      setDemo((s) => ({
        ...s,
        comandas: s.comandas.map((c) => (c.id === tab && c.status === "conta" ? { ...c, status: "aberta" } : c)),
        itens: [...s.itens, ...novos.map((n) => ({ id: uid(), tab_id: tab, product_id: n.produto, nome: n.nome, qtd: n.qtd, unit: n.preco, obs: n.obs ?? null, status: "novo" as StatusItem, origem: "garcom" as const, criado_em: new Date().toISOString() }))],
      }));
      return null;
    },
    async statusItem(id: string, status: StatusItem) {
      if (real) {
        const r = await supabase!.from("tab_items").update({ status, atualizado_em: new Date().toISOString() }).eq("id", id);
        await carregar();
        return err(r);
      }
      setDemo((s) => ({ ...s, itens: s.itens.map((i) => (i.id === id ? { ...i, status } : i)) }));
      return null;
    },
    async setComanda(id: string, p: Partial<Pick<Comanda, "pessoas" | "taxa_servico" | "desconto" | "cliente_nome" | "telefone" | "status" | "garcom">>) {
      if (real) {
        const r = await supabase!.from("tabs").update(p).eq("id", id);
        await carregar();
        return err(r);
      }
      setDemo((s) => ({ ...s, comandas: s.comandas.map((c) => (c.id === id ? { ...c, ...p } : c)) }));
      return null;
    },
    async transferir(id: string, mesaDestino: string) {
      if (e.comandas.some((c) => c.table_id === mesaDestino)) return "A mesa de destino já está ocupada";
      if (real) {
        const r = await supabase!.from("tabs").update({ table_id: mesaDestino }).eq("id", id);
        await carregar();
        return err(r);
      }
      setDemo((s) => ({ ...s, comandas: s.comandas.map((c) => (c.id === id ? { ...c, table_id: mesaDestino } : c)) }));
      return null;
    },
    async cancelarComanda(id: string) {
      if (real) {
        const r = await supabase!.from("tabs").update({ status: "cancelada", fechada_em: new Date().toISOString() }).eq("id", id);
        await carregar();
        return err(r);
      }
      setDemo((s) => ({ ...s, comandas: s.comandas.filter((c) => c.id !== id), itens: s.itens.filter((i) => i.tab_id !== id) }));
      return null;
    },
    async fechar(id: string, pagamentos: Pagamento[], telefone: string, nome: string): Promise<string | null> {
      if (real) {
        const r = await supabase!.rpc("fechar_comanda", { p_comanda: id, p_pagamentos: pagamentos, p_telefone: telefone || null, p_nome: nome || null });
        await carregar();
        return err(r);
      }
      const c = demo.comandas.find((x) => x.id === id)!;
      const t = totais(c, demo.itens);
      if (t.sub <= 0) return "Comanda sem itens. Para liberar a mesa, cancele a comanda.";
      const pago = pagamentos.reduce((s, p) => s + p.valor, 0);
      if (pago + 0.009 < t.total) return `Falta receber ${(t.total - pago).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
      setDemo((s) => ({ ...s, comandas: s.comandas.filter((x) => x.id !== id), itens: s.itens.filter((i) => i.tab_id !== id), chamados: s.chamados.filter((x) => x.table_id !== c.table_id), fechadasHoje: [...s.fechadasHoje, { total: t.total, pessoas: c.pessoas }] }));
      return null;
    },
    async atenderChamado(id: number) {
      if (real) {
        await supabase!.from("table_calls").update({ atendido_em: new Date().toISOString() }).eq("id", id);
        await carregar();
        return;
      }
      setDemo((s) => ({ ...s, chamados: s.chamados.filter((c) => c.id !== id) }));
    },
    async salvarMesa(m: Partial<Mesa> & { id?: string }) {
      if (real) {
        const r = m.id ? await supabase!.from("dining_tables").update(m).eq("id", m.id) : await supabase!.from("dining_tables").insert({ ...m, store_id: d.loja.id });
        await carregar();
        return err(r);
      }
      if (m.id) setDemo((s) => ({ ...s, mesas: s.mesas.map((x) => (x.id === m.id ? { ...x, ...m } : x)) }));
      else setDemo((s) => ({ ...s, mesas: [...s.mesas, { id: uid(), numero: m.numero!, area: m.area ?? "Salão", lugares: m.lugares ?? 4, forma: m.forma ?? "quadrada", ativa: true, reservada_para: null }] }));
      return null;
    },
    async removerMesa(id: string) {
      if (e.comandas.some((c) => c.table_id === id)) return "Feche a comanda antes de remover a mesa";
      if (real) {
        const r = await supabase!.from("dining_tables").delete().eq("id", id);
        await carregar();
        return err(r);
      }
      setDemo((s) => ({ ...s, mesas: s.mesas.filter((x) => x.id !== id) }));
      return null;
    },
  };

  return { ...e, carregando: real && carregando, real, acoes };
}

// ---------- página do cliente na mesa (QR code) ----------
export type MesaPublica = { mesa: number; area: string; aberta: boolean; status: StatusComanda | null; taxa_servico: number; itens: { nome: string; qtd: number; unit: number; status: StatusItem }[] };

export function useMesaPublica(numero: number) {
  const demoEstado = useSyncExternalStore(subDemo, () => demo);
  const [real, setReal] = useState<MesaPublica | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const carregar = useCallback(async () => {
    if (!supabase) return;
    const r = await supabase.rpc("mesa_publica", { p_slug: SLUG, p_numero: numero });
    if (r.error) setErro(r.error.message);
    else setReal(r.data as MesaPublica);
  }, [numero]);
  useEffect(() => {
    if (!supabase) return;
    carregar();
    const t = setInterval(carregar, 15000);
    return () => clearInterval(t);
  }, [carregar]);

  let dados: MesaPublica | null = real;
  if (!supabase) {
    const m = demoEstado.mesas.find((x) => x.numero === numero);
    const c = m && demoEstado.comandas.find((x) => x.table_id === m.id);
    dados = m ? { mesa: m.numero, area: m.area, aberta: !!c, status: c?.status ?? null, taxa_servico: c?.taxa_servico ?? 10, itens: c ? demoEstado.itens.filter((i) => i.tab_id === c.id && i.status !== "cancelado") : [] } : null;
  }

  return {
    dados,
    erro,
    async pedir(itens: NovoItem[]): Promise<string | null> {
      if (supabase) {
        const r = await supabase.rpc("mesa_pedir", { p_slug: SLUG, p_numero: numero, p_itens: itens.map((i) => ({ produto: i.produto, qtd: i.qtd, obs: i.obs ?? null })) });
        await carregar();
        return r.error ? r.error.message : null;
      }
      const m = demo.mesas.find((x) => x.numero === numero)!;
      let c = demo.comandas.find((x) => x.table_id === m.id);
      if (!c) {
        c = { id: uid(), table_id: m.id, status: "aberta", pessoas: 1, garcom: null, cliente_nome: null, telefone: null, taxa_servico: 10, desconto: 0, aberta_em: new Date().toISOString() };
        const nova = c;
        setDemo((s) => ({ ...s, comandas: [...s.comandas, nova] }));
      }
      const tab = c.id;
      setDemo((s) => ({ ...s, itens: [...s.itens, ...itens.map((n) => ({ id: uid(), tab_id: tab, product_id: n.produto, nome: n.nome, qtd: n.qtd, unit: n.preco, obs: n.obs ?? null, status: "novo" as StatusItem, origem: "cliente" as const, criado_em: new Date().toISOString() }))] }));
      return null;
    },
    async chamar(tipo: "garcom" | "conta"): Promise<string | null> {
      if (supabase) {
        const r = await supabase.rpc("mesa_chamar", { p_slug: SLUG, p_numero: numero, p_tipo: tipo });
        await carregar();
        return r.error ? r.error.message : null;
      }
      const m = demo.mesas.find((x) => x.numero === numero)!;
      if (demo.chamados.some((x) => x.table_id === m.id && x.tipo === tipo)) return null;
      setDemo((s) => ({ ...s, chamados: [...s.chamados, { id: Date.now(), table_id: m.id, tipo, criado_em: new Date().toISOString() }], comandas: tipo === "conta" ? s.comandas.map((c) => (c.table_id === m.id ? { ...c, status: "conta" } : c)) : s.comandas }));
      return null;
    },
  };
}
