import { useMemo, useState } from "react";
import { Columns3, Download, List, MessageCircle, Search, Star, Upload, UserPlus, X } from "lucide-react";
import { etapaAuto, type Etapa } from "../../data/crescer";
import { brl, type Freguês, type Status } from "../../data/mock";
import { SLUG, useDados, type NovoFregues } from "../../data/dados";
import { AnelPulso, StatusPill, useToast } from "../../components/ui";

type Filtro = Status | "todos" | "sem";
const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "sumindo", rotulo: "Sumindo" },
  { id: "atrasado", rotulo: "Fora do ritmo" },
  { id: "ritmo", rotulo: "No ritmo" },
  { id: "sem", rotulo: "Ainda não pediram" },
];
const naFiltro = (f: Freguês, filtro: Filtro) => (filtro === "todos" ? true : filtro === "sem" ? f.pedidos === 0 : f.pedidos > 0 && f.status === filtro);

function Perfil({ id, fechar }: { id: string; fechar: () => void }) {
  const d = useDados();
  const f = d.fregueses.find((x) => x.id === id);
  const { show, Toast } = useToast();
  const primeiro = (f?.nome ?? "").split(" ")[0];
  const link = `${location.origin}/?r=${encodeURIComponent(SLUG)}#loja`;
  const sugestao = !f
    ? ""
    : f.pedidos === 0
      ? `Oi, ${primeiro}! Aqui é da ${d.loja.nome}. Agora você pode pedir pelo nosso site, sem taxa de aplicativo: ${link}`
      : f.status === "ritmo"
        ? `Oi, ${primeiro}! Aqui é da ${d.loja.nome}. Obrigado por pedir sempre com a gente! 🧡 Seu pedido de sempre está a um toque: ${link}`
        : `Oi, ${primeiro}! Aqui é da ${d.loja.nome}. Faz um tempinho que você não aparece${f.favorito !== "—" ? ` — bateu saudade do ${f.favorito}?` : "."} Peça por aqui: ${link}`;
  const [msg, setMsg] = useState(sugestao);
  const [obs, setObs] = useState(f?.obs ?? "");
  const [tags, setTags] = useState((f?.tags ?? []).join(", "));
  const [aniv, setAniv] = useState(f?.aniversarioISO ?? "");
  if (!f) return null;
  const tel = f.tel.replace(/\D/g, "");
  const salvar = async (c: Parameters<typeof d.acoes.editarFregues>[1], aviso: string) => {
    const e = await d.acoes.editarFregues(f.id, c);
    show(e ?? aviso);
  };

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
          {f.pedidos === 0 ? <span className="rounded-full bg-grafite px-2.5 py-1 text-[12px] font-semibold text-areia">Ainda não pediu pela loja</span> : <StatusPill status={f.status} dias={f.diasDesde} />}
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
        {f.pedidos > 0 && (
          <dl className="mt-6 grid grid-cols-2 gap-3 text-[14px]">
            {[
              ["Pedidos", String(f.pedidos)],
              ["Ticket médio", brl(f.ticket)],
              ["Costuma pedir", `a cada ${f.intervalo} dias`],
              ["Gasto total", brl(f.pontos)],
              ["Favorito", f.favorito],
              ["Melhor horário", f.horario],
              ["Canal", f.canal],
              ["Última vez", `há ${f.diasDesde} dias`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-grafite p-3">
                <dt className="text-[12px] text-areia">{k}</dt>
                <dd className="tabular mt-0.5 font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        )}

        <h3 className="mt-6 font-display text-[18px] font-bold">Mandar mensagem</h3>
        {!f.aceitaMarketing && (
          <p className="mt-2 rounded-xl border border-mostarda/50 p-3 text-[13px] text-areia">
            {primeiro} não marcou que aceita receber promoções. Pode responder e falar de pedidos, mas evite mandar oferta sem ele pedir (LGPD).
          </p>
        )}
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} aria-label="Mensagem" className="mt-2 w-full rounded-2xl rounded-tl-sm border-0 bg-[#e4f3ea] p-4 text-[15px] leading-relaxed text-[#1e3a2c] outline-none" />
        {f.horario !== "—" && <p className="mt-1 text-[13px] text-areia">Melhor momento: {f.horario}, quando {primeiro} costuma pedir.</p>}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={async () => {
              await navigator.clipboard?.writeText(msg).catch(() => {});
              show("Mensagem copiada");
            }}
            className="rounded-xl border border-linha py-3 text-[14px] font-semibold hover:border-areia"
          >
            Copiar texto
          </button>
          <a
            href={`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#25d366] py-3 text-[14px] font-semibold text-[#08301a]"
          >
            <MessageCircle className="h-4 w-4" /> Abrir no WhatsApp
          </a>
        </div>

        <h3 className="mt-7 font-display text-[18px] font-bold">Ficha</h3>
        <div className="mt-2 space-y-3 text-[13px] text-areia">
          <label className="block">
            Observações (só a equipe vê)
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              onBlur={() => obs !== (f.obs ?? "") && salvar({ obs }, "Observação salva")}
              rows={2}
              placeholder="Ex.: sem cebola, mesa perto da janela, alérgico a camarão"
              className="mt-1 w-full rounded-xl border border-linha bg-grafite px-3 py-2 text-[14px] text-papel"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              Etiquetas (separe por vírgula)
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                onBlur={() => {
                  const t = tags.split(",").map((x) => x.trim()).filter(Boolean);
                  if (t.join(",") !== f.tags.join(",")) salvar({ tags: t }, "Etiquetas salvas");
                }}
                placeholder="vip, vegetariano"
                className="mt-1 w-full rounded-xl border border-linha bg-grafite px-3 py-2 text-[14px] text-papel"
              />
            </label>
            <label className="block">
              Aniversário
              <input type="date" value={aniv} onChange={(e) => setAniv(e.target.value)} onBlur={() => aniv !== (f.aniversarioISO ?? "") && salvar({ aniversarioISO: aniv }, "Aniversário salvo")} className="mt-1 w-full rounded-xl border border-linha bg-grafite px-3 py-2 text-[14px] text-papel" />
            </label>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-xl bg-grafite px-3 py-2.5 text-[14px] font-semibold text-papel">
            Aceita receber promoções
            <input type="checkbox" checked={!!f.aceitaMarketing} onChange={(e) => salvar({ aceitaMarketing: e.target.checked }, e.target.checked ? "Marcado: aceita promoções" : "Desmarcado")} className="h-5 w-5 accent-[#e8541e]" />
          </label>
          {f.etapa && (
            <button onClick={() => d.acoes.etapaFregues(f.id, null).then(() => show("Voltou para a etapa automática"))} className="text-[13px] font-semibold underline">
              Tirar da etapa manual ({ETAPAS.find((e) => e.id === f.etapa)?.rotulo}) e voltar ao automático
            </button>
          )}
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
  const d = useDados();
  const [sobre, setSobre] = useState<Etapa | null>(null);
  const [limites, setLimites] = useState<Record<string, number>>({});
  const { show, Toast } = useToast();
  const etapa = (f: Freguês) => f.etapa ?? etapaAuto(f);
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
                d.acoes.etapaFregues(id, e.id);
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
                    {f.etapa && <span className="ml-auto text-[10px] text-fumo" title="Movido por você">●</span>}
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
  const d = useDados();
  const FREGUESES = d.fregueses;
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [limite, setLimite] = useState(40);
  const [visao, setVisao] = useState<"lista" | "etapas">("lista");
  const [novo, setNovo] = useState(false);
  const [importar, setImportar] = useState(false);
  const { show, Toast } = useToast();

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const qd = q.replace(/\D/g, "");
    return FREGUESES.filter(
      (f) =>
        naFiltro(f, filtro) &&
        (!q || f.nome.toLowerCase().includes(q) || f.bairro.toLowerCase().includes(q) || f.favorito.toLowerCase().includes(q) || f.tags.some((t) => t.toLowerCase().includes(q)) || (qd.length >= 4 && f.tel.replace(/\D/g, "").includes(qd))),
    ).sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome, "pt-BR"));
  }, [filtro, busca, FREGUESES]);

  function exportar() {
    const esc = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const linhas = [
      ["nome", "telefone", "bairro", "pedidos", "ticket_medio", "gasto_total", "dias_sem_pedir", "status", "favorito", "aniversario", "etiquetas", "aceita_promocoes", "observacoes"].join(";"),
      ...lista.map((f) =>
        [f.nome, f.tel.replace(/\D/g, ""), f.bairro, f.pedidos, f.ticket.toFixed(2).replace(".", ","), f.pontos, f.diasDesde, f.pedidos ? f.status : "sem pedidos", f.favorito, f.aniversarioISO, f.tags.join(", "), f.aceitaMarketing ? "sim" : "não", f.obs]
          .map(esc)
          .join(";"),
      ),
    ];
    const blob = new Blob(["\ufeff" + linhas.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fregueses-${d.loja.slug ?? "loja"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    show(`${lista.length} fregueses exportados`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Fregueses</h1>
          <p className="text-[15px] text-areia">O número no anel é quantos dias o cliente está sem pedir. A cor mostra se isso é normal para ele.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setNovo(true)} className="flex items-center gap-2 rounded-full bg-brasa px-4 py-2.5 text-[14px] font-semibold text-carvao hover:bg-mostarda">
            <UserPlus className="h-4 w-4" /> Novo freguês
          </button>
          <button onClick={() => setImportar(true)} className="flex items-center gap-2 rounded-full border border-linha px-4 py-2.5 text-[14px] font-semibold hover:bg-grafite">
            <Upload className="h-4 w-4" /> Importar contatos
          </button>
          <button onClick={exportar} className="flex items-center gap-2 rounded-full border border-linha px-4 py-2.5 text-[14px] font-semibold hover:bg-grafite">
            <Download className="h-4 w-4" /> Exportar
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => {
            const n = FREGUESES.filter((x) => naFiltro(x, f.id)).length;
            if (f.id === "sem" && n === 0) return null;
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
          <span className="sr-only">Buscar por nome, telefone, bairro, prato ou etiqueta</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fumo" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, telefone, bairro, etiqueta" className="w-full rounded-full border border-linha bg-forno py-2.5 pl-9 pr-4 text-[15px] placeholder:text-fumo" />
        </label>
      </div>

      {visao === "etapas" ? (
        <Kanban lista={lista} abrir={(f) => setAberto(f.id)} />
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
                <button onClick={() => setAberto(f.id)} className="grid w-full grid-cols-[48px_1fr_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-grafite md:grid-cols-[56px_1.4fr_1fr_1fr_0.8fr_120px] md:px-5">
                  {f.pedidos > 0 ? (
                    <AnelPulso dias={f.diasDesde} intervalo={f.intervalo} status={f.status} size={44} />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-grafite font-display text-[18px] font-bold text-areia">{f.nome.charAt(0).toUpperCase()}</span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{f.nome}</span>
                    <span className="block truncate text-[13px] text-areia">
                      {f.pedidos > 0 ? `${f.nivel} · ${f.pedidos} pedidos` : f.tel}
                      {f.tags.length > 0 && ` · ${f.tags.join(", ")}`}
                    </span>
                  </span>
                  <span className="hidden truncate text-[14px] md:block">{f.favorito}</span>
                  <span className="hidden truncate text-[14px] text-areia md:block">{f.bairro}</span>
                  <span className="tabular hidden text-[14px] md:block">{f.pedidos ? brl(f.ticket) : "—"}</span>
                  <span>{f.pedidos > 0 ? <StatusPill status={f.status} /> : <span className="rounded-full bg-grafite px-2.5 py-1 text-[12px] font-semibold text-areia">Sem pedidos</span>}</span>
                </button>
              </li>
            ))}
          </ul>
          {lista.length === 0 && <p className="p-8 text-center text-areia">{FREGUESES.length ? "Ninguém encontrado com essa busca." : "Ainda não há fregueses. Eles aparecem aqui sozinhos a cada pedido, ou você pode importar seus contatos."}</p>}
          {lista.length > limite && (
            <button onClick={() => setLimite(limite + 40)} className="w-full border-t border-linha py-3 text-[14px] font-semibold text-areia hover:text-papel">
              Mostrar mais ({lista.length - limite})
            </button>
          )}
        </div>
      )}
      {aberto && <Perfil id={aberto} fechar={() => setAberto(null)} />}
      {novo && <NovoFreguesForm fechar={() => setNovo(false)} avisar={show} />}
      {importar && <ImportarContatos fechar={() => setImportar(false)} avisar={show} />}
      <Toast />
    </div>
  );
}

function Janela({ titulo, fechar, children }: { titulo: string; fechar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={fechar}>
      <div role="dialog" aria-label={titulo} className="flex max-h-[94vh] w-full max-w-[560px] flex-col rounded-t-3xl border border-linha bg-forno sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-linha px-6 py-4">
          <h2 className="font-display text-[22px] font-extrabold">{titulo}</h2>
          <button onClick={fechar} aria-label="Fechar" className="rounded-full p-2 hover:bg-grafite">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
const campo = "mt-1 w-full rounded-xl border border-linha bg-grafite px-3 py-2.5 text-[15px] text-papel";

function NovoFreguesForm({ fechar, avisar }: { fechar: () => void; avisar: (t: string) => void }) {
  const d = useDados();
  const [f, setF] = useState({ nome: "", tel: "", aniv: "", tags: "", obs: "", mkt: false });
  const [erro, setErro] = useState<string | null>(null);
  const [indo, setIndo] = useState(false);
  return (
    <Janela titulo="Novo freguês" fechar={fechar}>
      <form
        className="flex-1 space-y-3 overflow-y-auto px-6 py-5 text-[13px] text-areia"
        onSubmit={async (e) => {
          e.preventDefault();
          const tel = f.tel.replace(/\D/g, "");
          if (f.nome.trim().length < 2) return setErro("Coloque o nome.");
          if (tel.length < 10 || tel.length > 11) return setErro("WhatsApp com DDD, ex.: (21) 99999-0000.");
          setIndo(true);
          const r = await d.acoes.salvarFregueses([{ nome: f.nome, telefone: tel, aniversario: f.aniv || undefined, tags: f.tags.split(",").map((x) => x.trim()).filter(Boolean), obs: f.obs, aceitaMarketing: f.mkt }]);
          setIndo(false);
          if (r.erro) return setErro(r.erro);
          avisar(`${f.nome.trim()} cadastrado`);
          fechar();
        }}
      >
        <label className="block">
          Nome
          <input autoFocus value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} className={campo} />
        </label>
        <label className="block">
          WhatsApp com DDD
          <input inputMode="tel" value={f.tel} onChange={(e) => setF({ ...f, tel: e.target.value })} placeholder="(21) 99999-0000" className={campo} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            Aniversário (opcional)
            <input type="date" value={f.aniv} onChange={(e) => setF({ ...f, aniv: e.target.value })} className={campo} />
          </label>
          <label className="block">
            Etiquetas (opcional)
            <input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} placeholder="vip, salão" className={campo} />
          </label>
        </div>
        <label className="block">
          Observações (opcional)
          <input value={f.obs} onChange={(e) => setF({ ...f, obs: e.target.value })} placeholder="Ex.: sem cebola" className={campo} />
        </label>
        <label className="flex items-start gap-3 rounded-xl bg-grafite px-3 py-3 text-[14px] text-papel">
          <input type="checkbox" checked={f.mkt} onChange={(e) => setF({ ...f, mkt: e.target.checked })} className="mt-0.5 h-5 w-5 accent-[#e8541e]" />
          <span>
            A pessoa autorizou receber promoções no WhatsApp
            <span className="block text-[12px] text-areia">Marque só se ela disse que sim (LGPD).</span>
          </span>
        </label>
        {erro && <p className="rounded-xl bg-[#fde7e4] px-3 py-2 font-semibold text-[#9b2c1f]">{erro}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={fechar} className="rounded-full border border-linha px-5 py-2.5 text-[14px] font-semibold text-papel">
            Cancelar
          </button>
          <button disabled={indo} className="rounded-full bg-brasa px-6 py-2.5 text-[14px] font-semibold text-carvao disabled:opacity-60">
            {indo ? "Salvando…" : "Cadastrar"}
          </button>
        </div>
      </form>
    </Janela>
  );
}

/** Lê contatos: .vcf (exportado do celular), .csv (planilha) ou texto colado "Nome - telefone". */
export function lerContatos(texto: string, nomeArquivo = ""): NovoFregues[] {
  const out: NovoFregues[] = [];
  if (/BEGIN:VCARD/i.test(texto)) {
    for (const bloco of texto.split(/END:VCARD/i)) {
      const nome = (bloco.match(/^FN[^:]*:(.+)$/im)?.[1] ?? bloco.match(/^N[^:]*:([^;\r\n]*);?([^;\r\n]*)/im)?.slice(1, 3).reverse().join(" ") ?? "").trim();
      const tels = [...bloco.matchAll(/^TEL[^:]*:(.+)$/gim)].map((m) => m[1].replace(/\D/g, ""));
      const tel = tels.find((t) => /^(55)?\d{2}9\d{8}$/.test(t)) ?? tels[0];
      if (nome && tel) out.push({ nome, telefone: tel });
    }
    return out;
  }
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim());
  const ehCSV = /\.csv$/i.test(nomeArquivo) || /[;,\t]/.test(linhas[0] ?? "");
  if (ehCSV && linhas.length) {
    const sep = linhas[0].includes(";") ? ";" : linhas[0].includes("\t") ? "\t" : ",";
    const cel = (l: string) => l.split(sep).map((c) => c.replace(/^"|"$/g, "").trim());
    const cab = cel(linhas[0]).map((c) => c.toLowerCase());
    const iNome = cab.findIndex((c) => /nome|name|cliente/.test(c));
    const iTel = cab.findIndex((c) => /tel|whats|celular|fone|phone/.test(c));
    if (iNome >= 0 && iTel >= 0) {
      const iAniv = cab.findIndex((c) => /aniv|nasc|birth/.test(c));
      for (const l of linhas.slice(1)) {
        const c = cel(l);
        let aniv = iAniv >= 0 ? c[iAniv] : "";
        const m = aniv?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) aniv = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
        if (c[iNome] && c[iTel]) out.push({ nome: c[iNome], telefone: c[iTel], aniversario: /^\d{4}-\d{2}-\d{2}$/.test(aniv ?? "") ? aniv : undefined });
      }
      return out;
    }
  }
  // texto livre: "Maria Silva - (21) 99999-0000" ou "21999990000 Maria"
  for (const l of linhas) {
    const m = l.match(/(\+?\d[\d\s().-]{8,}\d)/);
    if (!m) continue;
    const tel = m[1].replace(/\D/g, "");
    const nome = l.replace(m[1], "").replace(/[-–:;,|()+]+/g, " ").replace(/\s+/g, " ").trim();
    if (nome) out.push({ nome, telefone: tel });
  }
  return out;
}

function ImportarContatos({ fechar, avisar }: { fechar: () => void; avisar: (t: string) => void }) {
  const d = useDados();
  const [texto, setTexto] = useState("");
  const [arq, setArq] = useState<{ nome: string; conteudo: string } | null>(null);
  const [mkt, setMkt] = useState(false);
  const [tag, setTag] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [indo, setIndo] = useState(false);
  const contatos = useMemo(() => {
    const brutos = arq ? lerContatos(arq.conteudo, arq.nome) : lerContatos(texto);
    const vistos = new Set<string>();
    return brutos.filter((c) => {
      const t = c.telefone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
      if (t.length < 10 || t.length > 11 || vistos.has(t)) return false;
      vistos.add(t);
      return true;
    });
  }, [texto, arq]);

  return (
    <Janela titulo="Importar contatos" fechar={fechar}>
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5 text-[14px]">
        <p className="text-areia">
          Traga os clientes que você já tem: arquivo de contatos do celular (<b>.vcf</b>), planilha (<b>.csv</b> com colunas nome e telefone) ou cole uma lista com nome e telefone por linha. Quem já existe é atualizado, ninguém fica repetido.
        </p>
        <label className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-linha py-6 text-center text-areia hover:border-brasa hover:text-papel">
          <Upload className="h-7 w-7" />
          <span className="font-semibold">{arq ? arq.nome : "Escolher arquivo .vcf ou .csv"}</span>
          <input
            type="file"
            accept=".vcf,.csv,.txt,text/vcard,text/csv,text/plain"
            className="hidden"
            onChange={async (e) => {
              const fl = e.target.files?.[0];
              if (fl) setArq({ nome: fl.name, conteudo: await fl.text() });
            }}
          />
        </label>
        {!arq && (
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={5} aria-label="Lista de contatos" placeholder={"Maria Silva - (21) 99999-0000\nJoão 21988887777"} className="w-full rounded-xl border border-linha bg-grafite px-3 py-2 font-mono text-[13px]" />
        )}
        {contatos.length > 0 && (
          <div className="rounded-2xl border border-linha">
            <p className="border-b border-linha px-4 py-2 text-[13px] font-semibold text-areia">{contatos.length} contatos encontrados</p>
            <ul className="max-h-48 divide-y divide-linha overflow-y-auto text-[13px]">
              {contatos.slice(0, 200).map((c, i) => (
                <li key={i} className="flex justify-between gap-3 px-4 py-1.5">
                  <span className="truncate font-semibold">{c.nome}</span>
                  <span className="tabular shrink-0 text-areia">{c.telefone}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <label className="block text-[13px] text-areia">
          Etiqueta para todos (opcional)
          <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Ex.: salão, lista antiga" className={campo} />
        </label>
        <label className="flex items-start gap-3 rounded-xl bg-grafite px-3 py-3">
          <input type="checkbox" checked={mkt} onChange={(e) => setMkt(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[#e8541e]" />
          <span>
            Todos desta lista autorizaram receber promoções
            <span className="block text-[12px] text-areia">Na dúvida, deixe desmarcado (LGPD). Dá para marcar um por um depois.</span>
          </span>
        </label>
      </div>
      <div className="border-t border-linha px-6 py-4">
        {erro && <p className="mb-3 rounded-xl bg-[#fde7e4] px-3 py-2 text-[14px] font-semibold text-[#9b2c1f]">{erro}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={fechar} className="rounded-full border border-linha px-5 py-2.5 text-[14px] font-semibold">
            Cancelar
          </button>
          <button
            disabled={!contatos.length || indo}
            onClick={async () => {
              setIndo(true);
              const r = await d.acoes.salvarFregueses(contatos.map((c) => ({ ...c, tags: tag.trim() ? [tag.trim()] : [], aceitaMarketing: mkt })));
              setIndo(false);
              if (r.erro) return setErro(r.erro);
              avisar(`${r.n} contatos importados`);
              fechar();
            }}
            className="rounded-full bg-brasa px-6 py-2.5 text-[14px] font-semibold text-carvao disabled:opacity-50"
          >
            {indo ? "Importando…" : `Importar ${contatos.length || ""}`}
          </button>
        </div>
      </div>
    </Janela>
  );
}
