import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { useDados } from "../../data/dados";
import { linkForm } from "../../data/formularios";
import { ArrowDown, ArrowLeft, ArrowUp, Check, ClipboardList, Copy, ExternalLink, MessageCircle, PenLine, Plus, Send, Star, Trash2, X } from "lucide-react";
import { crescer, quandoTxt, useCrescer, type Campo, type Formulario, type RespostaForm, type TipoCampo } from "../../data/crescer";
import { useToast } from "../../components/ui";

const TIPOS: { id: TipoCampo; rotulo: string }[] = [
  { id: "estrelas", rotulo: "Nota de 1 a 5 estrelas" },
  { id: "nps", rotulo: "Nota de 0 a 10 (indicaria?)" },
  { id: "escolha", rotulo: "Escolha uma opção" },
  { id: "texto", rotulo: "Texto livre" },
  { id: "nome", rotulo: "Nome" },
  { id: "telefone", rotulo: "WhatsApp" },
  { id: "data", rotulo: "Data" },
  { id: "hora", rotulo: "Horário" },
  { id: "numero", rotulo: "Número" },
];
const ESTADO: Record<Formulario["estado"], string> = {
  "no ar": "bg-[#e2f2ea] text-[#1b6149]",
  pausado: "bg-grafite text-areia",
  rascunho: "bg-[#fcefd9] text-[#7a4600]",
};

function resumoNumerico(f: Formulario, c: Campo) {
  const vals = f.respostas.map((r) => Number(r.valores[c.id])).filter((v) => !Number.isNaN(v));
  if (!vals.length) return null;
  const media = vals.reduce((s, v) => s + v, 0) / vals.length;
  if (c.tipo === "nps") {
    const prom = vals.filter((v) => v >= 9).length;
    const det = vals.filter((v) => v <= 6).length;
    return { media, nps: Math.round(((prom - det) / vals.length) * 100), dist: [0, 0, 0] as number[], prom, det, n: vals.length };
  }
  const dist = [1, 2, 3, 4, 5].map((k) => vals.filter((v) => v === k).length);
  return { media, dist, n: vals.length };
}

const digitos = (t: unknown) => String(t ?? "").replace(/\D/g, "");
const dataBr = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v).slice(8, 10) + "/" + String(v).slice(5, 7) : String(v ?? ""));
/** Valor de uma resposta para mostrar (data em dd/mm). */
const mostrar = (c: Campo, v: unknown) => (c.tipo === "data" ? dataBr(v) : c.tipo === "estrelas" ? "★".repeat(Number(v)) : String(v));
/** WhatsApp do cliente numa resposta. */
function telDaResposta(f: Formulario, r: RespostaForm) {
  const c = f.campos.find((x) => x.tipo === "telefone");
  const t = digitos(r.telefone || (c ? r.valores[c.id] : ""));
  return t.length >= 10 ? (t.startsWith("55") && t.length >= 12 ? t : "55" + t) : null;
}
/** Resumo do que a pessoa pediu (dia, horário, pessoas, ocasião) para a mensagem. */
function resumo(f: Formulario, r: RespostaForm) {
  const partes: string[] = [];
  for (const c of f.campos) {
    const v = r.valores[c.id];
    if (v === undefined || v === "") continue;
    if (c.tipo === "data") partes.push(/anivers|nasc/i.test(c.rotulo) ? `aniversário ${dataBr(v)}` : `dia ${dataBr(v)}`);
    else if (c.tipo === "hora") partes.push(`às ${v}`);
    else if (c.tipo === "numero" && /pessoa/i.test(c.rotulo)) partes.push(`${v} pessoas`);
    else if (c.tipo === "escolha" && /ocasi/i.test(c.rotulo)) partes.push(String(v).toLowerCase());
  }
  return partes.join(", ");
}
function linkAviso(f: Formulario, r: RespostaForm, loja: string, ok: boolean) {
  const tel = telDaResposta(f, r);
  if (!tel) return null;
  const nome = r.cliente.split(" ")[0];
  const oque = resumo(f, r);
  const txt = ok ? `Olá, ${nome}! Está confirmado na ${loja}${oque ? `: ${oque}` : ""}. Te esperamos!` : `Olá, ${nome}! Infelizmente não conseguimos atender${oque ? ` (${oque})` : ""} na ${loja}. Quer tentar outro dia ou horário?`;
  return `https://wa.me/${tel}?text=${encodeURIComponent(txt)}`;
}

/** A equipe preenche o formulário pelo cliente (no balcão ou por telefone). */
function PreencherEquipe({ f, fechar, aoSalvar }: { f: Formulario; fechar: () => void; aoSalvar: (nome: string) => void }) {
  const [v, setV] = useState<Record<string, string | number>>({});
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const inp = "mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px] text-papel";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Preencher pelo cliente">
      <div className="max-h-[90vh] w-full max-w-[460px] overflow-y-auto rounded-3xl border border-linha bg-forno p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-[20px] font-bold">Preencher pelo cliente</p>
            <p className="text-[13px] text-areia">
              {f.nome}. {f.confirmar ? "Já entra confirmado." : ""} Com nome e WhatsApp, o cliente entra em Fregueses.
            </p>
          </div>
          <button onClick={fechar} aria-label="Fechar" className="rounded-full p-1.5 text-areia hover:bg-grafite">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {f.campos.map((c) => {
            const val = v[c.id] ?? "";
            const muda = (x: string | number) => setV({ ...v, [c.id]: x });
            return (
              <label key={c.id} className="block text-[13px] text-areia">
                {c.rotulo}
                {c.obrigatorio && <span className="text-brasa"> *</span>}
                {c.tipo === "escolha" ? (
                  <select value={String(val)} onChange={(e) => muda(e.target.value)} className={inp}>
                    <option value="">Escolha…</option>
                    {(c.opcoes ?? []).map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : c.tipo === "estrelas" || c.tipo === "nps" ? (
                  <select value={String(val)} onChange={(e) => muda(e.target.value === "" ? "" : Number(e.target.value))} className={inp}>
                    <option value="">Nota…</option>
                    {(c.tipo === "estrelas" ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                ) : c.tipo === "texto" ? (
                  <textarea rows={2} value={String(val)} onChange={(e) => muda(e.target.value)} className={inp} />
                ) : (
                  <input
                    type={c.tipo === "data" ? "date" : c.tipo === "hora" ? "time" : c.tipo === "numero" ? "number" : c.tipo === "telefone" ? "tel" : "text"}
                    inputMode={c.tipo === "telefone" ? "tel" : c.tipo === "numero" ? "numeric" : undefined}
                    value={String(val)}
                    onChange={(e) => muda(c.tipo === "numero" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
                    className={inp}
                  />
                )}
              </label>
            );
          })}
        </div>
        {erro && <p className="mt-3 rounded-xl bg-[#fbe4e0] p-3 text-[14px] text-[#8e2f2a]">{erro}</p>}
        <button
          disabled={salvando}
          onClick={async () => {
            setErro("");
            setSalvando(true);
            const e = await crescer.responderPelaEquipe(f.id, v);
            setSalvando(false);
            if (e) return setErro(e);
            const nome = f.campos.find((c) => c.tipo === "nome");
            aoSalvar(String((nome && v[nome.id]) || "Cliente"));
          }}
          className="mt-4 w-full rounded-xl bg-brasa py-3.5 text-[16px] font-bold text-carvao hover:bg-mostarda disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </div>
  );
}

/** Manda o link do formulário para um cliente pelo WhatsApp, já com nome e telefone preenchidos. */
function MandarParaCliente({ f, aviso }: { f: Formulario; aviso: (t: string) => void }) {
  const d = useDados();
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const t = digitos(tel);
  const ok = t.length >= 10;
  const destino = t.startsWith("55") && t.length >= 12 ? t : "55" + t;
  const msg = `Olá${nome.trim() ? `, ${nome.trim().split(" ")[0]}` : ""}! Aqui é da ${d.loja.nome}. Preenche rapidinho para a gente: ${linkForm(f.id, { nome: nome.trim(), tel: t })}`;
  return (
    <div className="rounded-3xl border border-linha bg-forno p-5 md:col-span-2">
      <h3 className="flex items-center gap-2 font-display text-[18px] font-bold">
        <Send className="h-5 w-5 text-brasa" /> Mandar para um cliente
      </h3>
      <p className="mt-1 text-[14px] text-areia">O cliente recebe o link no WhatsApp, já com o nome e o telefone dele. Quando ele enviar, a resposta aparece aqui{f.confirmar ? " para você dar o ok" : ""}.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          list={`fregueses-${f.id}`}
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            const achou = d.fregueses.find((x) => x.nome === e.target.value);
            if (achou) setTel(achou.tel);
          }}
          placeholder="Nome (ou busque um freguês)"
          aria-label="Nome do cliente"
          className="min-w-0 flex-1 rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px]"
        />
        <datalist id={`fregueses-${f.id}`}>
          {d.fregueses.slice(0, 300).map((x) => (
            <option key={x.id} value={x.nome} />
          ))}
        </datalist>
        <input value={tel} onChange={(e) => setTel(e.target.value)} inputMode="tel" placeholder="WhatsApp (21) 9…" aria-label="WhatsApp do cliente" className="w-[200px] rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px]" />
        <a
          href={ok && f.estado === "no ar" ? `https://wa.me/${destino}?text=${encodeURIComponent(msg)}` : undefined}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => {
            if (f.estado !== "no ar") {
              e.preventDefault();
              aviso("Coloque o formulário no ar primeiro, senão o link não abre para o cliente");
            } else if (!ok) {
              e.preventDefault();
              aviso("Digite o WhatsApp do cliente com DDD");
            }
          }}
          className="flex items-center gap-2 rounded-xl bg-[#1f9d55] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#188a4a]"
        >
          <MessageCircle className="h-4 w-4" /> Enviar pelo WhatsApp
        </a>
      </div>
    </div>
  );
}

function Abrir({ f, voltar }: { f: Formulario; voltar: () => void }) {
  const [aba, setAba] = useState<"respostas" | "perguntas" | "compartilhar">("respostas");
  const { show, Toast } = useToast();
  const set = (p: Partial<Formulario>) => crescer.setForm(f.id, (x) => ({ ...x, ...p }));
  const setCampo = (id: string, p: Partial<Campo>) => crescer.setForm(f.id, (x) => ({ ...x, campos: x.campos.map((c) => (c.id === id ? { ...c, ...p } : c)) }));
  const mover = (i: number, d: number) =>
    crescer.setForm(f.id, (x) => {
      const cs = [...x.campos];
      const j = i + d;
      if (j < 0 || j >= cs.length) return x;
      [cs[i], cs[j]] = [cs[j], cs[i]];
      return { ...x, campos: cs };
    });
  const numericos = f.campos.filter((c) => c.tipo === "estrelas" || c.tipo === "nps");
  const escolhas = f.campos.filter((c) => c.tipo === "escolha");
  const d = useDados();
  const real = d.modo === "real";
  const link = linkForm(f.id);
  const [qr, setQr] = useState("");
  const [apagar, setApagar] = useState(false);
  const [preencher, setPreencher] = useState(false);
  const novas = f.respostas.filter((r) => r.situacao === "nova").length;
  const [filtro, setFiltro] = useState<"nova" | "confirmada" | "recusada" | "todas">(f.confirmar && novas > 0 ? "nova" : "todas");
  const lista = f.confirmar && filtro !== "todas" ? f.respostas.filter((r) => (filtro === "nova" ? r.situacao === "nova" || !r.situacao : r.situacao === filtro)) : f.respostas;
  async function decidir(r: RespostaForm, sit: "confirmada" | "recusada" | "nova") {
    const e = await crescer.situacaoResposta(f.id, r.id, sit);
    if (e) return show(e);
    if (sit === "nova") return show("Voltou para confirmar");
    const link = linkAviso(f, r, d.loja.nome, sit === "confirmada");
    show(sit === "confirmada" ? `Confirmado: ${r.cliente}` : `Recusado: ${r.cliente}`);
    if (link) window.open(link, "_blank", "noopener");
  }
  useEffect(() => {
    QRCode.toDataURL(link, { margin: 2, width: 720, color: { dark: "#17110e", light: "#ffffff" } }).then(setQr);
  }, [link]);
  function exportar() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const linhas = [["quando", ...f.campos.map((c) => c.rotulo)].map(esc).join(";"), ...f.respostas.map((r) => [new Date(r.quando).toLocaleString("pt-BR"), ...f.campos.map((c) => r.valores[c.id])].map(esc).join(";"))];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + linhas.join("\n")], { type: "text/csv;charset=utf-8" }));
    a.download = `${f.nome.replace(/[^\w-]+/g, "-").toLowerCase()}-respostas.csv`;
    a.click();
    show(`${f.respostas.length} respostas exportadas`);
  }

  return (
    <div>
      <button onClick={voltar} className="mb-3 flex items-center gap-1 text-[14px] text-areia hover:text-papel">
        <ArrowLeft className="h-4 w-4" /> Formulários
      </button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <input value={f.nome} onChange={(e) => set({ nome: e.target.value })} aria-label="Nome do formulário" className="w-full bg-transparent font-display text-[clamp(1.6rem,3vw,2.3rem)] font-extrabold tracking-[-0.015em] outline-none focus:underline" />
          <input value={f.descricao} onChange={(e) => set({ descricao: e.target.value })} placeholder="Para que serve este formulário?" aria-label="Descrição" className="w-full bg-transparent text-[15px] text-areia outline-none" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setPreencher(true)} className="flex items-center gap-2 rounded-full bg-papel px-4 py-2 text-[14px] font-semibold text-carvao hover:bg-areia">
            <PenLine className="h-4 w-4" /> Preencher pelo cliente
          </button>
          <a
            href={real ? link : "#pesquisa"}
            target={real ? "_blank" : undefined}
            rel="noreferrer"
            onClick={(e) => {
              if (real && f.estado !== "no ar") {
                e.preventDefault();
                show("Coloque no ar primeiro para o link abrir para o cliente");
              } else crescer.abrirPublico(f.id);
            }}
            className="flex items-center gap-2 rounded-full border border-linha px-4 py-2 text-[14px] font-semibold hover:border-areia"
          >
            <ExternalLink className="h-4 w-4" /> Ver como o cliente vê
          </a>
          <button onClick={() => set({ estado: f.estado === "no ar" ? "pausado" : "no ar" })} className={`rounded-full px-4 py-2 text-[14px] font-semibold ${f.estado === "no ar" ? "bg-grafite" : "bg-brasa text-carvao hover:bg-mostarda"}`}>
            {f.estado === "no ar" ? "Pausar" : "Colocar no ar"}
          </button>
        </div>
      </div>

      <div className="mt-5 flex gap-1 border-b border-linha" role="tablist">
        {(
          [
            ["respostas", f.confirmar && novas ? `Respostas (${novas} para confirmar)` : `Respostas (${f.respostas.length})`],
            ["perguntas", `Perguntas (${f.campos.length})`],
            ["compartilhar", "Compartilhar"],
          ] as const
        ).map(([v, r]) => (
          <button key={v} role="tab" aria-selected={aba === v} onClick={() => setAba(v)} className={`-mb-px border-b-2 px-4 py-2.5 text-[14px] font-semibold ${aba === v ? "border-brasa text-papel" : "border-transparent text-areia hover:text-papel"}`}>
            {r}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1 pb-1">
          {f.respostas.length > 0 && (
            <button onClick={exportar} className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-areia hover:bg-grafite hover:text-papel">
              Baixar respostas
            </button>
          )}
          {apagar ? (
            <span className="flex items-center gap-2 text-[13px]">
              Apagar{f.respostas.length ? ` com ${f.respostas.length} respostas` : ""}?
              <button
                onClick={() => {
                  crescer.removerForm(f.id);
                  voltar();
                }}
                className="rounded-full bg-[#9b2c1f] px-3 py-1 font-semibold text-white"
              >
                Sim
              </button>
              <button onClick={() => setApagar(false)} className="underline">
                Não
              </button>
            </span>
          ) : (
            <button onClick={() => setApagar(true)} aria-label="Apagar formulário" className="rounded-full p-2 text-areia hover:bg-grafite hover:text-[#ff8b80]">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {aba === "respostas" && (
        <div className="mt-5 space-y-5">
          {(numericos.length > 0 || escolhas.length > 0) && f.respostas.length > 0 && (
            <div className="grid gap-3 md:grid-cols-3">
              {numericos.map((c) => {
                const r = resumoNumerico(f, c);
                if (!r) return null;
                return (
                  <div key={c.id} className="rounded-3xl border border-linha bg-forno p-5">
                    <p className="text-[13px] text-areia">{c.rotulo}</p>
                    {c.tipo === "nps" && "nps" in r ? (
                      <>
                        <p className="tabular mt-1 font-display text-[36px] font-extrabold" style={{ color: (r.nps ?? 0) >= 50 ? "#49c27e" : (r.nps ?? 0) >= 0 ? "#ffc03a" : "#f0524a" }}>
                          {r.nps}
                        </p>
                        <p className="text-[13px] text-areia">
                          NPS · {r.prom} promotores, {r.det} detratores
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="tabular mt-1 flex items-center gap-2 font-display text-[36px] font-extrabold">
                          {r.media.toFixed(1).replace(".", ",")} <Star className="h-6 w-6 fill-mostarda text-mostarda" />
                        </p>
                        <div className="mt-2 space-y-1">
                          {[5, 4, 3, 2, 1].map((k) => (
                            <div key={k} className="flex items-center gap-2 text-[12px] text-areia">
                              <span className="w-3">{k}</span>
                              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-grafite">
                                <span className="block h-full rounded-full bg-mostarda" style={{ width: `${(r.dist[k - 1] / r.n) * 100}%` }} />
                              </span>
                              <span className="tabular w-6 text-right">{r.dist[k - 1]}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              {escolhas.slice(0, Math.max(1, 3 - numericos.length)).map((c) => {
                const cont = (c.opcoes ?? []).map((o) => [o, f.respostas.filter((r) => r.valores[c.id] === o).length] as const).sort((a, b) => b[1] - a[1]);
                const max = Math.max(1, ...cont.map((x) => x[1]));
                return (
                  <div key={c.id} className="rounded-3xl border border-linha bg-forno p-5">
                    <p className="text-[13px] text-areia">{c.rotulo}</p>
                    <div className="mt-3 space-y-2">
                      {cont.map(([o, n]) => (
                        <div key={o} className="text-[13px]">
                          <div className="flex justify-between">
                            <span>{o}</span>
                            <span className="tabular text-areia">{n}</span>
                          </div>
                          <span className="mt-1 block h-1.5 rounded-full bg-brasa" style={{ width: `${(n / max) * 100}%` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {f.confirmar && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar respostas">
              {(
                [
                  ["nova", `Para confirmar (${novas})`],
                  ["confirmada", `Confirmadas (${f.respostas.filter((r) => r.situacao === "confirmada").length})`],
                  ["recusada", `Recusadas (${f.respostas.filter((r) => r.situacao === "recusada").length})`],
                  ["todas", `Todas (${f.respostas.length})`],
                ] as const
              ).map(([v, r]) => (
                <button key={v} onClick={() => setFiltro(v)} aria-pressed={filtro === v} className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${filtro === v ? "bg-papel text-carvao" : "border border-linha text-areia hover:text-papel"}`}>
                  {r}
                </button>
              ))}
            </div>
          )}
          <div className="overflow-x-auto rounded-3xl border border-linha bg-forno">
            <table className="w-full min-w-[640px] text-[14px]">
              <thead>
                <tr className="border-b border-linha text-left text-[12px] text-areia">
                  <th className="px-4 py-3 font-medium">Quem</th>
                  {f.campos
                    .filter((c) => c.tipo !== "nome")
                    .slice(0, 5)
                    .map((c) => (
                      <th key={c.id} className="px-4 py-3 font-medium">
                        {c.rotulo}
                      </th>
                    ))}
                  <th className="px-4 py-3 font-medium">Quando</th>
                  {f.confirmar && <th className="px-4 py-3 font-medium">Situação</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-linha">
                {lista.slice(0, 60).map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-semibold">
                      {r.cliente}
                      {r.origem === "equipe" && <span className="block text-[11px] font-normal text-areia">preenchido pela equipe</span>}
                    </td>
                    {f.campos
                      .filter((c) => c.tipo !== "nome")
                      .slice(0, 5)
                      .map((c) => {
                        const v = r.valores[c.id];
                        return (
                          <td key={c.id} className={`px-4 py-3 ${c.tipo === "estrelas" && Number(v) <= 3 ? "font-semibold text-tomate" : ""}`}>
                            {v === undefined || v === "" ? <span className="text-fumo">—</span> : mostrar(c, v)}
                          </td>
                        );
                      })}
                    <td className="whitespace-nowrap px-4 py-3 text-areia">{quandoTxt(r.quando)}</td>
                    {f.confirmar && (
                      <td className="whitespace-nowrap px-4 py-3">
                        {r.situacao === "confirmada" || r.situacao === "recusada" ? (
                          <span className="flex items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${r.situacao === "confirmada" ? "bg-[#e2f2ea] text-[#1b6149]" : "bg-[#fbe4e0] text-[#8e2f2a]"}`}>{r.situacao === "confirmada" ? "Confirmada" : "Recusada"}</span>
                            {linkAviso(f, r, d.loja.nome, r.situacao === "confirmada") && (
                              <a href={linkAviso(f, r, d.loja.nome, r.situacao === "confirmada")!} target="_blank" rel="noreferrer" aria-label={`Avisar ${r.cliente} no WhatsApp`} className="rounded-full p-1.5 text-areia hover:bg-grafite hover:text-papel">
                                <MessageCircle className="h-4 w-4" />
                              </a>
                            )}
                            <button onClick={() => decidir(r, "nova")} className="text-[12px] text-fumo hover:text-papel">
                              desfazer
                            </button>
                          </span>
                        ) : (
                          <span className="flex gap-1.5">
                            <button onClick={() => decidir(r, "confirmada")} className="flex items-center gap-1 rounded-full bg-manjericao px-3 py-1.5 text-[12px] font-bold text-carvao hover:opacity-90">
                              <Check className="h-3.5 w-3.5" /> Dar ok
                            </button>
                            <button onClick={() => decidir(r, "recusada")} className="rounded-full border border-linha px-3 py-1.5 text-[12px] font-semibold text-areia hover:text-papel">
                              Recusar
                            </button>
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {f.respostas.length === 0 && <p className="p-8 text-center text-areia">Ainda sem respostas. Compartilhe o link, mande para um cliente ou toque em Preencher pelo cliente.</p>}
            {f.respostas.length > 0 && lista.length === 0 && <p className="p-8 text-center text-areia">{filtro === "nova" ? "Nada para confirmar agora." : "Nenhuma resposta aqui."}</p>}
          </div>
        </div>
      )}

      {aba === "perguntas" && (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
          <ul className="space-y-3">
            {f.campos.map((c, i) => (
              <li key={c.id} className="rounded-3xl border border-linha bg-forno p-4">
                <div className="flex items-start gap-3">
                  <span className="tabular mt-2 text-[13px] text-fumo">{i + 1}</span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <input value={c.rotulo} onChange={(e) => setCampo(c.id, { rotulo: e.target.value })} aria-label="Pergunta" className="w-full rounded-xl border border-linha bg-carvao px-3 py-2 text-[15px] font-semibold" />
                    <div className="flex flex-wrap items-center gap-3">
                      <select value={c.tipo} onChange={(e) => setCampo(c.id, { tipo: e.target.value as TipoCampo, opcoes: e.target.value === "escolha" ? (c.opcoes ?? ["Opção 1", "Opção 2"]) : c.opcoes })} aria-label="Tipo de resposta" className="rounded-xl border border-linha bg-carvao px-3 py-2 text-[14px]">
                        {TIPOS.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.rotulo}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2 text-[13px] text-areia">
                        <input type="checkbox" checked={!!c.obrigatorio} onChange={(e) => setCampo(c.id, { obrigatorio: e.target.checked })} className="accent-[#ff5b1f]" /> Obrigatória
                      </label>
                    </div>
                    {c.tipo === "escolha" && (
                      <input
                        value={(c.opcoes ?? []).join(", ")}
                        onChange={(e) =>
                          setCampo(c.id, {
                            opcoes: e.target.value
                              .split(",")
                              .map((x) => x.trim())
                              .filter(Boolean),
                          })
                        }
                        aria-label="Opções separadas por vírgula"
                        placeholder="Opções separadas por vírgula"
                        className="w-full rounded-xl border border-linha bg-carvao px-3 py-2 text-[14px] text-areia"
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => mover(i, -1)} aria-label="Subir pergunta" className="rounded-lg p-1.5 text-areia hover:bg-grafite">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button onClick={() => mover(i, 1)} aria-label="Descer pergunta" className="rounded-lg p-1.5 text-areia hover:bg-grafite">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button onClick={() => crescer.setForm(f.id, (x) => ({ ...x, campos: x.campos.filter((y) => y.id !== c.id) }))} aria-label="Apagar pergunta" className="rounded-lg p-1.5 text-areia hover:bg-grafite hover:text-tomate">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
            <li>
              <button
                onClick={() => crescer.setForm(f.id, (x) => ({ ...x, campos: [...x.campos, { id: Math.random().toString(36).slice(2, 8), rotulo: "Nova pergunta", tipo: "texto" }] }))}
                className="flex w-full items-center justify-center gap-2 rounded-3xl border border-dashed border-linha py-4 text-[14px] font-semibold text-areia hover:border-areia hover:text-papel"
              >
                <Plus className="h-4 w-4" /> Adicionar pergunta
              </button>
            </li>
          </ul>
          <div className="space-y-3 rounded-3xl border border-linha bg-forno p-5">
            <label className="flex items-start gap-3 rounded-xl bg-grafite px-3 py-2.5 text-[14px]">
              <input type="checkbox" checked={!!f.confirmar} onChange={(e) => set({ confirmar: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[#ff5b1f]" />
              <span>
                <b>Respostas precisam do meu ok</b>
                <span className="block text-[12px] text-areia">Para reserva, aniversário e evento. Cada resposta chega para você confirmar ou recusar, e o aviso sai pelo WhatsApp.</span>
              </span>
            </label>
            <label className="block text-[13px] text-areia">
              Mensagem depois de enviar
              <textarea value={f.obrigado} onChange={(e) => set({ obrigado: e.target.value })} rows={3} className="mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2 text-[15px] text-papel" />
            </label>
            <p className="text-[13px] text-areia">Cor do formulário</p>
            <div className="flex gap-2">
              {["#ff5b1f", "#ffc03a", "#49c27e", "#2f7d77", "#f0524a"].map((c) => (
                <button key={c} onClick={() => set({ cor: c })} aria-label={`Cor ${c}`} className={`h-9 w-9 rounded-full ${f.cor === c ? "ring-2 ring-papel ring-offset-2 ring-offset-forno" : ""}`} style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {aba === "compartilhar" && (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <MandarParaCliente f={f} aviso={show} />
          <div className="rounded-3xl border border-linha bg-forno p-5">
            <h3 className="font-display text-[18px] font-bold">Link do formulário</h3>
            <div className="mt-3 flex gap-2">
              <span className="min-w-0 flex-1 truncate rounded-xl bg-carvao px-3 py-2.5 text-[15px]">{link}</span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(link).catch(() => {});
                  show("Link copiado");
                }}
                className="flex items-center gap-2 rounded-xl bg-papel px-4 text-[14px] font-semibold text-carvao"
              >
                <Copy className="h-4 w-4" /> Copiar
              </button>
            </div>
            {f.estado !== "no ar" && <p className="mt-3 rounded-xl bg-[#fcefd9] px-3 py-2 text-[13px] font-semibold text-[#7a4600]">Este formulário não está no ar. O link só abre para o cliente depois de “Colocar no ar”.</p>}
            <ul className="mt-4 space-y-2 text-[14px] text-areia">
              <li>• Na bio do Instagram, pela página de links</li>
              <li>• No WhatsApp, pelas automações</li>
              <li>• Impresso na mesa e na embalagem, com o QR code</li>
            </ul>
          </div>
          <div className="flex items-center gap-5 rounded-3xl border border-linha bg-forno p-5">
            {qr ? <img src={qr} alt="QR code do formulário" className="h-36 w-36 shrink-0 rounded-xl" /> : <div className="h-36 w-36 shrink-0 rounded-xl bg-grafite" />}
            <div>
              <h3 className="font-display text-[18px] font-bold">QR code para a mesa</h3>
              <p className="mt-1 text-[14px] text-areia">Imprima e cole na mesa, no balcão ou no adesivo da embalagem.</p>
              <a href={qr} download={`qr-${f.nome.replace(/[^\w-]+/g, "-").toLowerCase()}.png`} className="mt-3 inline-block rounded-xl border border-linha px-4 py-2 text-[14px] font-semibold hover:border-areia">
                Baixar QR code
              </a>
            </div>
          </div>
        </div>
      )}
      {preencher && (
        <PreencherEquipe
          f={f}
          fechar={() => setPreencher(false)}
          aoSalvar={(nome) => {
            setPreencher(false);
            setAba("respostas");
            setFiltro(f.confirmar ? "confirmada" : "todas");
            show(`Salvo: ${nome}`);
          }}
        />
      )}
      <Toast />
    </div>
  );
}

export function Formularios() {
  const forms = useCrescer((s) => s.forms);
  const [aberto, setAberto] = useState<string | null>(null);
  const f = forms.find((x) => x.id === aberto);
  const total = useMemo(() => forms.reduce((s, x) => s + x.respostas.length, 0), [forms]);
  if (f) return <Abrir f={f} voltar={() => setAberto(null)} />;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Formulários</h1>
          <p className="max-w-[620px] text-[15px] text-areia">Pesquisa depois do pedido, reserva de mesa e cadastro no clube. Cada resposta entra direto na ficha do freguês. {total} respostas até agora.</p>
        </div>
        <button onClick={() => setAberto(crescer.novoForm())} className="flex items-center gap-2 rounded-full bg-brasa px-5 py-3 text-[15px] font-semibold text-carvao hover:bg-mostarda">
          <Plus className="h-4 w-4" /> Novo formulário
        </button>
      </div>
      <ul className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {forms.map((x) => {
          const est = x.campos.find((c) => c.tipo === "estrelas");
          const r = est ? resumoNumerico(x, est) : null;
          return (
            <li key={x.id}>
              <button onClick={() => setAberto(x.id)} className="flex h-full w-full flex-col rounded-3xl border border-linha bg-forno p-5 text-left transition hover:border-areia">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl text-carvao" style={{ background: x.cor }}>
                    <ClipboardList className="h-5 w-5" />
                  </span>
                  <span className="flex items-center gap-1.5">
                    {x.confirmar && x.respostas.some((r) => r.situacao === "nova") && <span className="rounded-full bg-brasa px-2.5 py-1 text-[12px] font-bold text-carvao">{x.respostas.filter((r) => r.situacao === "nova").length} para confirmar</span>}
                    <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold capitalize ${ESTADO[x.estado]}`}>{x.estado}</span>
                  </span>
                </div>
                <p className="mt-4 font-display text-[20px] font-bold">{x.nome}</p>
                <p className="mt-1 flex-1 text-[14px] text-areia">{x.descricao}</p>
                <div className="mt-4 flex gap-5 text-[13px] text-areia">
                  <span>
                    <b className="tabular text-[18px] text-papel">{x.respostas.length}</b> respostas
                  </span>
                  <span>
                    <b className="tabular text-[18px] text-papel">{x.campos.length}</b> perguntas
                  </span>
                  {r && (
                    <span>
                      <b className="tabular text-[18px] text-mostarda">{r.media.toFixed(1).replace(".", ",")}★</b> média
                    </span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
