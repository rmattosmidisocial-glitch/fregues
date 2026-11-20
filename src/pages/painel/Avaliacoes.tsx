import { useEffect, useState } from "react";
import { MessageCircle, Star } from "lucide-react";
import { Painelzinho } from "../../components/ui";
import { useDados, type Avaliacao } from "../../data/dados";

/** Avaliações dos clientes da loja (atualiza a cada minuto). */
export function useAvaliacoes() {
  const d = useDados();
  const [lista, setLista] = useState<Avaliacao[] | null>(null);
  useEffect(() => {
    let vivo = true;
    const ler = () => d.acoes.avaliacoes().then((l) => vivo && setLista([...l]));
    ler();
    const t = setInterval(ler, 60_000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.loja.id, d.modo]);
  return lista;
}

export const quandoAval = (iso: string) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `há ${Math.max(1, min)} min`;
  if (min < 24 * 60) return `há ${Math.round(min / 60)} h`;
  const dias = Math.round(min / 1440);
  return dias === 1 ? "ontem" : `há ${dias} dias`;
};

function Estrelas({ n, tam = "h-4 w-4" }: { n: number; tam?: string }) {
  return (
    <span className="flex gap-0.5" aria-label={`${n} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${tam} ${i <= n ? "fill-mostarda text-mostarda" : "text-linha"}`} />
      ))}
    </span>
  );
}

function linkDesculpas(a: Avaliacao, loja: string) {
  const t = (a.tel ?? "").replace(/\D/g, "");
  if (t.length < 10) return null;
  const nome = a.cliente.split(" ")[0];
  const texto = `Oi, ${nome}! Aqui é da ${loja}. Vimos sua avaliação do pedido #${a.num} e sentimos muito. Pode contar o que aconteceu? Queremos resolver.`;
  return `https://wa.me/${t.startsWith("55") ? t : "55" + t}?text=${encodeURIComponent(texto)}`;
}

export function PainelAvaliacoes({ lista }: { lista: Avaliacao[] | null }) {
  const d = useDados();
  const [filtro, setFiltro] = useState<"todas" | "baixas">("todas");
  const [mais, setMais] = useState(false);
  if (!lista) return null;

  const qtd = lista.length;
  const media = qtd ? lista.reduce((s, a) => s + a.nota, 0) / qtd : 0;
  const mes = lista.filter((a) => Date.now() - new Date(a.quando).getTime() < 30 * 86400e3);
  const porNota = [5, 4, 3, 2, 1].map((n) => ({ n, q: lista.filter((a) => a.nota === n).length }));
  const vis = lista.filter((a) => filtro === "todas" || a.nota <= 3);
  const mostrar = mais ? vis.slice(0, 30) : vis.slice(0, 5);

  return (
    <Painelzinho>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-[22px] font-bold">Avaliações dos clientes</h2>
        <div className="flex rounded-full bg-grafite p-1 text-[13px] font-semibold" role="group" aria-label="Filtro">
          {(["todas", "baixas"] as const).map((f) => (
            <button key={f} onClick={() => setFiltro(f)} aria-pressed={filtro === f} className={`rounded-full px-3 py-1 ${filtro === f ? "bg-papel text-carvao" : "text-areia hover:text-papel"}`}>
              {f === "todas" ? "Todas" : "Notas baixas"}
            </button>
          ))}
        </div>
      </div>

      {!qtd ? (
        <p className="mt-3 rounded-2xl bg-grafite p-4 text-[14px] text-areia">
          Ainda não há avaliações. Quando o pedido é entregue, o cliente vê as estrelas na tela de acompanhamento. Você também pode mandar o link pelo botão <b className="text-papel">Pedir avaliação</b> nos pedidos entregues.
        </p>
      ) : (
        <div className="mt-4 grid gap-5 md:grid-cols-[220px_1fr]">
          <div>
            <p className="font-display text-[52px] font-extrabold leading-none">{media.toFixed(1).replace(".", ",")}</p>
            <div className="mt-2">
              <Estrelas n={Math.round(media)} tam="h-5 w-5" />
            </div>
            <p className="mt-1 text-[13px] text-areia">
              {qtd} {qtd === 1 ? "avaliação" : "avaliações"} · {mes.length} nos últimos 30 dias
            </p>
            <ul className="mt-3 space-y-1">
              {porNota.map(({ n, q }) => (
                <li key={n} className="flex items-center gap-2 text-[12px] text-areia">
                  <span className="w-3 tabular">{n}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-grafite">
                    <span className={`block h-full rounded-full ${n <= 2 ? "bg-tomate" : n === 3 ? "bg-mostarda" : "bg-manjericao"}`} style={{ width: `${(q / qtd) * 100}%` }} />
                  </span>
                  <span className="w-6 text-right tabular">{q}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            {!vis.length ? (
              <p className="rounded-2xl bg-grafite p-4 text-[14px] text-areia">Nenhuma nota baixa. Continue assim!</p>
            ) : (
              <ul className="divide-y divide-linha">
                {mostrar.map((a) => {
                  const link = a.nota <= 3 ? linkDesculpas(a, d.loja.nome) : null;
                  return (
                    <li key={a.pedidoId} className="flex gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Estrelas n={a.nota} />
                          <span className="font-semibold">{a.cliente}</span>
                          <span className="text-[13px] text-areia">
                            #{a.num} · {quandoAval(a.quando)}
                          </span>
                        </div>
                        <p className={`mt-1 text-[14px] ${a.comentario ? "" : "text-fumo"}`}>{a.comentario || "Sem comentário"}</p>
                      </div>
                      {link && (
                        <a href={link} target="_blank" rel="noreferrer" className="flex h-fit shrink-0 items-center gap-1.5 rounded-full bg-papel px-3 py-2 text-[13px] font-semibold text-carvao hover:bg-mostarda">
                          <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">Chamar</span>
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {vis.length > 5 && (
              <button onClick={() => setMais(!mais)} className="mt-2 text-[14px] text-areia hover:text-papel">
                {mais ? "Ver menos" : `Ver mais (${Math.min(30, vis.length) - 5})`}
              </button>
            )}
          </div>
        </div>
      )}
    </Painelzinho>
  );
}
