import { useCallback, useEffect, useState } from "react";
import { SLUG, supabase, useDados } from "./dados";

export type TipoAuto = "sumindo" | "aniversario" | "pos_entrega" | "primeiro_pedido";
export type Regra = { tipo: TipoAuto; ligada: boolean; texto: string; dias: number };
export type ItemFila = { tipo: TipoAuto; customerId: string; nome: string; telefone: string; favorito: string | null; ref: string | null; detalhe: string };
export type Resumo = Record<TipoAuto, { enviadas: number; voltaram: number; receita: number }>;

export const INFO: Record<TipoAuto, { nome: string; quando: string; regra: string; padrao: string }> = {
  sumindo: {
    nome: "Resgatar quem está sumindo",
    quando: "Freguês passou do dobro do tempo em que costuma pedir",
    regra: "Só entra quem aceitou receber promoções. Cada pessoa recebe no máximo 1 vez a cada 30 dias.",
    padrao: "Oi, {nome}! Aqui é da {loja}. Faz um tempinho que você não aparece — bateu saudade do {favorito}? Peça por aqui: {link}",
  },
  aniversario: {
    nome: "Aniversário",
    quando: "Aniversário do freguês chegando",
    regra: "Só entra quem tem aniversário na ficha e aceitou promoções. Uma vez por ano.",
    padrao: "{nome}, seu aniversário está chegando! 🎉 A {loja} quer comemorar com você. Peça pelo nosso site nesta semana: {link}",
  },
  pos_entrega: {
    nome: "Perguntar como foi depois da entrega",
    quando: "Pedido entregue há mais de 1 hora (até 2 dias)",
    regra: "Mensagem de atendimento: vale para todo cliente, sem oferta. Nota baixa? Responda na hora.",
    padrao: "Oi, {nome}! Aqui é da {loja}. Seu pedido chegou bem? Responde com uma nota de 1 a 5 — sua opinião ajuda muito a gente 🙂",
  },
  primeiro_pedido: {
    nome: "Boas-vindas no primeiro pedido",
    quando: "Cliente fez o primeiro pedido nos últimos 3 dias",
    regra: "Mensagem de agradecimento, uma vez por cliente.",
    padrao: "{nome}, obrigado pelo seu primeiro pedido na {loja}! 🧡 Salva nosso número e, da próxima vez, peça direto por aqui: {link}",
  },
};
export const TIPOS: TipoAuto[] = ["pos_entrega", "sumindo", "primeiro_pedido", "aniversario"];

export function montarTexto(t: string, i: { nome: string; favorito: string | null }, loja: string) {
  const link = `${location.origin}/?r=${encodeURIComponent(SLUG)}#loja`;
  return t
    .split("{nome}").join(i.nome.split(" ")[0])
    .split("{loja}").join(loja)
    .split("{favorito}").join(i.favorito && i.favorito !== "—" ? i.favorito : "nosso cardápio")
    .split("{link}").join(link);
}

const vazio = (): Resumo => ({ sumindo: { enviadas: 0, voltaram: 0, receita: 0 }, aniversario: { enviadas: 0, voltaram: 0, receita: 0 }, pos_entrega: { enviadas: 0, voltaram: 0, receita: 0 }, primeiro_pedido: { enviadas: 0, voltaram: 0, receita: 0 } });

/** Regras, fila de hoje e resultados — no banco (loja real) ou em memória (demonstração). */
export function useAutomacoes() {
  const d = useDados();
  const lojaId = d.loja.id;
  const [regras, setRegras] = useState<Regra[]>(() => TIPOS.map((t) => ({ tipo: t, ligada: false, texto: INFO[t].padrao, dias: 3 })));
  const [fila, setFila] = useState<ItemFila[]>([]);
  const [resumo, setResumo] = useState<Resumo>(vazio);
  const [carregando, setCarregando] = useState(true);
  const [feitosDemo, setFeitosDemo] = useState<Set<string>>(new Set());

  const filaDemo = useCallback(
    (rs: Regra[], feitos: Set<string>) => {
      const on = (t: TipoAuto) => rs.find((r) => r.tipo === t)?.ligada;
      const out: ItemFila[] = [];
      if (on("sumindo"))
        d.fregueses
          .filter((f) => f.status === "sumindo" && f.pedidos > 0)
          .slice(0, 8)
          .forEach((f) => out.push({ tipo: "sumindo", customerId: f.id, nome: f.nome, telefone: f.tel.replace(/\D/g, ""), favorito: f.favorito, ref: null, detalhe: `Sem pedir há ${f.diasDesde} dias (costuma a cada ${f.intervalo})` }));
      if (on("pos_entrega"))
        d.pedidos
          .slice(0, 3)
          .forEach((p) => out.push({ tipo: "pos_entrega", customerId: "p" + p.num, nome: p.cliente, telefone: (p.tel ?? "21999990000").replace(/\D/g, ""), favorito: null, ref: String(p.num), detalhe: `Pedido #${p.num} entregue` }));
      if (on("primeiro_pedido"))
        d.fregueses
          .filter((f) => f.pedidos === 1)
          .slice(0, 2)
          .forEach((f) => out.push({ tipo: "primeiro_pedido", customerId: f.id, nome: f.nome, telefone: f.tel.replace(/\D/g, ""), favorito: f.favorito, ref: null, detalhe: "Primeiro pedido na casa" }));
      if (on("aniversario"))
        d.fregueses
          .filter((f) => f.aniversario)
          .slice(0, 2)
          .forEach((f) => out.push({ tipo: "aniversario", customerId: f.id, nome: f.nome, telefone: f.tel.replace(/\D/g, ""), favorito: f.favorito, ref: "ano", detalhe: `Aniversário ${f.aniversario}` }));
      return out.filter((i) => !feitos.has(i.tipo + i.customerId + (i.ref ?? "")));
    },
    [d.fregueses, d.pedidos],
  );

  const carregar = useCallback(async () => {
    if (!supabase || !lojaId) {
      setCarregando(false);
      return;
    }
    const [{ data: rs }, { data: fl }, { data: rz }] = await Promise.all([
      supabase.from("automacoes").select("tipo,ligada,texto,dias").eq("store_id", lojaId),
      supabase.rpc("automacao_fila", { p_store: lojaId }),
      supabase.rpc("automacao_resumo", { p_store: lojaId }),
    ]);
    setRegras(
      TIPOS.map((t) => {
        const r = (rs as { tipo: TipoAuto; ligada: boolean; texto: string; dias: number | null }[] | null)?.find((x) => x.tipo === t);
        return { tipo: t, ligada: !!r?.ligada, texto: r?.texto ?? INFO[t].padrao, dias: r?.dias ?? 3 };
      }),
    );
    setFila(
      ((fl as { tipo: TipoAuto; customer_id: string; nome: string; telefone: string; favorito: string | null; ref: string | null; detalhe: string }[]) ?? []).map((x) => ({
        tipo: x.tipo,
        customerId: x.customer_id,
        nome: x.nome,
        telefone: x.telefone,
        favorito: x.favorito,
        ref: x.ref,
        detalhe: x.detalhe,
      })),
    );
    const r = vazio();
    for (const x of (rz as { tipo: TipoAuto; enviadas: number; voltaram: number; receita: number }[]) ?? []) if (r[x.tipo]) r[x.tipo] = { enviadas: Number(x.enviadas), voltaram: Number(x.voltaram), receita: Number(x.receita) };
    setResumo(r);
    setCarregando(false);
  }, [lojaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (!supabase) setFila(filaDemo(regras, feitosDemo));
  }, [regras, feitosDemo, filaDemo]);

  async function salvarRegra(tipo: TipoAuto, c: Partial<Regra>) {
    const nova = { ...regras.find((r) => r.tipo === tipo)!, ...c };
    setRegras((rs) => rs.map((r) => (r.tipo === tipo ? nova : r)));
    if (!supabase || !lojaId) return null;
    const { error } = await supabase.from("automacoes").upsert({ store_id: lojaId, tipo, ligada: nova.ligada, texto: nova.texto, dias: nova.dias, updated_at: new Date().toISOString() });
    if (error) return error.message;
    if (c.ligada !== undefined || c.dias !== undefined) await carregar();
    return null;
  }

  async function marcar(i: ItemFila, pulou: boolean) {
    setFila((f) => f.filter((x) => !(x.tipo === i.tipo && x.customerId === i.customerId && x.ref === i.ref)));
    if (!supabase || !lojaId) {
      setFeitosDemo((s) => new Set(s).add(i.tipo + i.customerId + (i.ref ?? "")));
      if (!pulou) setResumo((r) => ({ ...r, [i.tipo]: { ...r[i.tipo], enviadas: r[i.tipo].enviadas + 1 } }));
      return;
    }
    await supabase.from("automacao_envios").insert({ store_id: lojaId, tipo: i.tipo, customer_id: i.customerId, ref: i.ref, pulou });
    if (!pulou) setResumo((r) => ({ ...r, [i.tipo]: { ...r[i.tipo], enviadas: r[i.tipo].enviadas + 1 } }));
  }

  return { regras, fila, resumo, carregando, salvarRegra, marcar, recarregar: carregar };
}
