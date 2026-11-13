// Equipe da casa (garçons). Modo real na tabela staff; demonstração em memória.
import { useEffect, useState } from "react";
import { supabase, useDados } from "./dados";

export type Pessoa = { id: string; nome: string };
let demo: Pessoa[] = [
  { id: "g1", nome: "Léo" },
  { id: "g2", nome: "Bia" },
];

export function useGarcons() {
  const d = useDados();
  const lojaId = d.loja.id;
  const [lista, setLista] = useState<Pessoa[]>(supabase ? [] : demo);
  const carregar = async () => {
    if (!supabase || !lojaId) return;
    const { data } = await supabase.from("staff").select("id,nome").eq("store_id", lojaId).eq("funcao", "garcom").eq("ativo", true).order("nome");
    setLista((data as Pessoa[]) ?? []);
  };
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaId]);
  return {
    lista,
    async adicionar(nome: string) {
      if (supabase && lojaId) {
        const { error } = await supabase.from("staff").insert({ store_id: lojaId, nome, funcao: "garcom" });
        if (error) return error.message;
        await carregar();
      } else setLista((demo = [...demo, { id: String(Date.now()), nome }]));
      return null;
    },
    async remover(id: string) {
      if (supabase) {
        await supabase.from("staff").delete().eq("id", id);
        await carregar();
      } else setLista((demo = demo.filter((x) => x.id !== id)));
    },
  };
}
