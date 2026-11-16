import { useEffect } from "react";
import { SLUG, supabase } from "./dados";
import { crescer, persistir, type Campo, type Formulario, type RespostaForm } from "./crescer";

type LinhaForm = { id: string; nome: string; descricao: string; estado: Formulario["estado"]; cor: string; obrigado: string; campos: Campo[]; confirmar?: boolean };
type LinhaResp = { id: string; form_id: string; cliente: string | null; valores: Record<string, string | number>; created_at: string; situacao: RespostaForm["situacao"]; origem: RespostaForm["origem"]; telefone: string | null };

/** Link público de um formulário desta loja. */
export const linkForm = (id: string, pre?: { nome?: string; tel?: string }) => `${location.origin}/?r=${encodeURIComponent(SLUG)}&f=${id}${pre?.nome ? `&n=${encodeURIComponent(pre.nome)}` : ""}${pre?.tel ? `&t=${encodeURIComponent(pre.tel.replace(/\D/g, ""))}` : ""}#pesquisa`;

/** Modelos com que toda loja nova começa (sem respostas inventadas). */
function modelos(loja: string, pratos: string[]): Omit<Formulario, "id" | "respostas">[] {
  return [
    {
      nome: "Como estava seu pedido?",
      descricao: "Pesquisa de satisfação depois da entrega.",
      estado: "rascunho",
      cor: "#ff5b1f",
      obrigado: "Valeu demais! Sua opinião vai direto para a cozinha.",
      campos: [
        { id: "comida", rotulo: "Como estava a comida?", tipo: "estrelas", obrigatorio: true },
        { id: "entrega", rotulo: "E a entrega?", tipo: "estrelas", obrigatorio: true },
        { id: "nps", rotulo: `De 0 a 10, quanto você indicaria a ${loja} para um amigo?`, tipo: "nps", obrigatorio: true },
        ...(pratos.length ? [{ id: "prato", rotulo: "O que você pediu?", tipo: "escolha" as const, opcoes: [...pratos.slice(0, 6), "Outro"] }] : []),
        { id: "comentario", rotulo: "Quer contar mais alguma coisa?", tipo: "texto" },
      ],
    },
    {
      nome: "Reserva de mesa",
      descricao: "Para aniversários e grupos. A equipe confirma pelo WhatsApp.",
      estado: "rascunho",
      confirmar: true,
      cor: "#ffc03a",
      obrigado: "Pedido de reserva recebido! A gente confirma pelo WhatsApp.",
      campos: [
        { id: "nome", rotulo: "Seu nome", tipo: "nome", obrigatorio: true },
        { id: "tel", rotulo: "WhatsApp", tipo: "telefone", obrigatorio: true },
        { id: "data", rotulo: "Dia", tipo: "data", obrigatorio: true },
        { id: "hora", rotulo: "Horário", tipo: "hora", obrigatorio: true },
        { id: "pessoas", rotulo: "Quantas pessoas?", tipo: "numero", obrigatorio: true },
        { id: "ocasiao", rotulo: "É alguma ocasião especial?", tipo: "escolha", opcoes: ["Aniversário", "Encontro", "Trabalho", "Só vontade de comer bem"] },
      ],
    },
    {
      nome: `Clube ${loja}`,
      descricao: "Cadastro de clientes. Use o QR code na mesa e na embalagem.",
      estado: "rascunho",
      cor: "#49c27e",
      obrigado: "Pronto, você está no clube! Fique de olho no WhatsApp.",
      campos: [
        { id: "nome", rotulo: "Seu nome", tipo: "nome", obrigatorio: true },
        { id: "tel", rotulo: "WhatsApp", tipo: "telefone", obrigatorio: true },
        { id: "aniv", rotulo: "Data de aniversário", tipo: "data" },
      ],
    },
  ];
}

/** Painel da loja real: carrega formulários e respostas do banco e grava cada mudança. */
export function useFormulariosPainel(lojaId: string | undefined, ativo: boolean, loja: string, pratos: string[]) {
  useEffect(() => {
    if (!supabase || !lojaId || !ativo) return;
    const sb = supabase;
    let vivo = true;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    crescer.carregarForms([]); // nada de formulário de exemplo na loja real

    (async () => {
      let { data: fs } = await sb.from("forms").select("id,nome,descricao,estado,cor,obrigado,campos,confirmar").eq("store_id", lojaId).order("created_at");
      if (fs && fs.length === 0) {
        const novos = modelos(loja, pratos).map((m) => ({ ...m, store_id: lojaId }));
        const { data } = await sb.from("forms").insert(novos).select("id,nome,descricao,estado,cor,obrigado,campos,confirmar");
        fs = data ?? [];
      }
      const { data: rs } = await sb.from("form_respostas").select("id,form_id,cliente,valores,created_at,situacao,origem,telefone").eq("store_id", lojaId).order("created_at", { ascending: false }).limit(2000);
      if (!vivo) return;
      crescer.carregarForms(
        ((fs as LinhaForm[]) ?? []).map((f) => ({
          ...f,
          descricao: f.descricao ?? "",
          confirmar: !!f.confirmar,
          respostas: ((rs as LinhaResp[]) ?? []).filter((r) => r.form_id === f.id).map((r) => ({ id: r.id, quando: new Date(r.created_at).getTime(), cliente: r.cliente ?? "Cliente", valores: r.valores, situacao: r.situacao, origem: r.origem, telefone: r.telefone })),
        })),
      );
    })();

    // resposta nova (cliente preencheu o link) ou mudança de situação: chega na hora
    const paraResposta = (r: LinhaResp): RespostaForm => ({ id: r.id, quando: new Date(r.created_at).getTime(), cliente: r.cliente ?? "Cliente", valores: r.valores, situacao: r.situacao, origem: r.origem, telefone: r.telefone });
    const canal = sb
      .channel("formularios-" + lojaId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "form_respostas", filter: `store_id=eq.${lojaId}` }, (ev) => {
        const r = ev.new as LinhaResp;
        crescer.receberResposta(r.form_id, paraResposta(r));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "form_respostas", filter: `store_id=eq.${lojaId}` }, (ev) => {
        const r = ev.new as LinhaResp;
        crescer.receberResposta(r.form_id, paraResposta(r));
      })
      .subscribe();
    // reserva: confere a cada minuto caso o tempo real falhe
    const conferir = setInterval(async () => {
      const { data } = await sb
        .from("form_respostas")
        .select("id,form_id,cliente,valores,created_at,situacao,origem,telefone")
        .eq("store_id", lojaId)
        .gte("created_at", new Date(Date.now() - 36e5).toISOString());
      for (const r of (data as LinhaResp[]) ?? []) crescer.receberResposta(r.form_id, paraResposta(r));
    }, 60000);

    persistir.form = (f) => {
      clearTimeout(timers.get(f.id));
      timers.set(
        f.id,
        setTimeout(() => {
          sb.from("forms")
            .upsert({ id: f.id, store_id: lojaId, nome: f.nome || "Sem nome", descricao: f.descricao, estado: f.estado, cor: f.cor, obrigado: f.obrigado, campos: f.campos, confirmar: !!f.confirmar, updated_at: new Date().toISOString() })
            .then(() => {});
        }, 600),
      );
    };
    persistir.formApagar = (id) => {
      sb.from("forms")
        .delete()
        .eq("id", id)
        .then(() => {});
    };
    persistir.formEquipe = async (formId, valores) => {
      // o formulário pode ter sido criado agora: garante que já está gravado antes da resposta
      const f = crescer.lerForm(formId);
      if (f) await sb.from("forms").upsert({ id: f.id, store_id: lojaId, nome: f.nome || "Sem nome", descricao: f.descricao, estado: f.estado, cor: f.cor, obrigado: f.obrigado, campos: f.campos, confirmar: !!f.confirmar, updated_at: new Date().toISOString() });
      const { data, error } = await sb.rpc("form_responder_equipe", { p_id: formId, p_valores: valores });
      if (error) return { erro: error.message.replace(/^.*?: /, "") };
      return { id: (data as { id?: string } | null)?.id };
    };
    persistir.formSituacao = async (id, situacao) => {
      const { error } = await sb
        .from("form_respostas")
        .update({ situacao, decidido_em: situacao === "nova" ? null : new Date().toISOString() })
        .eq("id", id);
      return error ? error.message : null;
    };
    return () => {
      vivo = false;
      sb.removeChannel(canal);
      clearInterval(conferir);
      persistir.form = undefined;
      persistir.formApagar = undefined;
      persistir.formEquipe = undefined;
      persistir.formSituacao = undefined;
    };
    // pratos/loja só servem para o primeiro cadastro
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaId, ativo]);
}
