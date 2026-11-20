import { useCallback, useEffect, useState } from "react";
import { MessageCircle, RefreshCw } from "lucide-react";
import { supabaseAdmin as supabase } from "../../data/dados";
import { STATUS_CHAMADO, type Chamado } from "../../data/suporte";

type ChamadoAdmin = Chamado & { email: string | null; stores: { nome: string; whatsapp: string | null } | null };

/** Chamados abertos pelos restaurantes no botão "Ajuda e suporte". */
export function SuporteAdmin({ modo }: { modo: "real" | "demo" }) {
  const [lista, setLista] = useState<ChamadoAdmin[] | null>(null);
  const [filtro, setFiltro] = useState<"abertos" | "todos">("abertos");
  const [resp, setResp] = useState<Record<string, string>>({});
  const [erro, setErro] = useState("");
  const carregar = useCallback(async () => {
    if (!supabase) return setLista([]);
    let q = supabase.from("support_tickets").select("id,assunto,mensagem,tela,status,resposta,criado_em,atualizado_em,email,stores(nome,whatsapp)").order("criado_em", { ascending: false }).limit(100);
    if (filtro === "abertos") q = q.neq("status", "resolvido");
    const { data, error } = await q;
    if (error) setErro(error.message);
    setLista((data as unknown as ChamadoAdmin[]) ?? []);
  }, [filtro]);
  useEffect(() => {
    carregar();
  }, [carregar]);

  async function atualizar(c: ChamadoAdmin, status: Chamado["status"]) {
    if (!supabase) return;
    const resposta = (resp[c.id] ?? c.resposta ?? "").trim() || null;
    const { error } = await supabase.from("support_tickets").update({ status, resposta, atualizado_em: new Date().toISOString() }).eq("id", c.id);
    if (error) return setErro(error.message);
    carregar();
  }

  const opcao = (ativo: boolean) => `rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${ativo ? "bg-papel text-carvao" : "border border-linha text-areia hover:text-papel"}`;
  return (
    <div className="max-w-[860px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Suporte</h1>
          <p className="text-[15px] text-areia">Chamados abertos pelos restaurantes no botão "Ajuda e suporte" do painel.</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setFiltro("abertos")} className={opcao(filtro === "abertos")}>
            Em aberto
          </button>
          <button onClick={() => setFiltro("todos")} className={opcao(filtro === "todos")}>
            Todos
          </button>
          <button onClick={carregar} aria-label="Atualizar" className="rounded-full border border-linha p-2 hover:border-areia">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
      {modo === "demo" && <p className="mt-4 text-[14px] text-areia">Na versão publicada, os chamados dos restaurantes aparecem aqui.</p>}
      {erro && <p className="mt-3 text-[14px] text-[#e8846f]">{erro}</p>}
      <ul className="mt-5 space-y-3">
        {(lista ?? []).map((c) => {
          const zap = c.stores?.whatsapp ? `https://wa.me/55${c.stores.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Aqui é do suporte do Freguês, sobre o seu chamado "${c.assunto}".`)}` : null;
          return (
            <li key={c.id} className="rounded-3xl border border-linha bg-forno p-5 text-[14px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[16px] font-bold">
                  {c.stores?.nome ?? "Loja"} · {c.assunto}
                </p>
                <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${STATUS_CHAMADO[c.status].cls}`}>{STATUS_CHAMADO[c.status].rotulo}</span>
              </div>
              <p className="mt-1 text-[12px] text-fumo">
                {new Date(c.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                {c.email ? ` · ${c.email}` : ""}
                {c.tela ? ` · tela ${c.tela}` : ""}
              </p>
              <p className="mt-2 whitespace-pre-wrap">{c.mensagem}</p>
              <textarea value={resp[c.id] ?? c.resposta ?? ""} onChange={(e) => setResp({ ...resp, [c.id]: e.target.value })} rows={2} placeholder="Resposta que o restaurante vê em Meus chamados" className="mt-3 w-full rounded-xl border border-linha bg-carvao px-3 py-2 text-[14px]" />
              <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={() => atualizar(c, "andamento")} className="rounded-full border border-linha px-3 py-1.5 font-semibold hover:border-areia">
                  Em andamento
                </button>
                <button onClick={() => atualizar(c, "resolvido")} className="rounded-full bg-manjericao px-3 py-1.5 font-semibold text-white">
                  Resolvido
                </button>
                {c.status === "resolvido" && (
                  <button onClick={() => atualizar(c, "aberto")} className="rounded-full border border-linha px-3 py-1.5 font-semibold hover:border-areia">
                    Reabrir
                  </button>
                )}
                {zap && (
                  <a href={zap} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1.5 rounded-full bg-[#25d366] px-3 py-1.5 font-semibold text-[#0b2e17]">
                    <MessageCircle className="h-4 w-4" /> Chamar a loja
                  </a>
                )}
              </div>
            </li>
          );
        })}
        {lista && lista.length === 0 && <li className="rounded-3xl border border-dashed border-linha p-6 text-center text-areia">Nenhum chamado {filtro === "abertos" ? "em aberto" : "ainda"}. 👌</li>}
      </ul>
    </div>
  );
}
