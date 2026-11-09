import { useMemo, useState } from "react";
import { Cake, Columns3, List, MessageCircle, Search, Star, X } from "lucide-react";
import { crescer, etapaAuto, useCrescer, type Etapa } from "../../data/crescer";
import { brl, type Freguês, type Status } from "../../data/mock";
import { useDados } from "../../data/dados";
import { AnelPulso, StatusPill, useToast } from "../../components/ui";

const FILTROS: { id: Status | "todos"; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "sumindo", rotulo: "Sumindo" },
  { id: "atrasado", rotulo: "Atrasados" },
  { id: "ritmo", rotulo: "No ritmo" },
];

function Perfil({ f, fechar }: { f: Freguês; fechar: () => void }) {
  const { show, Toast } = useToast();
  const primeiro = f.nome.split(" ")[0];
  const msg = `Fala, ${primeiro}! Faz um tempinho que você não aparece por aqui 🍔 Separamos seu ${f.favorito} do jeitinho de sempre. Toca no link que já está tudo no carrinho: fregues.app/brasa/o-de-sempre`;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={fechar}>
      <div role="dialog" aria-label={`Perfil de ${f.nome}`} className="scroll-thin h-full w-full max-w-[480px] overflow-y-auto border-l border-linha bg-forno p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <AnelPulso dias={f.diasDesde} intervalo={f.intervalo} status={f.status} size={64} />
            <div>
              <h2 className="font-display text-[26px] font-extrabold leading-tight">{f.nome}</h2>
              <p className="text-[14px] text-areia">
                {f.bairro} · {f.tel}
              </p>
            </div>
          </div>
          <button onClick={fechar} aria-label="Fechar perfil" className="rounded-full p-2 hover:bg-grafite">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill status={f.status} dias={f.diasDesde} />
          <span className="rounded-full bg-grafite px-2.5 py-1 text-[12px] font-semibold text-mostarda">
            <Star className="mr-1 inline h-3 w-3" />
            {f.nivel}
          </span>
          {f.tags.map((t) => (
            <span key={t} className="rounded-full bg-grafite px-2.5 py-1 text-[12px] text-areia">
              {t}
            </span>
          ))}
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 text-[14px]">
          {[
            ["Pedidos", String(f.pedidos)],
            ["Ticket médio", brl(f.ticket)],
            ["Costuma pedir", `a cada ${f.intervalo} dias`],
            ["Gasto no ano", brl(f.pedidos * f.ticket)],
            ["Favorito", f.favorito],
            ["Melhor horário", f.horario],
            ["Canal", f.canal],
            ["Pontos", f.pontos.toLocaleString("pt-BR")],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-grafite p-3">
              <dt className="text-[12px] text-areia">{k}</dt>
              <dd className="tabular mt-0.5 font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        {f.aniversario && (
          <p className="mt-3 flex items-center gap-2 rounded-2xl bg-grafite p-3 text-[14px]">
            <Cake className="h-4 w-4 text-brasa" /> Aniversário em {f.aniversario}
          </p>
        )}
        <h3 className="mt-6 font-display text-[18px] font-bold">Mensagem sugerida</h3>
        <div className="mt-2 rounded-2xl rounded-tl-sm bg-[#1f3b2c] p-4 text-[15px] leading-relaxed text-[#e9f7ee]">{msg}</div>
        <p className="mt-2 text-[13px] text-areia">Envio sugerido: {f.horario}, o horário em que {primeiro} costuma pedir.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => show(`Agendado para ${f.horario}`)} className="rounded-xl border border-linha py-3 text-[14px] font-semibold hover:border-areia">
            Agendar
          </button>
          <button onClick={() => show(`Mensagem enviada para ${primeiro}`)} className="flex items-center justify-center gap-2 rounded-xl bg-brasa py-3 text-[14px] font-semibold text-carvao hover:bg-mostarda">
            <MessageCircle className="h-4 w-4" /> Enviar agora
          </button>
        </div>
        <Toast />
      </div>
    </div>
  );
}

const ETAPAS: { id: Etapa; rotulo: string; desc: string; cor: string }[] = [
  { id: "novo", rotulo: "Conhecendo a casa", desc: "Menos de 10 pedidos", cor: "#8f7b6c" },
  { id: "voltando", rotulo: "Pegando o hábito", desc: "10 a 13 pedidos", cor: "#2f7d77" },
  { id: "fiel", rotulo: "Fiéis", desc: "14 pedidos ou mais", cor: "#49c27e" },
  { id: "esfriando", rotulo: "Esfriando", desc: "Atrasou o pedido de costume", cor: "#ffc03a" },
  { id: "sumindo", rotulo: "Sumindo", desc: "Passou do dobro do tempo", cor: "#f0524a" },
];

function Kanban({ lista, abrir }: { lista: Freguês[]; abrir: (f: Freguês) => void }) {
  const manuais = useCrescer((s) => s.etapas);
  const [sobre, setSobre] = useState<Etapa | null>(null);
  const [limites, setLimites] = useState<Record<string, number>>({});
  const { show, Toast } = useToast();
  const etapa = (f: Freguês) => manuais[f.id] ?? etapaAuto(f);
  return (
    <div className="scroll-thin mt-4 flex gap-3 overflow-x-auto pb-3">
      {ETAPAS.map((e) => {
        const cards = lista.filter((f) => etapa(f) === e.id);
        const valor = cards.reduce((s, f) => s + f.ticket * (30 / f.intervalo), 0);
        const lim = limites[e.id] ?? 12;
        return (
          <section
            key={e.id}
            onDragOver={(ev) => {
              ev.preventDefault();
              setSobre(e.id);
            }}
            onDragLeave={() => setSobre(null)}
            onDrop={(ev) => {
              const id = ev.dataTransfer.getData("text/plain");
              setSobre(null);
              const f = lista.find((x) => x.id === id);
              if (f && etapa(f) !== e.id) {
                crescer.moverEtapa(id, e.id);
                show(`${f.nome.split(" ")[0]} foi para ${e.rotulo}`);
              }
            }}
            className={`flex w-[272px] shrink-0 flex-col rounded-3xl border bg-forno transition ${sobre === e.id ? "border-brasa" : "border-linha"}`}
            aria-label={e.rotulo}
          >
            <header className="border-b border-linha p-4">
              <p className="flex items-center gap-2 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.cor }} /> {e.rotulo}
                <span className="tabular ml-auto rounded-full bg-grafite px-2 text-[12px] text-areia">{cards.length}</span>
              </p>
              <p className="text-[12px] text-areia">{e.desc} · {brl(valor)}/mês</p>
            </header>
            <ul className="space-y-2 p-3">
              {cards.slice(0, lim).map((f) => (
                <li key={f.id}>
                  <button
                    draggable
                    onDragStart={(ev) => ev.dataTransfer.setData("text/plain", f.id)}
                    onClick={() => abrir(f)}
                    className="flex w-full cursor-grab items-center gap-3 rounded-2xl bg-grafite p-3 text-left transition hover:bg-linha active:cursor-grabbing"
                  >
                    <AnelPulso dias={f.diasDesde} intervalo={f.intervalo} status={f.status} size={38} />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold">{f.nome}</span>
                      <span className="block truncate text-[12px] text-areia">
                        {f.pedidos} pedidos · {brl(f.ticket)}
                      </span>
                    </span>
                    {manuais[f.id] && <span className="ml-auto text-[10px] text-fumo" title="Movido por você">●</span>}
                  </button>
                </li>
              ))}
              {cards.length > lim && (
                <li>
                  <button onClick={() => setLimites({ ...limites, [e.id]: lim + 20 })} className="w-full rounded-2xl py-2 text-[13px] font-semibold text-areia hover:text-papel">
                    Mostrar mais {cards.length - lim}
                  </button>
                </li>
              )}
              {cards.length === 0 && <li className="rounded-2xl border border-dashed border-linha p-4 text-center text-[13px] text-fumo">Arraste alguém para cá</li>}
            </ul>
          </section>
        );
      })}
      <Toast />
    </div>
  );
}

export function Fregueses() {
  const FREGUESES = useDados().fregueses;
  const [filtro, setFiltro] = useState<Status | "todos">("todos");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<Freguês | null>(null);
  const [limite, setLimite] = useState(40);
  const [visao, setVisao] = useState<"lista" | "etapas">("lista");

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return FREGUESES.filter((f) => (filtro === "todos" || f.status === filtro) && (!q || f.nome.toLowerCase().includes(q) || f.bairro.toLowerCase().includes(q) || f.favorito.toLowerCase().includes(q))).sort(
      (a, b) => b.ticket * b.pedidos - a.ticket * a.pedidos,
    );
  }, [filtro, busca, FREGUESES]);

  return (
    <div>
      <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.02em]">Fregueses</h1>
      <p className="text-[15px] text-areia">O número no anel é quantos dias o cliente está sem pedir. A cor mostra se isso é normal para ele.</p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => {
            const n = f.id === "todos" ? FREGUESES.length : FREGUESES.filter((x) => x.status === f.id).length;
            return (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                aria-pressed={filtro === f.id}
                className={`rounded-full px-4 py-2 text-[14px] font-semibold ${filtro === f.id ? "bg-papel text-carvao" : "border border-linha text-areia hover:text-papel"}`}
              >
                {f.rotulo} <span className="tabular opacity-70">{n}</span>
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex rounded-full border border-linha p-1" role="tablist" aria-label="Forma de ver">
          <button role="tab" aria-selected={visao === "lista"} onClick={() => setVisao("lista")} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold ${visao === "lista" ? "bg-papel text-carvao" : "text-areia"}`}>
            <List className="h-4 w-4" /> Lista
          </button>
          <button role="tab" aria-selected={visao === "etapas"} onClick={() => setVisao("etapas")} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold ${visao === "etapas" ? "bg-papel text-carvao" : "text-areia"}`}>
            <Columns3 className="h-4 w-4" /> Etapas
          </button>
        </div>
        <label className="relative w-full sm:w-[280px]">
          <span className="sr-only">Buscar por nome, bairro ou prato</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fumo" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, bairro ou prato" className="w-full rounded-full border border-linha bg-forno py-2.5 pl-9 pr-4 text-[15px] placeholder:text-fumo" />
        </label>
      </div>

      {visao === "etapas" ? (
        <Kanban lista={lista} abrir={setAberto} />
      ) : (
      <div className="mt-4 overflow-hidden rounded-3xl border border-linha bg-forno">
        <div className="hidden grid-cols-[56px_1.4fr_1fr_1fr_0.8fr_120px] gap-3 border-b border-linha px-5 py-3 text-[13px] text-areia md:grid">
          <span />
          <span>Freguês</span>
          <span>Favorito</span>
          <span>Bairro</span>
          <span>Ticket</span>
          <span>Status</span>
        </div>
        <ul className="divide-y divide-linha">
          {lista.slice(0, limite).map((f) => (
            <li key={f.id}>
              <button onClick={() => setAberto(f)} className="grid w-full grid-cols-[48px_1fr_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-grafite md:grid-cols-[56px_1.4fr_1fr_1fr_0.8fr_120px] md:px-5">
                <AnelPulso dias={f.diasDesde} intervalo={f.intervalo} status={f.status} size={44} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{f.nome}</span>
                  <span className="block truncate text-[13px] text-areia">
                    {f.nivel} · {f.pedidos} pedidos
                  </span>
                </span>
                <span className="hidden truncate text-[14px] md:block">{f.favorito}</span>
                <span className="hidden truncate text-[14px] text-areia md:block">{f.bairro}</span>
                <span className="tabular hidden text-[14px] md:block">{brl(f.ticket)}</span>
                <span>
                  <StatusPill status={f.status} />
                </span>
              </button>
            </li>
          ))}
        </ul>
        {lista.length === 0 && <p className="p-8 text-center text-areia">Ninguém encontrado com essa busca.</p>}
        {lista.length > limite && (
          <button onClick={() => setLimite(limite + 40)} className="w-full border-t border-linha py-3 text-[14px] font-semibold text-areia hover:text-papel">
            Mostrar mais ({lista.length - limite})
          </button>
        )}
      </div>
      )}
      {aberto && <Perfil f={aberto} fechar={() => setAberto(null)} />}
    </div>
  );
}
