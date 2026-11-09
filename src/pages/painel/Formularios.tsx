import { useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, ClipboardList, Copy, ExternalLink, Plus, Star, Trash2 } from "lucide-react";
import { crescer, quandoTxt, useCrescer, type Campo, type Formulario, type TipoCampo } from "../../data/crescer";
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
  "no ar": "bg-[#17351f] text-[#9be3b0]",
  pausado: "bg-grafite text-areia",
  rascunho: "bg-[#46320f] text-[#ffd08a]",
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
  const link = `fregues.app/brasa/f/${f.id}`;

  return (
    <div>
      <button onClick={voltar} className="mb-3 flex items-center gap-1 text-[14px] text-areia hover:text-papel">
        <ArrowLeft className="h-4 w-4" /> Formulários
      </button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <input value={f.nome} onChange={(e) => set({ nome: e.target.value })} aria-label="Nome do formulário" className="w-full bg-transparent font-display text-[clamp(1.6rem,3vw,2.3rem)] font-extrabold tracking-[-0.02em] outline-none focus:underline" />
          <input value={f.descricao} onChange={(e) => set({ descricao: e.target.value })} placeholder="Para que serve este formulário?" aria-label="Descrição" className="w-full bg-transparent text-[15px] text-areia outline-none" />
        </div>
        <div className="flex gap-2">
          <a
            href="#pesquisa"
            onClick={() => crescer.abrirPublico(f.id)}
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
            ["respostas", `Respostas (${f.respostas.length})`],
            ["perguntas", `Perguntas (${f.campos.length})`],
            ["compartilhar", "Compartilhar"],
          ] as const
        ).map(([v, r]) => (
          <button key={v} role="tab" aria-selected={aba === v} onClick={() => setAba(v)} className={`-mb-px border-b-2 px-4 py-2.5 text-[14px] font-semibold ${aba === v ? "border-brasa text-papel" : "border-transparent text-areia hover:text-papel"}`}>
            {r}
          </button>
        ))}
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
          <div className="overflow-x-auto rounded-3xl border border-linha bg-forno">
            <table className="w-full min-w-[640px] text-[14px]">
              <thead>
                <tr className="border-b border-linha text-left text-[12px] text-areia">
                  <th className="px-4 py-3 font-medium">Quem</th>
                  {f.campos.filter((c) => c.tipo !== "nome").slice(0, 5).map((c) => (
                    <th key={c.id} className="px-4 py-3 font-medium">
                      {c.rotulo}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium">Quando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linha">
                {f.respostas.slice(0, 30).map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-semibold">{r.cliente}</td>
                    {f.campos.filter((c) => c.tipo !== "nome").slice(0, 5).map((c) => {
                      const v = r.valores[c.id];
                      return (
                        <td key={c.id} className={`px-4 py-3 ${c.tipo === "estrelas" && Number(v) <= 3 ? "font-semibold text-tomate" : ""}`}>
                          {v === undefined || v === "" ? <span className="text-fumo">—</span> : c.tipo === "estrelas" ? `${"★".repeat(Number(v))}` : String(v)}
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap px-4 py-3 text-areia">{quandoTxt(r.quando)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {f.respostas.length === 0 && <p className="p-8 text-center text-areia">Ainda sem respostas. Compartilhe o link ou coloque o QR code na mesa.</p>}
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
                      <input value={(c.opcoes ?? []).join(", ")} onChange={(e) => setCampo(c.id, { opcoes: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} aria-label="Opções separadas por vírgula" placeholder="Opções separadas por vírgula" className="w-full rounded-xl border border-linha bg-carvao px-3 py-2 text-[14px] text-areia" />
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
              <button onClick={() => crescer.setForm(f.id, (x) => ({ ...x, campos: [...x.campos, { id: Math.random().toString(36).slice(2, 8), rotulo: "Nova pergunta", tipo: "texto" }] }))} className="flex w-full items-center justify-center gap-2 rounded-3xl border border-dashed border-linha py-4 text-[14px] font-semibold text-areia hover:border-areia hover:text-papel">
                <Plus className="h-4 w-4" /> Adicionar pergunta
              </button>
            </li>
          </ul>
          <div className="space-y-3 rounded-3xl border border-linha bg-forno p-5">
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
          <div className="rounded-3xl border border-linha bg-forno p-5">
            <h3 className="font-display text-[18px] font-bold">Link do formulário</h3>
            <div className="mt-3 flex gap-2">
              <span className="min-w-0 flex-1 truncate rounded-xl bg-carvao px-3 py-2.5 text-[15px]">{link}</span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(`https://${link}`).catch(() => {});
                  show("Link copiado");
                }}
                className="flex items-center gap-2 rounded-xl bg-papel px-4 text-[14px] font-semibold text-carvao"
              >
                <Copy className="h-4 w-4" /> Copiar
              </button>
            </div>
            <ul className="mt-4 space-y-2 text-[14px] text-areia">
              <li>• Na bio do Instagram, pela página de links</li>
              <li>• No WhatsApp, pelas automações</li>
              <li>• Impresso na mesa e na embalagem, com o QR code</li>
            </ul>
          </div>
          <div className="flex items-center gap-5 rounded-3xl border border-linha bg-forno p-5">
            <div className="grid h-36 w-36 shrink-0 grid-cols-9 gap-0.5 rounded-xl bg-papel p-2" aria-label="QR code do formulário" role="img">
              {Array.from({ length: 81 }, (_, i) => {
                const x = i % 9;
                const y = Math.floor(i / 9);
                const canto = (x < 3 && y < 3) || (x > 5 && y < 3) || (x < 3 && y > 5);
                const on = canto ? !(x % 6 === 1 && y % 6 === 1) : (x * 7 + y * 13 + f.id.length) % 3 === 0;
                return <span key={i} className={on ? "bg-carvao" : ""} />;
              })}
            </div>
            <div>
              <h3 className="font-display text-[18px] font-bold">QR code para a mesa</h3>
              <p className="mt-1 text-[14px] text-areia">Imprima e cole na mesa, no balcão ou no adesivo da embalagem.</p>
              <button onClick={() => show("QR code baixado")} className="mt-3 rounded-xl border border-linha px-4 py-2 text-[14px] font-semibold hover:border-areia">
                Baixar QR code
              </button>
            </div>
          </div>
        </div>
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
          <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.02em]">Formulários</h1>
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
                  <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold capitalize ${ESTADO[x.estado]}`}>{x.estado}</span>
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
