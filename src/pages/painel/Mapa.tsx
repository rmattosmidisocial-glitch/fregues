import { useEffect, useMemo, useState } from "react";
import { geoContains, type GeoPermissibleObjects } from "d3-geo";
import { ArrowLeft, Check, ChevronRight, Flame, Layers, MapPin, Plus, Search, Trash2, Users } from "lucide-react";
import {
  BAIRROS,
  MUNICIPIOS_COM_BAIRROS,
  MUNICIPIOS_RJ,
  GeoMap,
  bairrosDoMunicipio,
  centroide,
  nomeBairro,
  vizinhos,
  type Feature,
  type Layer,
} from "../../components/GeoMap";
import { brl, type Zona } from "../../data/mock";
import { SLUG, useDados, type Entrega, type Lead } from "../../data/dados";
import { buscarCep, localizar } from "../../data/endereco";
import { useToast } from "../../components/ui";

const NOMES_MUN = MUNICIPIOS_RJ.map((m) => m.properties.nome).sort((a, b) => a.localeCompare(b, "pt-BR"));
const COD_MUN: Record<string, string> = Object.fromEntries(MUNICIPIOS_RJ.map((m) => [m.properties.nome, m.properties.id]));

export function MapaAtuacao() {
  const d = useDados();
  const zonas = d.zonas;
  const DEMANDA = d.demanda;
  const LOJA = d.loja;
  const [mun, setMun] = useState<string | null>(LOJA.cidade || "Rio de Janeiro");
  // abre o mapa na cidade do restaurante
  useEffect(() => {
    if (LOJA.cidade) setMun(LOJA.cidade);
  }, [LOJA.cidade]);
  const [sel, setSel] = useState<Feature | null>(null);
  const [calor, setCalor] = useState(true);
  const [demanda, setDemanda] = useState(true);
  const [hover, setHover] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [verTudo, setVerTudo] = useState(false);
  const { show, Toast } = useToast();

  const zonaDoBairro = (id: string) => zonas.find((z) => z.bairros.includes(id));
  const zonaDoMun = (nome: string) => zonas.find((z) => z.municipios?.includes(COD_MUN[nome]));
  const ativos = zonas.reduce((s, z) => s + z.bairros.length, 0);
  const munInteiros = zonas.reduce((s, z) => s + (z.municipios?.length ?? 0), 0);

  const ativosPorMun = useMemo(() => {
    const c: Record<string, number> = {};
    for (const z of zonas) for (const id of z.bairros) {
      const b = BAIRROS.find((x) => x.properties.id === id);
      if (b?.properties.municipio) c[b.properties.municipio] = (c[b.properties.municipio] ?? 0) + 1;
    }
    return c;
  }, [zonas]);

  const doMun = useMemo(() => (mun ? bairrosDoMunicipio(mun) : []), [mun]);
  const temBairros = !!mun && MUNICIPIOS_COM_BAIRROS.has(mun);
  const munFeature = mun ? MUNICIPIOS_RJ.find((m) => m.properties.nome === mun) : undefined;

  const heat = useMemo(() => {
    if (!mun) return [];
    const cont: Record<string, number> = {};
    for (const f of d.fregueses) if (f.bairroId) cont[f.bairroId] = (cont[f.bairroId] ?? 0) + 1;
    const max = Math.max(1, ...Object.values(cont));
    return doMun.filter((b) => cont[b.properties.id]).map((b) => ({ coord: centroide(b), w: cont[b.properties.id] / max }));
  }, [d.fregueses, doMun, mun]);

  const focoAtivo = useMemo(() => {
    const alvo = doMun.filter((b) => zonaDoBairro(b.properties.id) || DEMANDA[b.properties.id]);
    return alvo.length >= 3 && alvo.length < doMun.length * 0.6 ? vizinhos(alvo, 0.08).filter((b) => b.properties.municipio === mun) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doMun, mun]);
  const fitAtual = !mun ? MUNICIPIOS_RJ : temBairros ? (!verTudo && focoAtivo ? focoAtivo : doMun) : munFeature ? [munFeature] : MUNICIPIOS_RJ;
  const labels = useMemo(() => {
    if (!mun) {
      return MUNICIPIOS_RJ.filter((m) => ativosPorMun[m.properties.nome] || zonaDoMun(m.properties.nome)).map((m) => ({ coord: centroide(m), text: m.properties.nome, forte: true }));
    }
    if (!temBairros) return [];
    const fs = fitAtual as Feature[];
    const escolhidos = fs.length > 40 ? fs.filter((b) => zonaDoBairro(b.properties.id) || DEMANDA[b.properties.id]) : fs;
    return escolhidos.map((b) => ({ coord: centroide(b), text: b.properties.nome }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mun, temBairros, fitAtual, ativosPorMun, zonas, DEMANDA]);

  const contexto = useMemo(() => (temBairros ? vizinhos(doMun, 0.12).filter((b) => b.properties.municipio !== mun) : []), [doMun, temBairros, mun]);

  const layers: Layer[] = useMemo(() => {
    if (!mun) {
      return [
        {
          id: "mun",
          features: MUNICIPIOS_RJ,
          interactive: true,
          fill: (f, h) => {
            const z = zonaDoMun(f.properties.nome);
            if (z) return z.cor;
            if (ativosPorMun[f.properties.nome]) return h ? "#ff7a45" : "#ff5b1f";
            const tem = MUNICIPIOS_COM_BAIRROS.has(f.properties.nome);
            return h ? "#5a4636" : tem ? "#3d2f27" : "#1f1814";
          },
          stroke: () => "#17110e",
          strokeWidth: 0.8,
        },
      ];
    }
    if (!temBairros && munFeature) {
      return [
        { id: "ctx", features: MUNICIPIOS_RJ.filter((m) => m !== munFeature), fill: () => "#1c1512", stroke: () => "#2a201a", strokeWidth: 0.6 },
        {
          id: "mun1",
          features: [munFeature],
          interactive: true,
          fill: (f, h) => zonaDoMun(f.properties.nome)?.cor ?? (h ? "#3d2f27" : "#2a201a"),
          stroke: () => "#fff6e9",
          strokeWidth: 1.2,
        },
      ];
    }
    return [
      { id: "ctx", features: contexto, fill: () => "#1c1512", stroke: () => "#2a201a", strokeWidth: 0.5 },
      {
        id: "bairros",
        features: doMun,
        interactive: true,
        fill: (f, h) => {
          const z = zonaDoBairro(f.properties.id);
          if (z) return z.cor;
          if (demanda && DEMANDA[f.properties.id]) return h ? "#5a4320" : "#3b2c17";
          return h ? "#3d2f27" : "#2a201a";
        },
        opacity: (f) => (zonaDoBairro(f.properties.id) ? 0.92 : 1),
        stroke: (f) =>
          sel?.properties.id === f.properties.id ? "#fff6e9" : demanda && DEMANDA[f.properties.id] && !zonaDoBairro(f.properties.id) ? "#ffc03a" : "#17110e",
        strokeWidth: 1,
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mun, zonas, sel, demanda, DEMANDA, doMun, contexto, temBairros, munFeature, ativosPorMun]);

  function abrirMun(nome: string) {
    setMun(nome);
    setSel(null);
    setBusca("");
    setVerTudo(false);
  }

  function moverBairro(f: Feature, destino: string | null) {
    d.acoes.moverBairro(f.properties.id, destino);
    const nome = f.properties.nome;
    if (destino) {
      const q = DEMANDA[f.properties.id];
      show(q ? `${nome} ativado. Avise no WhatsApp quem pediu (lista ao lado)` : `${nome} agora faz parte da zona ${zonas.find((z) => z.id === destino)?.nome}`);
    } else show(`${nome} removido da área de entrega`);
  }

  function atenderTodos(destino: string | null) {
    for (const b of doMun) {
      const atual = zonaDoBairro(b.properties.id);
      if (destino && !atual) d.acoes.moverBairro(b.properties.id, destino);
      if (!destino && atual) d.acoes.moverBairro(b.properties.id, null);
    }
    show(destino ? `Todos os bairros de ${mun} entraram na zona ${zonas.find((z) => z.id === destino)?.nome}` : `Bairros de ${mun} removidos`);
  }

  const selZona = sel && sel.properties.mun !== undefined ? zonaDoBairro(sel.properties.id) : undefined;
  const sugestoes = busca.trim() ? NOMES_MUN.filter((n) => n.toLowerCase().includes(busca.trim().toLowerCase())).slice(0, 6) : [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Território</h1>
          <p className="text-[15px] text-areia">
            {ativos} bairros{munInteiros ? ` e ${munInteiros} municípios inteiros` : ""} em {zonas.length} zonas. Clique no município para abrir os bairros.
          </p>
        </div>
        <div className="relative w-full sm:w-[300px]">
          <label className="relative block">
            <span className="sr-only">Buscar município</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fumo" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sugestoes[0] && abrirMun(sugestoes[0])}
              placeholder="Buscar município do RJ"
              className="w-full rounded-full border border-linha bg-forno py-2.5 pl-9 pr-4 text-[15px] placeholder:text-fumo"
            />
          </label>
          {sugestoes.length > 0 && (
            <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-linha bg-forno shadow-2xl">
              {sugestoes.map((n) => (
                <li key={n}>
                  <button onClick={() => abrirMun(n)} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[15px] hover:bg-grafite">
                    {n}
                    <span className="text-[12px] text-areia">{MUNICIPIOS_COM_BAIRROS.has(n) ? `${bairrosDoMunicipio(n).length} bairros` : "sem bairros oficiais"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <nav className="mt-4 flex items-center gap-2 text-[15px]" aria-label="Navegação do mapa">
        <button onClick={() => (setMun(null), setSel(null))} className={`rounded-full px-3 py-1 font-semibold ${mun ? "text-areia hover:text-papel" : "bg-papel text-carvao"}`}>
          Estado do RJ
        </button>
        {mun && (
          <>
            <ChevronRight className="h-4 w-4 text-fumo" />
            <span className="rounded-full bg-papel px-3 py-1 font-semibold text-carvao">{mun}</span>
          </>
        )}
      </nav>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="relative self-start overflow-hidden rounded-3xl border border-linha bg-[#140f0c]">
          <GeoMap
            key={(mun ?? "estado") + (verTudo ? "-tudo" : "")}
            width={900}
            height={640}
            padding={24}
            fitTo={fitAtual}
            labels={labels}
            layers={layers}
            heat={mun && calor ? heat : []}
            pins={[{ coord: LOJA.coord, kind: "loja" }]}
            onClick={(f, layerId) => {
              if (layerId === "mun") abrirMun(f.properties.nome);
              else setSel(f);
            }}
            onHover={(f) => setHover(f ? f.properties.nome : null)}
            className="h-auto w-full"
            ariaLabel={mun ? `Mapa dos bairros de ${mun}` : "Mapa dos municípios do estado do Rio de Janeiro"}
          />
          <div className="pointer-events-none absolute left-4 top-4 max-w-[70%] rounded-xl bg-carvao/85 px-3 py-2 text-[14px] backdrop-blur" aria-live="polite">
            {hover ? (
              <b>{hover}</b>
            ) : mun ? (
              <span className="text-areia">{temBairros ? `${doMun.length} bairros oficiais · ${ativosPorMun[mun] ?? 0} atendidos` : "Sem bairros oficiais no IBGE"}</span>
            ) : (
              <span className="text-areia">Clique em um município</span>
            )}
          </div>
          {mun && (
            <div className="absolute right-4 top-4 flex gap-2">
              {temBairros && focoAtivo && (
                <button onClick={() => setVerTudo(!verTudo)} className="rounded-full bg-carvao/85 px-3 py-1.5 text-[13px] font-semibold text-papel backdrop-blur">
                  {verTudo ? "Focar na área atendida" : `Ver ${mun} inteiro`}
                </button>
              )}
              <button onClick={() => (setMun(null), setSel(null))} className="flex items-center gap-1.5 rounded-full bg-papel px-3 py-1.5 text-[13px] font-semibold text-carvao">
                <ArrowLeft className="h-4 w-4" /> Estado
              </button>
            </div>
          )}
          {mun && temBairros ? (
            <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 text-[13px]">
              <button onClick={() => setCalor(!calor)} aria-pressed={calor} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold ${calor ? "bg-papel text-carvao" : "bg-carvao/85 text-areia"}`}>
                <Flame className="h-4 w-4" /> Calor de pedidos
              </button>
              <button onClick={() => setDemanda(!demanda)} aria-pressed={demanda} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold ${demanda ? "bg-papel text-carvao" : "bg-carvao/85 text-areia"}`}>
                <Users className="h-4 w-4" /> Demanda fora da área
              </button>
            </div>
          ) : (
            !mun && (
              <div className="absolute bottom-4 left-4 flex flex-wrap gap-x-4 gap-y-1 rounded-xl bg-carvao/85 px-3 py-2 text-[12px] text-areia">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-brasa" /> Com bairros atendidos</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-linha bg-[#3d2f27]" /> Tem bairros oficiais</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-linha bg-[#1f1814]" /> Sem bairros oficiais</span>
              </div>
            )
          )}
          <p className="absolute bottom-4 right-4 hidden text-[11px] text-fumo sm:block">Limites: IBGE, Censo 2022</p>
        </div>

        <div className="space-y-4">
          {mun && temBairros && !sel && (
            <section className="rounded-3xl border border-linha bg-grafite p-5">
              <p className="text-[13px] text-areia">Município</p>
              <h2 className="font-display text-[26px] font-extrabold leading-tight">{mun}</h2>
              <p className="mt-1 text-[14px] text-areia">
                {doMun.length} bairros oficiais · {ativosPorMun[mun] ?? 0} atendidos. Clique em um bairro no mapa, ou ative todos de uma vez:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {zonas.map((z) => (
                  <button key={z.id} onClick={() => atenderTodos(z.id)} className="flex items-center gap-2 rounded-full bg-papel px-3 py-1.5 text-[13px] font-semibold text-carvao hover:bg-mostarda">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: z.cor }} /> Todos em {z.nome}
                  </button>
                ))}
              </div>
              {(ativosPorMun[mun] ?? 0) > 0 && (
                <button onClick={() => atenderTodos(null)} className="mt-3 text-[14px] font-semibold text-[#9b3530] hover:underline">
                  Parar de entregar em {mun}
                </button>
              )}
            </section>
          )}

          {mun && !temBairros && (
            <section className="rounded-3xl border border-linha bg-grafite p-5">
              <p className="text-[13px] text-areia">Município</p>
              <h2 className="font-display text-[26px] font-extrabold leading-tight">{mun}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-areia">
                A prefeitura de {mun} não tem bairros oficiais na base do IBGE. Você pode atender o município inteiro com uma única regra ou desenhar suas próprias zonas (em breve).
              </p>
              <p className="mt-4 text-[13px] text-areia">Atender o município inteiro na zona</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {zonas.map((z) => (
                  <button
                    key={z.id}
                    onClick={() => {
                      d.acoes.atenderMunicipio(COD_MUN[mun], z.id);
                      show(`${mun} inteiro na zona ${z.nome}`);
                    }}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold ${zonaDoMun(mun)?.id === z.id ? "bg-mostarda text-carvao" : "bg-papel text-carvao hover:bg-mostarda"}`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: z.cor }} /> {z.nome}
                  </button>
                ))}
              </div>
              {zonaDoMun(mun) && (
                <button
                  onClick={() => {
                    d.acoes.atenderMunicipio(COD_MUN[mun], null);
                    show(`${mun} desligado`);
                  }}
                  className="mt-4 text-[14px] font-semibold text-[#9b3530] hover:underline"
                >
                  Parar de atender {mun}
                </button>
              )}
            </section>
          )}

          {sel && sel.properties.mun !== undefined && (
            <section className="rounded-3xl border border-papel/30 bg-grafite p-5" aria-live="polite">
              <div className="flex items-start justify-between">
                <p className="text-[13px] text-areia">Bairro de {sel.properties.municipio}</p>
                <button onClick={() => setSel(null)} className="text-[13px] text-areia hover:text-papel">
                  Fechar
                </button>
              </div>
              <h2 className="font-display text-[26px] font-extrabold leading-tight">{sel.properties.nome}</h2>
              {selZona ? (
                <>
                  <p className="mt-1 text-[14px] text-areia">
                    Zona <b className="text-papel">{selZona.nome}</b> · {brl(selZona.taxa)} · {selZona.tempo[0]}–{selZona.tempo[1]} min
                  </p>
                  <p className="mt-4 text-[13px] text-areia">Mover para</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {zonas
                      .filter((z) => z.id !== selZona.id)
                      .map((z) => (
                        <button key={z.id} onClick={() => moverBairro(sel, z.id)} className="flex items-center gap-2 rounded-full border border-linha px-3 py-1.5 text-[13px] font-semibold hover:border-areia">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: z.cor }} /> {z.nome}
                        </button>
                      ))}
                  </div>
                  <button onClick={() => moverBairro(sel, null)} className="mt-4 text-[14px] font-semibold text-[#9b3530] hover:underline">
                    Parar de entregar aqui
                  </button>
                  <QuemPediu key={sel.properties.id} bairroId={sel.properties.id} bairro={sel.properties.nome} atende />
                </>
              ) : (
                <>
                  <p className="mt-1 text-[14px] text-areia">Fora da área de entrega.</p>
                  {DEMANDA[sel.properties.id] && (
                    <p className="mt-3 rounded-xl border border-dashed border-mostarda/60 p-3 text-[14px]">
                      <b className="text-mostarda">{DEMANDA[sel.properties.id]} {DEMANDA[sel.properties.id] === 1 ? "pessoa tentou" : "pessoas tentaram"}</b> pedir daqui nos últimos 30 dias. Ao ativar, você avisa cada uma no WhatsApp com um toque.
                    </p>
                  )}
                  <p className="mt-4 text-[13px] text-areia">Entregar aqui na zona</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {zonas.map((z) => (
                      <button key={z.id} onClick={() => moverBairro(sel, z.id)} className="flex items-center gap-2 rounded-full bg-papel px-3 py-1.5 text-[13px] font-semibold text-carvao hover:bg-mostarda">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: z.cor }} /> {z.nome}
                      </button>
                    ))}
                  </div>
                  <QuemPediu key={sel.properties.id} bairroId={sel.properties.id} bairro={sel.properties.nome} atende={false} />
                </>
              )}
            </section>
          )}

          <Zonas avisar={show} />
          <Simulador zonaDoBairro={zonaDoBairro} zonaDoMun={zonaDoMun} />
        </div>
      </div>
      <Toast />
    </div>
  );
}

const CORES = ["#ff5b1f", "#ffc03a", "#2f9e6a", "#3a7bd5", "#9b5de5", "#e0457b", "#8a6a4f"];
const num = (t: string) => {
  const v = Number(t.replace(",", "."));
  return Number.isFinite(v) && t.trim() !== "" ? v : NaN;
};
const dec = (n: number) => n.toFixed(2).replace(".", ",");
const campoZ = "tabular mt-1 w-full rounded-lg border border-linha bg-carvao px-2 py-1.5 text-[14px] text-papel";

function Zonas({ avisar }: { avisar: (t: string) => void }) {
  const d = useDados();
  const [nova, setNova] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  return (
    <section className="rounded-3xl border border-linha bg-forno p-5">
      <h2 className="flex items-center gap-2 font-display text-[20px] font-bold">
        <Layers className="h-5 w-5 text-brasa" /> Zonas e regras
      </h2>
      <p className="mt-1 text-[13px] text-areia">Cada zona tem sua taxa, tempo e pedido mínimo. Os bairros você pinta no mapa.</p>
      <div className="mt-3 space-y-3">
        {d.zonas.map((z) => (
          <ZonaCard key={z.id} id={z.id} avisar={avisar} setErro={setErro} />
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const cor = CORES.find((c) => !d.zonas.some((z) => z.cor.toLowerCase() === c)) ?? CORES[d.zonas.length % CORES.length];
          const r = await d.acoes.criarZona(nova, cor);
          if (r) setErro(r);
          else {
            avisar(`Zona ${nova.trim()} criada. Agora clique nos bairros do mapa para colocar nela`);
            setNova("");
            setErro(null);
          }
        }}
      >
        <input value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nova zona (ex.: Até 5 km)" aria-label="Nome da nova zona" className="min-w-0 flex-1 rounded-xl border border-linha bg-carvao px-3 py-2 text-[14px] text-papel" />
        <button className="flex shrink-0 items-center gap-1 rounded-xl bg-brasa px-3 text-[14px] font-semibold text-carvao">
          <Plus className="h-4 w-4" /> Zona
        </button>
      </form>
      {erro && <p className="mt-2 rounded-xl bg-[#fbe4e0] px-3 py-2 text-[13px] font-semibold text-[#8e2f2a]">{erro}</p>}
    </section>
  );
}

function ZonaCard({ id, avisar, setErro }: { id: string; avisar: (t: string) => void; setErro: (e: string | null) => void }) {
  const d = useDados();
  const z = d.zonas.find((x) => x.id === id)!;
  const [f, setF] = useState({
    nome: z.nome,
    taxa: dec(z.taxa),
    t0: String(z.tempo[0]),
    t1: String(z.tempo[1]),
    minimo: dec(z.minimo),
    gratis: z.gratisAcima != null ? dec(z.gratisAcima) : "",
  });
  const [apagar, setApagar] = useState(false);
  const qtd = z.bairros.length + (z.municipios?.length ?? 0);

  async function salvar(campo: keyof typeof f) {
    const v = f[campo];
    let c: Parameters<typeof d.acoes.salvarZona>[1] = {};
    if (campo === "nome") {
      if (v.trim() === z.nome) return;
      c = { nome: v };
    } else if (campo === "gratis") {
      const n = num(v);
      c = { gratisAcima: v.trim() === "" ? null : Number.isFinite(n) ? n : undefined };
      if (c.gratisAcima === undefined) return setErro("Valor inválido em “grátis acima de”.");
    } else {
      const n = num(v);
      if (!Number.isFinite(n) || n < 0) return setErro("Use só números (ex.: 7,50).");
      c = campo === "taxa" ? { taxa: n } : campo === "minimo" ? { minimo: n } : campo === "t0" ? { tempoMin: Math.round(n), tempoMax: z.tempo[1] } : { tempoMin: z.tempo[0], tempoMax: Math.round(n) };
    }
    const r = await d.acoes.salvarZona(z.id, c);
    setErro(r);
    if (!r) avisar(`Zona ${z.nome} atualizada`);
  }
  const inp = (campo: keyof typeof f, rot: string, extra?: { ph?: string }) => (
    <label className="block">
      {rot}
      <input inputMode="decimal" value={f[campo]} placeholder={extra?.ph} onChange={(e) => setF({ ...f, [campo]: e.target.value })} onBlur={() => salvar(campo)} className={campoZ} />
    </label>
  );

  return (
    <div className="rounded-2xl bg-grafite p-3">
      <div className="flex items-center gap-2">
        <label className="relative h-5 w-5 shrink-0 cursor-pointer overflow-hidden rounded" style={{ background: z.cor }} title="Trocar a cor">
          <input type="color" value={z.cor} onChange={(e) => d.acoes.salvarZona(z.id, { cor: e.target.value })} aria-label={`Cor da zona ${z.nome}`} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
        <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} onBlur={() => salvar("nome")} aria-label="Nome da zona" className="min-w-0 flex-1 bg-transparent font-semibold text-papel outline-none focus:underline" />
        <span className="shrink-0 text-[12px] text-areia">{qtd} {qtd === 1 ? "área" : "áreas"}</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[12px] text-areia">
        {inp("taxa", "Taxa (R$)")}
        {inp("minimo", "Mínimo (R$)")}
        {inp("gratis", "Grátis acima", { ph: "—" })}
        {inp("t0", "Tempo de (min)")}
        {inp("t1", "até (min)")}
        <div className="flex items-end justify-end">
          {apagar ? (
            <span className="flex flex-col items-end gap-1 text-[12px]">
              <button
                onClick={async () => {
                  const r = await d.acoes.excluirZona(z.id);
                  if (r) setErro(r);
                  else avisar(`Zona ${z.nome} apagada${qtd ? `. ${qtd} áreas ficaram sem entrega` : ""}`);
                }}
                className="rounded-full bg-[#9b3530] px-2.5 py-1 font-semibold text-white"
              >
                Apagar{qtd ? ` (+${qtd} áreas)` : ""}
              </button>
              <button onClick={() => setApagar(false)} className="underline">
                cancelar
              </button>
            </span>
          ) : (
            <button onClick={() => setApagar(true)} aria-label={`Apagar zona ${z.nome}`} className="rounded-lg p-1.5 hover:bg-carvao hover:text-[#ff8b80]">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Quem tentou pedir deste bairro e quer ser avisado. O dono avisa um por um no WhatsApp. */
function QuemPediu({ bairroId, bairro, atende }: { bairroId: string; bairro: string; atende: boolean }) {
  const d = useDados();
  const [lista, setLista] = useState<Lead[] | null>(null);
  useEffect(() => {
    let vivo = true;
    d.acoes.leadsBairro(bairroId).then((l) => vivo && setLista(l));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bairroId]);
  if (!lista || lista.length === 0) return null;
  const link = `${location.origin}/?r=${encodeURIComponent(SLUG)}#loja`;
  const msg = (l: Lead) =>
    `Oi${l.nome ? `, ${l.nome.split(" ")[0]}` : ""}! Aqui é da ${d.loja.nome}. Você pediu para avisar: agora entregamos em ${bairro}! 🎉 Faça seu pedido por aqui: ${link}`;
  const falta = lista.filter((l) => !l.avisadoEm).length;
  return (
    <div className="mt-4 rounded-2xl border border-mostarda/50 p-3">
      <p className="flex items-center gap-2 text-[14px] font-semibold">
        <Users className="h-4 w-4 text-mostarda" /> Quem pediu para ser avisado ({lista.length})
      </p>
      <p className="mt-0.5 text-[12px] text-areia">
        {atende ? (falta ? `${falta} ainda sem aviso. Toque em Avisar: abre o WhatsApp com a mensagem pronta.` : "Todos já foram avisados.") : "Ative o bairro em uma zona para poder avisar."}
      </p>
      <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
        {lista.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-2 rounded-xl bg-carvao/40 px-3 py-2 text-[13px]">
            <span className="min-w-0">
              <span className="block truncate font-semibold">{l.nome || "Sem nome"}</span>
              <span className="tabular text-areia">{l.telefone.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3")}</span>
            </span>
            {l.avisadoEm ? (
              <span className="flex shrink-0 items-center gap-1 text-[12px] text-[#7fd1a5]">
                <Check className="h-3.5 w-3.5" /> Avisado
              </span>
            ) : atende ? (
              <a
                href={`https://wa.me/55${l.telefone}?text=${encodeURIComponent(msg(l))}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  d.acoes.marcarAvisados([l.id]);
                  setLista((ls) => ls!.map((x) => (x.id === l.id ? { ...x, avisadoEm: new Date().toISOString() } : x)));
                }}
                className="shrink-0 rounded-full bg-[#25d366] px-3 py-1.5 text-[12px] font-semibold text-[#08301a]"
              >
                Avisar
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Testa um endereço do jeito que o cliente faz na loja: CEP + número. */
function Simulador({ zonaDoBairro, zonaDoMun }: { zonaDoBairro: (id: string) => Zona | undefined; zonaDoMun: (n: string) => Zona | undefined }) {
  const d = useDados();
  const [cep, setCep] = useState("");
  const [numero, setNumero] = useState("");
  const [indo, setIndo] = useState(false);
  const [res, setRes] = useState<{ endereco: string; ent?: Entrega; erro?: string } | null>(null);
  const [simMun, setSimMun] = useState("Rio de Janeiro");
  const [simBairro, setSimBairro] = useState("");
  const simBairros = useMemo(() => bairrosDoMunicipio(simMun).sort((a, b) => a.properties.nome.localeCompare(b.properties.nome, "pt-BR")), [simMun]);
  const simId = simBairro || simBairros[0]?.properties.id || "";
  const simZona = simId ? zonaDoBairro(simId) : zonaDoMun(simMun);
  const simNome = simId ? nomeBairro(simId) : simMun;

  async function testar() {
    setIndo(true);
    setRes(null);
    const e = await buscarCep(cep);
    if (!e) {
      setIndo(false);
      return setRes({ endereco: cep, erro: "CEP não encontrado. Confira os números." });
    }
    const a = await localizar(e, numero);
    const endereco = `${e.rua ? e.rua + (numero ? ", " + numero : "") + " · " : ""}${e.bairro ? e.bairro + " · " : ""}${e.cidade}`;
    if (!a) {
      setIndo(false);
      return setRes({ endereco, erro: "Não consegui achar esse endereço no mapa." });
    }
    const local = BAIRROS.find((b) => geoContains(b as unknown as GeoPermissibleObjects, a.coord))?.properties.id ?? null;
    const ent = await d.acoes.resolverEntrega(a.coord, local);
    setIndo(false);
    setRes({ endereco, ent });
  }

  const caixa = (ok: boolean, titulo: string, texto: string) => (
    <div className={`mt-3 rounded-xl p-3 text-[14px] ${ok ? "bg-[#e2f2ea] text-[#1e3a2c]" : "bg-[#fbe4e0] text-[#8e2f2a]"}`}>
      <p className="flex items-center gap-1.5 font-semibold">
        <MapPin className="h-4 w-4 shrink-0" /> {titulo}
      </p>
      <p className="mt-1">{texto}</p>
    </div>
  );

  return (
    <section className="rounded-3xl border border-linha bg-forno p-5">
      <h2 className="flex items-center gap-2 font-display text-[20px] font-bold">
        <Search className="h-5 w-5 text-brasa" /> Simular um endereço
      </h2>
      <p className="mt-1 text-[13px] text-areia">Igual ao que o cliente faz na loja: CEP e número.</p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          testar();
        }}
      >
        <input value={cep} onChange={(e) => setCep(e.target.value)} inputMode="numeric" placeholder="CEP" aria-label="CEP para simular" className="w-0 flex-[3] rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px] text-papel" />
        <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Nº" aria-label="Número" className="w-0 flex-[1.4] rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px] text-papel" />
        <button disabled={indo || cep.replace(/\D/g, "").length !== 8} className="shrink-0 rounded-xl bg-brasa px-4 text-[14px] font-semibold text-carvao disabled:opacity-50">
          {indo ? "…" : "Testar"}
        </button>
      </form>
      {res &&
        (res.erro
          ? caixa(false, res.endereco, res.erro)
          : res.ent?.atende
            ? caixa(
                true,
                `Entregamos em ${res.ent.bairro ?? "esse endereço"}`,
                `${res.endereco} · zona ${res.ent.zona} · taxa ${brl(res.ent.taxa ?? 0)} · ${res.ent.tempo_min}–${res.ent.tempo_max} min · mínimo ${brl(res.ent.pedido_minimo ?? 0)}${res.ent.gratis_acima ? ` · grátis acima de ${brl(res.ent.gratis_acima)}` : ""}`,
              )
            : caixa(false, `Não entregamos em ${res.ent?.bairro ?? "esse endereço"}`, `${res.endereco}. O cliente vê a opção de retirar no balcão e pode deixar o WhatsApp para ser avisado.`))}

      <details className="mt-4 text-[13px] text-areia">
        <summary className="cursor-pointer font-semibold">Ou escolher pelo bairro</summary>
        <label className="mt-2 block">
          Município
          <select
            value={simMun}
            onChange={(e) => {
              setSimMun(e.target.value);
              setSimBairro("");
            }}
            className="mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px] text-papel"
          >
            {NOMES_MUN.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        {simBairros.length > 0 && (
          <label className="mt-2 block">
            Bairro
            <select value={simId} onChange={(e) => setSimBairro(e.target.value)} className="mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px] text-papel">
              {simBairros.map((b) => (
                <option key={b.properties.id} value={b.properties.id}>
                  {b.properties.nome}
                </option>
              ))}
            </select>
          </label>
        )}
        {simZona
          ? caixa(true, `Entregamos em ${simNome}`, `Zona ${simZona.nome} · taxa ${brl(simZona.taxa)} · ${simZona.tempo[0]}–${simZona.tempo[1]} min · mínimo ${brl(simZona.minimo)}${simZona.gratisAcima ? ` · grátis acima de ${brl(simZona.gratisAcima)}` : ""}`)
          : caixa(false, `Não entregamos em ${simNome}`, "O cliente vê a opção de retirar no balcão e pode deixar o WhatsApp para ser avisado.")}
      </details>
    </section>
  );
}
