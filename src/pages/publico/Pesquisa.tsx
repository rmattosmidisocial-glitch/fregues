import { useEffect, useState } from "react";
import { SLUG, supabase } from "../../data/dados";
import { ArrowLeft, Check, Star } from "lucide-react";
import { crescer, useCrescer, type Formulario } from "../../data/crescer";
import { Brasinha } from "../../components/Logo";
import { FOTOS } from "../../components/Foto";

const idDaUrl = () => {
  try {
    return new URLSearchParams(location.search).get("f");
  } catch {
    return null;
  }
};

export function Pesquisa() {
  const forms = useCrescer((s) => s.forms);
  const id = useCrescer((s) => s.formPublico);
  const fid = idDaUrl();
  const real = !!supabase && !!fid;
  const [remoto, setRemoto] = useState<(Formulario & { loja: string }) | null | "erro">(null);
  const f = real ? (remoto && remoto !== "erro" ? remoto : null) : (forms.find((x) => x.id === id) ?? forms[0]);
  const lojaNome = real && remoto && remoto !== "erro" ? remoto.loja : "Brasa Burger";
  const [v, setV] = useState<Record<string, string | number>>({});
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    if (!real) return;
    supabase!.rpc("form_publico", { p_slug: SLUG, p_id: fid }).then(({ data }) => setRemoto(data ? ({ ...(data as object), respostas: [], estado: "no ar" } as unknown as Formulario & { loja: string }) : "erro"));
  }, [real, fid]);

  if (real && remoto === "erro")
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6ecdf] p-6 text-center text-carvao">
        <div>
          <p className="font-display text-[24px] font-bold">Este formulário não está disponível</p>
          <p className="mt-2 text-[#8f7b6c]">Ele pode ter sido pausado pela loja.</p>
          <a href="#loja" className="mt-5 inline-block rounded-full bg-carvao px-6 py-3 font-semibold text-papel">
            Ver o cardápio
          </a>
        </div>
      </div>
    );
  if (!f) return <div className="grid min-h-screen place-items-center bg-[#f6ecdf] text-[#8f7b6c]">Carregando…</div>;

  async function enviar() {
    if (!f) return;
    setErro("");
    const falta = f.campos.find((c) => c.obrigatorio && (v[c.id] === undefined || v[c.id] === ""));
    if (falta) {
      setErro(`Falta responder: ${falta.rotulo}`);
      document.getElementById(`campo-${falta.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (real) {
      setEnviando(true);
      const { error } = await supabase!.rpc("form_responder", { p_slug: SLUG, p_id: f.id, p_valores: v });
      setEnviando(false);
      if (error) return setErro(error.message);
    } else crescer.responderForm(f.id, v);
    setEnviado(true);
  }

  const inp = "mt-2 w-full rounded-2xl border border-[#e3d3bf] bg-white px-4 py-3 text-[16px] outline-none focus:border-carvao";

  return (
    <div className="min-h-screen bg-[#f6ecdf] text-carvao">
      <div className="mx-auto min-h-screen max-w-[480px] bg-[#fffaf2] pb-16">
        <div className="flex items-center justify-between bg-carvao px-4 py-2 text-[12px] text-areia">
          {real ? (
            <span>{lojaNome}</span>
          ) : (
            <a href="#formularios" className="flex items-center gap-1 hover:text-papel">
              <ArrowLeft className="h-3.5 w-3.5" /> Painel do dono
            </a>
          )}
          <span className="flex items-center gap-1.5">
            Feito com <Brasinha className="h-4 w-4" /> freguês
          </span>
        </div>
        <header className="relative overflow-hidden px-5 pb-6 pt-20 text-papel">
          <img src={FOTOS.grelha} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-carvao via-carvao/75 to-carvao/20" />
          <div className="relative">
            <p className="text-[13px] font-semibold uppercase tracking-[0.1em]" style={{ color: f.cor }}>
              {lojaNome}
            </p>
            <h1 className="mt-1 font-display text-[34px] font-extrabold leading-tight tracking-[-0.015em]">{f.nome}</h1>
            {f.descricao && !enviado && <p className="mt-1 text-[14px] text-areia">Leva menos de 1 minuto.</p>}
          </div>
        </header>

        {enviado ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full text-carvao" style={{ background: f.cor }}>
              <Check className="h-8 w-8" />
            </span>
            <p className="mt-5 font-display text-[24px] font-bold leading-snug">{f.obrigado}</p>
            <a href={real ? `?r=${encodeURIComponent(SLUG)}#loja` : "#loja"} className="mt-6 inline-block rounded-full bg-carvao px-6 py-3 font-semibold text-papel">
              Ver o cardápio
            </a>
            <button
              onClick={() => {
                setV({});
                setEnviado(false);
              }}
              className="mt-3 block w-full text-[14px] text-[#8f7b6c] underline"
            >
              Responder de novo
            </button>
          </div>
        ) : (
          <div className="space-y-6 px-5 py-6">
            {f.campos.map((c) => (
              <div key={c.id} id={`campo-${c.id}`}>
                <p className="text-[17px] font-semibold">
                  {c.rotulo}
                  {c.obrigatorio && <span style={{ color: f.cor }}> *</span>}
                </p>
                {c.tipo === "estrelas" && (
                  <div className="mt-2 flex gap-1" role="radiogroup" aria-label={c.rotulo}>
                    {[1, 2, 3, 4, 5].map((k) => (
                      <button key={k} role="radio" aria-checked={v[c.id] === k} aria-label={`${k} estrelas`} onClick={() => setV({ ...v, [c.id]: k })} className="p-1">
                        <Star className={`h-10 w-10 ${Number(v[c.id] ?? 0) >= k ? "fill-mostarda text-mostarda" : "text-[#d8c7b2]"}`} />
                      </button>
                    ))}
                  </div>
                )}
                {c.tipo === "nps" && (
                  <div className="mt-2">
                    <div className="grid grid-cols-11 gap-1" role="radiogroup" aria-label={c.rotulo}>
                      {Array.from({ length: 11 }, (_, k) => (
                        <button
                          key={k}
                          role="radio"
                          aria-checked={v[c.id] === k}
                          onClick={() => setV({ ...v, [c.id]: k })}
                          className={`tabular rounded-lg py-2.5 text-[14px] font-semibold ${v[c.id] === k ? "text-carvao" : "bg-[#efe3d3]"}`}
                          style={v[c.id] === k ? { background: f.cor } : undefined}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                    <div className="mt-1 flex justify-between text-[12px] text-[#8f7b6c]">
                      <span>Nem pensar</span>
                      <span>Com certeza</span>
                    </div>
                  </div>
                )}
                {c.tipo === "escolha" && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(c.opcoes ?? []).map((o) => (
                      <button key={o} onClick={() => setV({ ...v, [c.id]: o })} aria-pressed={v[c.id] === o} className={`rounded-full border px-4 py-2 text-[14px] font-semibold ${v[c.id] === o ? "border-carvao bg-carvao text-papel" : "border-[#e3d3bf]"}`}>
                        {o}
                      </button>
                    ))}
                  </div>
                )}
                {c.tipo === "texto" && <textarea rows={3} value={String(v[c.id] ?? "")} onChange={(e) => setV({ ...v, [c.id]: e.target.value })} aria-label={c.rotulo} className={inp} />}
                {c.tipo === "nome" && <input value={String(v[c.id] ?? "")} onChange={(e) => setV({ ...v, [c.id]: e.target.value })} aria-label={c.rotulo} autoComplete="name" className={inp} />}
                {c.tipo === "telefone" && <input type="tel" inputMode="tel" placeholder="(21) 9____-____" value={String(v[c.id] ?? "")} onChange={(e) => setV({ ...v, [c.id]: e.target.value })} aria-label={c.rotulo} className={inp} />}
                {c.tipo === "data" && <input type="date" value={String(v[c.id] ?? "")} onChange={(e) => setV({ ...v, [c.id]: e.target.value })} aria-label={c.rotulo} className={inp} />}
                {c.tipo === "hora" && <input type="time" value={String(v[c.id] ?? "")} onChange={(e) => setV({ ...v, [c.id]: e.target.value })} aria-label={c.rotulo} className={inp} />}
                {c.tipo === "numero" && <input type="number" inputMode="numeric" min={0} value={String(v[c.id] ?? "")} onChange={(e) => setV({ ...v, [c.id]: e.target.value === "" ? "" : Number(e.target.value) })} aria-label={c.rotulo} className={inp} />}
              </div>
            ))}
            {erro && <p className="rounded-2xl bg-[#ffe1d6] p-3 text-[14px] font-semibold text-[#9a2a10]">{erro}</p>}
            <button onClick={enviar} disabled={enviando} className="w-full rounded-full py-4 text-[16px] font-bold text-carvao disabled:opacity-60" style={{ background: f.cor }}>
              {enviando ? "Enviando…" : "Enviar"}
            </button>
            <p className="text-center text-[12px] text-[#8f7b6c]">Suas respostas vão só para a {lojaNome}.</p>
          </div>
        )}
      </div>
    </div>
  );
}
