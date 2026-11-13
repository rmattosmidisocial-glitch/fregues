// Atendimento real: conversas da loja online no Supabase.
// Painel: carrega e acompanha as conversas da loja. Loja pública: grava a conversa do visitante.
import { useEffect } from "react";
import { nomeBairro } from "../components/GeoMap";
import { persistir, responder, resumir, store, type Ajustes, type Conversa, type LojaInfo, type Mensagem } from "./crescer";
import { SLUG, supabase } from "./dados";
import type { Produto, Zona } from "./mock";

type Linha = {
  id: string;
  cliente_nome: string;
  canal: Conversa["canal"];
  titulo: string;
  humor: Conversa["humor"];
  status: Conversa["status"];
  nao_lida: boolean;
  bairro_id: string | null;
  atualizado_em: string;
  customers: { nome: string; telefone: string } | null;
  messages: { id: number; autor: Mensagem["de"]; texto: string; criado_em: string }[];
};

const paraConversa = (l: Linha): Conversa => {
  const c: Conversa = {
    id: l.id,
    cliente: l.customers?.nome ?? l.cliente_nome,
    tel: l.customers?.telefone,
    canal: l.canal,
    titulo: l.titulo,
    humor: l.humor,
    status: l.status,
    naoLida: l.nao_lida,
    bairro: l.bairro_id ? nomeBairro(l.bairro_id) : undefined,
    mensagens: [...(l.messages ?? [])].sort((a, b) => a.id - b.id).map((m) => ({ id: String(m.id), de: m.autor, texto: m.texto, quando: new Date(m.criado_em).getTime() })),
    resumo: "",
  };
  c.resumo = resumir(c);
  return c;
};

const ajustesDe = (a: { nome_atendente?: string; nome?: string; tom?: Ajustes["tom"]; emojis?: boolean; recomendar?: boolean; passar_reclamacao?: boolean } | null): Partial<Ajustes> =>
  a ? { nomeAtendente: a.nome_atendente ?? a.nome ?? "Bia", tom: a.tom ?? "amigavel", emojis: a.emojis ?? true, recomendar: a.recomendar ?? true, passarReclamacao: a.passar_reclamacao ?? true } : {};

/** Painel do dono: liga o atendimento real enquanto o painel estiver aberto. */
export function useAtendimentoPainel(lojaId?: string, ativo = true) {
  useEffect(() => {
    if (!supabase || !lojaId || !ativo) return;
    const sb = supabase;
    let vivo = true;
    store.set((s) => ({ ...s, conversas: [] })); // nada de conversa de exemplo na loja real
    const carregar = async () => {
      const desde = new Date(Date.now() - 14 * 86400000).toISOString();
      const [{ data }, { data: aj }] = await Promise.all([
        sb.from("conversations").select("id,cliente_nome,canal,titulo,humor,status,nao_lida,bairro_id,atualizado_em,customers(nome,telefone),messages(id,autor,texto,criado_em)").eq("store_id", lojaId).gte("atualizado_em", desde).order("atualizado_em", { ascending: false }).limit(80),
        sb.from("ai_settings").select("*").eq("store_id", lojaId).maybeSingle(),
      ]);
      if (!vivo) return;
      store.set((s) => ({ ...s, conversas: ((data as unknown as Linha[]) ?? []).map(paraConversa), ajustes: { ...s.ajustes, ...ajustesDe(aj) } }));
    };
    persistir.conversa = (c) => {
      sb.from("conversations").update({ status: c.status, nao_lida: c.naoLida, atualizado_em: new Date().toISOString() }).eq("id", c.id).then(() => undefined);
    };
    persistir.equipe = async (id, texto) => {
      await sb.from("messages").insert({ conversation_id: id, autor: "equipe", texto });
      await sb.from("conversations").update({ status: "equipe", nao_lida: false, atualizado_em: new Date().toISOString() }).eq("id", id);
    };
    persistir.ajustes = (a) => {
      sb.from("ai_settings")
        .upsert({ store_id: lojaId, nome_atendente: a.nomeAtendente, tom: a.tom, emojis: a.emojis, recomendar: a.recomendar, passar_reclamacao: a.passarReclamacao })
        .then(() => undefined);
    };
    carregar();
    const canal = sb
      .channel("atendimento-" + lojaId)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations", filter: `store_id=eq.${lojaId}` }, () => carregar())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => carregar())
      .subscribe();
    const t = setInterval(carregar, 20000);
    return () => {
      vivo = false;
      clearInterval(t);
      sb.removeChannel(canal);
      persistir.conversa = persistir.equipe = persistir.ajustes = undefined;
    };
  }, [lojaId, ativo]);
}

// ---------------- loja pública ----------------
const CHAVE = `fregues-chat:${SLUG}`;
const ID_LOCAL = "loja-real";
const lerToken = () => {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
};

async function sincronizar(token: string) {
  if (!supabase) return;
  const [{ data: msgs }, { data: st }] = await Promise.all([supabase.rpc("chat_ler", { p_token: token }), supabase.rpc("chat_status", { p_token: token })]);
  const mensagens: Mensagem[] = ((msgs as { autor: Mensagem["de"]; texto: string; criado_em: string }[]) ?? []).map((m, i) => ({ id: `${i}`, de: m.autor, texto: m.texto, quando: new Date(m.criado_em).getTime() }));
  const conv: Conversa = { id: ID_LOCAL, cliente: "Você", canal: "Loja", titulo: "", humor: "neutro", status: (st as Conversa["status"]) ?? "ia", naoLida: false, mensagens, resumo: "" };
  store.set((s) => ({ ...s, conversaLoja: ID_LOCAL, conversas: [conv, ...s.conversas.filter((c) => c.id !== ID_LOCAL)] }));
}

/** Loja pública: carrega o jeito da atendente e retoma a conversa; acompanha respostas da equipe enquanto o chat está aberto. */
export function useChatLojaReal(aberto: boolean) {
  useEffect(() => {
    if (!supabase) return;
    supabase.rpc("chat_config", { p_slug: SLUG }).then(({ data }) => data && store.set((s) => ({ ...s, ajustes: { ...s.ajustes, ...ajustesDe(data) } })));
    const tk = lerToken();
    if (tk) sincronizar(tk);
  }, []);
  useEffect(() => {
    if (!supabase || !aberto) return;
    const t = setInterval(() => {
      const tk = lerToken();
      if (tk) sincronizar(tk);
    }, 4000);
    return () => clearInterval(t);
  }, [aberto]);
}

/** Loja pública: cliente mandou uma mensagem. Grava, responde com os dados da casa e grava a resposta. */
export async function falarNaLojaReal(texto: string, ctx: { zonas: Zona[]; cardapio: Produto[]; loja: LojaInfo }) {
  if (!supabase) return;
  // mostra na hora
  const otimista: Mensagem = { id: `t${Date.now()}`, de: "cliente", texto, quando: Date.now() };
  store.set((s) => {
    const atual = s.conversas.find((c) => c.id === ID_LOCAL);
    const conv: Conversa = atual ? { ...atual, mensagens: [...atual.mensagens, otimista] } : { id: ID_LOCAL, cliente: "Você", canal: "Loja", titulo: "", humor: "neutro", status: "ia", naoLida: false, mensagens: [otimista], resumo: "" };
    return { ...s, conversaLoja: ID_LOCAL, conversas: [conv, ...s.conversas.filter((c) => c.id !== ID_LOCAL)] };
  });
  const { data, error } = await supabase.rpc("chat_enviar", { p_slug: SLUG, p_token: lerToken(), p_texto: texto });
  if (error) return;
  const r0 = data as { token: string; status: Conversa["status"] };
  try {
    localStorage.setItem(CHAVE, r0.token);
  } catch {
    /* sem armazenamento: a conversa vale só nesta visita */
  }
  if (r0.status !== "equipe") {
    const r = responder(texto, { zonas: ctx.zonas, cardapio: ctx.cardapio, loja: ctx.loja, ajustes: store.get().ajustes });
    await new Promise((ok) => setTimeout(ok, 600));
    await supabase.rpc("chat_ia", { p_token: r0.token, p_texto: r.texto, p_equipe: r.equipe, p_humor: r.humor, p_titulo: r.titulo, p_bairro: r.bairro ?? null });
  }
  await sincronizar(r0.token);
}
