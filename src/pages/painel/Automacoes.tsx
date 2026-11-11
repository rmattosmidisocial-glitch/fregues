import { useEffect, useState } from "react";
import { AlarmClock, ArrowLeft, Bell, Coins, Filter, MessageCircle, Play, Plus, Tag, Ticket, Trash2, Workflow, Zap } from "lucide-react";
import { brl, FREGUESES } from "../../data/mock";
import { crescer, MODELOS, quandoTxt, useCrescer, type Automacao, type No, type TipoNo } from "../../data/crescer";
import { useToast } from "../../components/ui";

const TIPO: Record<TipoNo, { rotulo: string; cor: string; icone: React.ReactNode }> = {
  gatilho: { rotulo: "Quando", cor: "#ff5b1f", icone: <Zap className="h-4 w-4" /> },
  espera: { rotulo: "Esperar", cor: "#8f7b6c", icone: <AlarmClock className="h-4 w-4" /> },
  filtro: { rotulo: "Só se", cor: "#ffc03a", icone: <Filter className="h-4 w-4" /> },
  whatsapp: { rotulo: "WhatsApp", cor: "#49c27e", icone: <MessageCircle className="h-4 w-4" /> },
  cupom: { rotulo: "Cupom", cor: "#f0524a", icone: <Ticket className="h-4 w-4" /> },
  etiqueta: { rotulo: "Etiqueta", cor: "#2f7d77", icone: <Tag className="h-4 w-4" /> },
  alerta: { rotulo: "Avisar", cor: "#ff5b1f", icone: <Bell className="h-4 w-4" /> },
  pontos: { rotulo: "Pontos", cor: "#ffc03a", icone: <Coins className="h-4 w-4" /> },
};

const ESTADO: Record<Automacao["estado"], string> = {
  ativa: "bg-[#e2f2ea] text-[#1b6149]",
  pausada: "bg-grafite text-areia",
  rascunho: "bg-[#fcefd9] text-[#7a4600]",
};

function Interruptor({ ligado, onChange, rotulo }: { ligado: boolean; onChange: (v: boolean) => void; rotulo: string }) {
  return (
    <button
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!ligado);
      }}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${ligado ? "bg-manjericao" : "bg-linha"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${ligado ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

const exemplo = FREGUESES[0];
const preencher = (t = "") =>
  t
    .split("{nome}").join(exemplo.nome.split(" ")[0])
    .split("{favorito}").join(exemplo.favorito)
    .split("{pedido}").join(exemplo.favorito)
    .split("{nivel}").join("Fiel")
    .split("{bairro}").join("Méier")
    .split("{cupom}").join("BRASA-7K2")
    .replace(/\{link_[a-z_]+\}/g, "fregues.app/brasa/…");

function CartaoNo({ n, i, ativo, rodando, editar }: { n: No; i: number; ativo: boolean; rodando: boolean; editar: () => void }) {
  const t = TIPO[n.tipo];
  return (
    <div className="relative flex flex-col items-center">
      {i > 0 && <div className={`h-7 w-0.5 ${rodando ? "bg-brasa" : "bg-linha"}`} />}
      <button
        onClick={editar}
        className={`w-full max-w-[460px] rounded-2xl border bg-forno p-4 text-left transition hover:border-areia ${ativo ? "border-brasa shadow-[0_0_0_4px_rgba(255,91,31,.18)]" : "border-linha"}`}
      >
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-carvao" style={{ background: t.cor }}>
            {t.icone}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: t.cor }}>
              {t.rotulo}
            </p>
            <p className="truncate font-semibold">{n.titulo}</p>
            {n.detalhe && <p className="truncate text-[13px] text-areia">{n.detalhe}</p>}
          </div>
        </div>
        {n.tipo === "filtro" && <p className="mt-2 flex gap-3 text-[12px] font-semibold"><span className="text-manjericao">Sim → continua</span><span className="text-fumo">Não → termina</span></p>}
        {n.texto && <p className="mt-3 rounded-xl rounded-tl-sm bg-[#e4f3ea] p-3 text-[14px] leading-relaxed text-[#1e3a2c]">{preencher(n.texto)}</p>}
      </button>
    </div>
  );
}

function Editor({ a, voltar }: { a: Automacao; voltar: () => void }) {
  const [sel, setSel] = useState<string | null>(null);
  const [passo, setPasso] = useState(-1);
  const { show, Toast } = useToast();
  const no = a.nos.find((n) => n.id === sel);
  const taxa = a.disparos ? Math.round((a.conversoes / a.disparos) * 100) : 0;

  useEffect(() => {
    if (passo < 0) return;
    if (passo >= a.nos.length) {
      crescer.registrarTeste(a.id, exemplo.nome);
      show(`Teste concluído com ${exemplo.nome}`);
      setPasso(-1);
      return;
    }
    const t = setTimeout(() => setPasso(passo + 1), 650);
    return () => clearTimeout(t);
  }, [passo]);

  const setNo = (p: Partial<No>) => crescer.setAuto(a.id, (x) => ({ ...x, nos: x.nos.map((n) => (n.id === sel ? { ...n, ...p } : n)) }));

  return (
    <div>
      <button onClick={voltar} className="mb-3 flex items-center gap-1 text-[14px] text-areia hover:text-papel">
        <ArrowLeft className="h-4 w-4" /> Automações
      </button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <input
            value={a.nome}
            onChange={(e) => crescer.setAuto(a.id, (x) => ({ ...x, nome: e.target.value }))}
            aria-label="Nome da automação"
            className="w-full bg-transparent font-display text-[clamp(1.6rem,3vw,2.3rem)] font-extrabold tracking-[-0.015em] outline-none focus:underline"
          />
          <p className="max-w-[640px] text-[15px] text-areia">{a.descricao}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPasso(0)} disabled={passo >= 0} className="flex items-center gap-2 rounded-full border border-linha px-4 py-2 text-[14px] font-semibold hover:border-areia disabled:opacity-50">
            <Play className="h-4 w-4" /> {passo >= 0 ? "Testando…" : "Testar"}
          </button>
          <button
            onClick={() => {
              const nv = a.estado === "ativa" ? "pausada" : "ativa";
              crescer.setAuto(a.id, (x) => ({ ...x, estado: nv }));
              show(nv === "ativa" ? "Automação ligada" : "Automação pausada");
            }}
            className={`rounded-full px-4 py-2 text-[14px] font-semibold ${a.estado === "ativa" ? "bg-grafite text-papel" : "bg-brasa text-carvao hover:bg-mostarda"}`}
          >
            {a.estado === "ativa" ? "Pausar" : "Ligar automação"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          ["Disparos em 30 dias", a.disparos.toLocaleString("pt-BR")],
          ["Deram resultado", `${a.conversoes} (${taxa}%)`],
          ["Vendas geradas", a.receita ? brl(a.receita) : "—"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-linha bg-forno p-4">
            <p className="text-[12px] text-areia">{k}</p>
            <p className="tabular mt-1 font-display text-[22px] font-bold">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-linha bg-[radial-gradient(var(--color-linha)_1px,transparent_1px)] p-5 [background-size:18px_18px] md:p-8">
          {a.nos.map((n, i) => (
            <CartaoNo key={n.id} n={n} i={i} ativo={sel === n.id || passo === i} rodando={passo >= i && passo >= 0} editar={() => setSel(n.id)} />
          ))}
          <div className="flex flex-col items-center">
            <div className="h-7 w-0.5 bg-linha" />
            <span className="rounded-full border border-dashed border-linha px-3 py-1 text-[12px] text-fumo">Fim</span>
          </div>
        </div>

        <aside className="space-y-4">
          {no ? (
            <div className="rounded-3xl border border-linha bg-forno p-5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color: TIPO[no.tipo].cor }}>
                {TIPO[no.tipo].rotulo}
              </p>
              <label className="mt-2 block text-[13px] text-areia">
                Título
                <input value={no.titulo} onChange={(e) => setNo({ titulo: e.target.value })} className="mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2 text-[15px] text-papel" />
              </label>
              {no.tipo === "espera" && (
                <label className="mt-3 block text-[13px] text-areia">
                  Esperar quantas horas? (0 = melhor horário do cliente)
                  <input type="number" min={0} value={no.horas ?? 0} onChange={(e) => setNo({ horas: Number(e.target.value), titulo: Number(e.target.value) ? `Esperar ${e.target.value} ${Number(e.target.value) === 1 ? "hora" : "horas"}` : "Esperar o melhor horário" })} className="tabular mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2 text-[15px] text-papel" />
                </label>
              )}
              {no.texto !== undefined && (
                <label className="mt-3 block text-[13px] text-areia">
                  Mensagem
                  <textarea value={no.texto} onChange={(e) => setNo({ texto: e.target.value })} rows={5} className="mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2 text-[15px] leading-relaxed text-papel" />
                  <span className="mt-1 block text-[12px] text-fumo">Use {"{nome}"}, {"{favorito}"}, {"{cupom}"} e {"{bairro}"}: o Freguês troca pelo dado de cada cliente.</span>
                </label>
              )}
              <button onClick={() => setSel(null)} className="mt-4 w-full rounded-xl bg-papel py-2.5 text-[14px] font-semibold text-carvao">
                Pronto
              </button>
            </div>
          ) : (
            <p className="rounded-3xl border border-dashed border-linha p-5 text-[14px] text-areia">Toque em um passo do fluxo para mudar o texto da mensagem ou o tempo de espera.</p>
          )}

          <div className="rounded-3xl border border-linha bg-forno p-5">
            <h3 className="font-display text-[18px] font-bold">Últimas execuções</h3>
            {a.execucoes.length === 0 && <p className="mt-2 text-[14px] text-areia">Ainda não rodou. Ligue a automação ou faça um teste.</p>}
            <ul className="mt-2 divide-y divide-linha">
              {a.execucoes.slice(0, 8).map((x) => (
                <li key={x.id} className="flex items-start justify-between gap-3 py-2.5 text-[14px]">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{x.cliente}</span>
                    <span className="block text-[13px] text-areia">{x.nota}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={`block text-[12px] font-semibold ${x.resultado === "convertido" ? "text-manjericao" : x.resultado === "parou" ? "text-mostarda" : x.resultado === "teste" ? "text-brasa" : "text-areia"}`}>{x.valor ? brl(x.valor) : x.resultado === "teste" ? "teste" : ""}</span>
                    <span className="text-[12px] text-fumo">{quandoTxt(x.quando)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => {
              crescer.removerAuto(a.id);
              voltar();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-linha py-2.5 text-[14px] text-areia hover:border-tomate hover:text-tomate"
          >
            <Trash2 className="h-4 w-4" /> Excluir automação
          </button>
        </aside>
      </div>
      <Toast />
    </div>
  );
}

export function Automacoes() {
  const autos = useCrescer((s) => s.automacoes);
  const [aberta, setAberta] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todas" | Automacao["estado"]>("todas");
  const [modelos, setModelos] = useState(false);
  const a = autos.find((x) => x.id === aberta);
  if (a) return <Editor a={a} voltar={() => setAberta(null)} />;

  const receita = autos.reduce((s, x) => s + x.receita, 0);
  const ativas = autos.filter((x) => x.estado === "ativa").length;
  const lista = autos.filter((x) => filtro === "todas" || x.estado === filtro);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Automações</h1>
          <p className="max-w-[620px] text-[15px] text-areia">O Freguês trabalha sozinho: quando algo acontece, ele manda a mensagem certa, na hora certa, para o cliente certo.</p>
        </div>
        <button onClick={() => setModelos(true)} className="flex items-center gap-2 rounded-full bg-brasa px-5 py-3 text-[15px] font-semibold text-carvao hover:bg-mostarda">
          <Plus className="h-4 w-4" /> Nova automação
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl bg-[#fde9df] p-5">
          <p className="text-[14px] text-[#9a3412]">Vendas que as automações trouxeram em 30 dias</p>
          <p className="tabular mt-1 font-display text-[34px] font-extrabold text-brasa">{brl(receita)}</p>
        </div>
        <div className="rounded-3xl border border-linha bg-forno p-5">
          <p className="text-[14px] text-areia">Ligadas agora</p>
          <p className="tabular mt-1 font-display text-[34px] font-extrabold">
            {ativas} <span className="text-[18px] text-areia">de {autos.length}</span>
          </p>
        </div>
        <div className="rounded-3xl border border-linha bg-forno p-5">
          <p className="text-[14px] text-areia">Mensagens enviadas em 30 dias</p>
          <p className="tabular mt-1 font-display text-[34px] font-extrabold">{autos.reduce((s, x) => s + x.disparos, 0).toLocaleString("pt-BR")}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(["todas", "ativa", "pausada", "rascunho"] as const).map((f) => (
          <button key={f} onClick={() => setFiltro(f)} aria-pressed={filtro === f} className={`rounded-full px-4 py-2 text-[14px] font-semibold capitalize ${filtro === f ? "bg-papel text-carvao" : "border border-linha text-areia hover:text-papel"}`}>
            {f === "todas" ? "Todas" : f === "ativa" ? "Ligadas" : f === "pausada" ? "Pausadas" : "Rascunhos"}
          </button>
        ))}
      </div>

      <ul className="mt-4 space-y-3">
        {lista.map((x) => {
          const t = TIPO[x.nos[0].tipo];
          return (
            <li key={x.id}>
              <div role="button" tabIndex={0} onClick={() => setAberta(x.id)} onKeyDown={(e) => e.key === "Enter" && setAberta(x.id)} className="flex cursor-pointer flex-wrap items-center gap-4 rounded-3xl border border-linha bg-forno p-4 transition hover:border-areia md:p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-grafite text-brasa">
                  <Workflow className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{x.nome}</p>
                  <p className="truncate text-[14px] text-areia">
                    <span style={{ color: t.cor }}>Quando:</span> {x.nos[0].titulo} · {x.nos.length - 1} passos
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="tabular font-semibold">{x.receita ? brl(x.receita) : `${x.disparos} envios`}</p>
                  <p className="text-[12px] text-areia">editada {quandoTxt(x.editada)}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold capitalize ${ESTADO[x.estado]}`}>{x.estado}</span>
                <Interruptor ligado={x.estado === "ativa"} rotulo={`Ligar ${x.nome}`} onChange={(v) => crescer.setAuto(x.id, (y) => ({ ...y, estado: v ? "ativa" : "pausada" }))} />
              </div>
            </li>
          );
        })}
      </ul>

      {modelos && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setModelos(false)}>
          <div role="dialog" aria-label="Escolher modelo" className="scroll-thin max-h-[85vh] w-full max-w-[720px] overflow-y-auto rounded-3xl border border-linha bg-forno p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-[24px] font-extrabold">Comece por um modelo pronto</h2>
            <p className="text-[14px] text-areia">Feitos para restaurante. Você ajusta o texto e liga.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {MODELOS.map((m, i) => (
                <button
                  key={m.nome}
                  onClick={() => {
                    const id = crescer.novaDeModelo(i);
                    setModelos(false);
                    setAberta(id);
                  }}
                  className="rounded-2xl border border-linha bg-carvao p-4 text-left transition hover:border-brasa"
                >
                  <p className="font-semibold">{m.nome}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-areia">{m.descricao}</p>
                  <div className="mt-3 flex gap-1">
                    {m.nos.map((n) => (
                      <span key={n.id} className="grid h-6 w-6 place-items-center rounded-lg text-carvao" style={{ background: TIPO[n.tipo].cor }} title={TIPO[n.tipo].rotulo}>
                        {TIPO[n.tipo].icone}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
