// Suporte do Freguês: contato (WhatsApp e horário) e chamados abertos pela equipe da loja.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./dados";

export type Chamado = { id: string; assunto: string; mensagem: string; tela: string | null; status: "aberto" | "andamento" | "resolvido"; resposta: string | null; criado_em: string; atualizado_em: string };
export type ContatoSuporte = { whatsapp: string; horario: string };

export const STATUS_CHAMADO: Record<Chamado["status"], { rotulo: string; cls: string }> = {
  aberto: { rotulo: "Aberto", cls: "bg-[#fcefd9] text-[#7a4600]" },
  andamento: { rotulo: "Em andamento", cls: "bg-[#e6eefb] text-[#1d4f91]" },
  resolvido: { rotulo: "Resolvido", cls: "bg-[#e4f3ea] text-[#1b6149]" },
};

const CONTATO_PADRAO: ContatoSuporte = { whatsapp: "21967640607", horario: "Segunda a sábado, das 9h às 18h" };
let demo: Chamado[] = [];

/** WhatsApp e horário do suporte (cai no WhatsApp comercial enquanto o de suporte não for cadastrado). */
export function useContatoSuporte() {
  const [c, setC] = useState<ContatoSuporte>(CONTATO_PADRAO);
  useEffect(() => {
    supabase?.rpc("config_publica").then(({ data }) => {
      const x = (data as { whatsapp: string; suporte_whatsapp?: string; suporte_horario?: string }[] | null)?.[0];
      if (!x) return;
      setC({ whatsapp: (x.suporte_whatsapp || x.whatsapp || CONTATO_PADRAO.whatsapp).replace(/\D/g, ""), horario: x.suporte_horario || CONTATO_PADRAO.horario });
    });
  }, []);
  return c;
}

export function useChamados(storeId: string | undefined) {
  const [lista, setLista] = useState<Chamado[]>(supabase ? [] : demo);
  const carregar = useCallback(async () => {
    if (!supabase || !storeId) return setLista([...demo]);
    const { data } = await supabase.from("support_tickets").select("id,assunto,mensagem,tela,status,resposta,criado_em,atualizado_em").eq("store_id", storeId).order("criado_em", { ascending: false }).limit(30);
    setLista((data as Chamado[]) ?? []);
  }, [storeId]);
  useEffect(() => {
    carregar();
  }, [carregar]);
  const abrir = async (assunto: string, mensagem: string, tela: string, email?: string): Promise<string | null> => {
    if (mensagem.trim().length < 3) return "Conte em poucas palavras o que aconteceu.";
    if (!supabase || !storeId) {
      const agora = new Date().toISOString();
      demo = [{ id: Math.random().toString(36).slice(2), assunto, mensagem: mensagem.trim(), tela, status: "aberto", resposta: null, criado_em: agora, atualizado_em: agora }, ...demo];
      setLista([...demo]);
      return null;
    }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("support_tickets").insert({ store_id: storeId, user_id: u.user?.id, email: email ?? u.user?.email ?? null, assunto, mensagem: mensagem.trim(), tela });
    if (error) return "Não foi possível registrar agora. Chame no WhatsApp do suporte.";
    await carregar();
    return null;
  };
  return { lista, abrir, carregar };
}
