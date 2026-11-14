import { useEffect } from "react";
import { SLUG, supabase } from "./dados";
import { crescer, persistir, type Campo, type Formulario } from "./crescer";

type LinhaForm = { id: string; nome: string; descricao: string; estado: Formulario["estado"]; cor: string; obrigado: string; campos: Campo[] };

/** Link público de um formulário desta loja. */
export const linkForm = (id: string) => `${location.origin}/?r=${encodeURIComponent(SLUG)}&f=${id}#pesquisa`;

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
      let { data: fs } = await sb.from("forms").select("id,nome,descricao,estado,cor,obrigado,campos").eq("store_id", lojaId).order("created_at");
      if (fs && fs.length === 0) {
        const novos = modelos(loja, pratos).map((m) => ({ ...m, store_id: lojaId }));
        const { data } = await sb.from("forms").insert(novos).select("id,nome,descricao,estado,cor,obrigado,campos");
        fs = data ?? [];
      }
      const { data: rs } = await sb.from("form_respostas").select("id,form_id,cliente,valores,created_at").eq("store_id", lojaId).order("created_at", { ascending: false }).limit(2000);
      if (!vivo) return;
      crescer.carregarForms(
        ((fs as LinhaForm[]) ?? []).map((f) => ({
          ...f,
          respostas: ((rs as { id: string; form_id: string; cliente: string | null; valores: Record<string, string | number>; created_at: string }[]) ?? [])
            .filter((r) => r.form_id === f.id)
            .map((r) => ({ id: r.id, quando: new Date(r.created_at).getTime(), cliente: r.cliente ?? "Cliente", valores: r.valores })),
        })),
      );
    })();

    persistir.form = (f) => {
      clearTimeout(timers.get(f.id));
      timers.set(
        f.id,
        setTimeout(() => {
          sb.from("forms")
            .upsert({ id: f.id, store_id: lojaId, nome: f.nome || "Sem nome", descricao: f.descricao, estado: f.estado, cor: f.cor, obrigado: f.obrigado, campos: f.campos, updated_at: new Date().toISOString() })
            .then(() => {});
        }, 600),
      );
    };
    persistir.formApagar = (id) => {
      sb.from("forms").delete().eq("id", id).then(() => {});
    };
    return () => {
      vivo = false;
      persistir.form = undefined;
      persistir.formApagar = undefined;
    };
    // pratos/loja só servem para o primeiro cadastro
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaId, ativo]);
}
