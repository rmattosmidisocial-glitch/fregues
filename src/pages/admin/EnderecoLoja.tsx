import { useMemo, useState } from "react";
import { geoContains, type GeoPermissibleObjects } from "d3-geo";
import { MapPin } from "lucide-react";
import { BAIRROS, GeoMap, MUNICIPIOS_RJ, bairrosDoMunicipio, centroide, vizinhos, type Feature } from "../../components/GeoMap";
import { buscarCep, localizar } from "../../data/endereco";

export type Endereco = { cidade: string; bairro: string; rua: string; numero: string; cep: string; lon?: number | null; lat?: number | null };
export const ENDERECO_VAZIO: Endereco = { cidade: "Rio de Janeiro", bairro: "", rua: "", numero: "", cep: "", lon: null, lat: null };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const CIDADES = MUNICIPIOS_RJ.map((m) => m.properties.nome).sort((a, b) => a.localeCompare(b, "pt-BR"));
const OUTRO = "__outro__";

/** Cidade e bairro do estado do RJ (lista oficial do IBGE), rua, número, CEP e o ponto do restaurante no mapa. */
export function EnderecoLoja({ valor, mudar }: { valor: Endereco; mudar: (e: Endereco) => void }) {
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [digitarBairro, setDigitarBairro] = useState(false);
  const set = (p: Partial<Endereco>) => mudar({ ...valor, ...p });

  const bairros = useMemo(() => bairrosDoMunicipio(valor.cidade).map((b) => b.properties.nome).sort((a, b) => a.localeCompare(b, "pt-BR")), [valor.cidade]);
  const bairroNaLista = bairros.some((b) => norm(b) === norm(valor.bairro));
  const textoBairro = digitarBairro || !bairros.length || (!!valor.bairro && !bairroNaLista);

  const ponto: [number, number] | null = valor.lon != null && valor.lat != null ? [valor.lon, valor.lat] : null;
  const fBairro = BAIRROS.find((b) => norm(b.properties.nome) === norm(valor.bairro) && b.properties.municipio === valor.cidade);
  const fCidade = MUNICIPIOS_RJ.find((m) => m.properties.nome === valor.cidade);
  const fit: Feature[] = useMemo(() => {
    if (fBairro) return vizinhos([fBairro], 1.2);
    const bs = bairrosDoMunicipio(valor.cidade);
    return bs.length ? bs : fCidade ? [fCidade] : [];
  }, [fBairro, fCidade, valor.cidade]);

  async function porCep(cep: string) {
    const d = cep.replace(/\D/g, "");
    set({ cep: d });
    if (d.length !== 8) return;
    setBuscando(true);
    const e = await buscarCep(d);
    setBuscando(false);
    if (!e) return setAviso("CEP não encontrado. Preencha cidade e bairro abaixo.");
    if (e.uf !== "RJ") return setAviso("Esse CEP não é do estado do RJ.");
    const cidade = CIDADES.find((c) => norm(c) === norm(e.cidade)) ?? valor.cidade;
    const lista = bairrosDoMunicipio(cidade).map((b) => b.properties.nome);
    const bairro = lista.find((b) => norm(b) === norm(e.bairro)) ?? e.bairro;
    setAviso("");
    setDigitarBairro(!!bairro && !lista.includes(bairro));
    mudar({ ...valor, cep: d, cidade, bairro, rua: e.rua || valor.rua, lon: null, lat: null });
  }

  async function marcar() {
    setBuscando(true);
    setAviso("");
    const a = await localizar({ cep: valor.cep, rua: valor.rua, bairro: valor.bairro, cidade: valor.cidade, uf: "RJ" }, valor.numero);
    setBuscando(false);
    let c = a?.coord ?? null;
    if (!c && fBairro) c = centroide(fBairro);
    if (!c && fCidade) c = centroide(fCidade);
    if (!c) return setAviso("Não achei esse endereço. Toque no mapa para marcar o ponto.");
    set({ lon: c[0], lat: c[1] });
    setAviso(a?.precisao === "numero" ? "Ponto marcado pelo endereço. Confira no mapa." : "Marquei pelo centro da rua ou do bairro. Toque no mapa para acertar o ponto exato.");
  }

  const inp = "mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px] text-papel";
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
        <label className="block text-[13px] text-areia">
          CEP <span className="text-fumo">(opcional)</span>
          <input inputMode="numeric" value={valor.cep} onChange={(e) => porCep(e.target.value)} placeholder="00000-000" className={inp} />
        </label>
        <label className="block text-[13px] text-areia">
          Cidade
          <select
            value={valor.cidade}
            onChange={(e) => {
              setDigitarBairro(false);
              mudar({ ...valor, cidade: e.target.value, bairro: "", lon: null, lat: null });
            }}
            className={inp}
          >
            {CIDADES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-[13px] text-areia">
        Bairro
        {textoBairro ? (
          <div className="flex gap-2">
            <input value={valor.bairro} onChange={(e) => set({ bairro: e.target.value, lon: null, lat: null })} placeholder="Nome do bairro" className={inp} />
            {bairros.length > 0 && (
              <button type="button" onClick={() => (setDigitarBairro(false), set({ bairro: "" }))} className="mt-1 shrink-0 rounded-xl border border-linha px-3 text-[13px]">
                Ver lista
              </button>
            )}
          </div>
        ) : (
          <select
            value={bairroNaLista ? bairros.find((b) => norm(b) === norm(valor.bairro)) : ""}
            onChange={(e) => (e.target.value === OUTRO ? (setDigitarBairro(true), set({ bairro: "" })) : set({ bairro: e.target.value, lon: null, lat: null }))}
            className={inp}
          >
            <option value="">Escolha o bairro ({bairros.length})</option>
            {bairros.map((b) => (
              <option key={b}>{b}</option>
            ))}
            <option value={OUTRO}>Não está na lista: digitar</option>
          </select>
        )}
      </label>
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <label className="block text-[13px] text-areia">
          Rua
          <input value={valor.rua} onChange={(e) => set({ rua: e.target.value })} placeholder="Ex.: Av. Automóvel Clube" className={inp} />
        </label>
        <label className="block text-[13px] text-areia">
          Número
          <input value={valor.numero} onChange={(e) => set({ numero: e.target.value })} className={inp} />
        </label>
      </div>

      <div className="rounded-2xl border border-linha p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[14px] font-semibold">
            <MapPin className="h-4 w-4 text-brasa" /> Ponto do restaurante no mapa
          </p>
          <button type="button" disabled={buscando || !valor.cidade} onClick={marcar} className="rounded-full bg-brasa px-3 py-1.5 text-[13px] font-semibold text-carvao disabled:opacity-50">
            {buscando ? "Buscando…" : ponto ? "Buscar de novo" : "Marcar pelo endereço"}
          </button>
        </div>
        {aviso && <p className="mt-2 text-[13px] text-areia">{aviso}</p>}
        {fit.length > 0 && (
          <div className="mt-2 overflow-hidden rounded-xl border border-linha bg-[#140f0c]">
            <GeoMap
              key={valor.cidade + valor.bairro}
              width={560}
              height={320}
              padding={10}
              fitTo={fit}
              layers={[
                {
                  id: "b",
                  features: fit.length > 400 ? bairrosDoMunicipio(valor.cidade) : fit,
                  fill: (f) => (fBairro && f.properties.id === fBairro.properties.id ? "rgba(232,116,59,0.35)" : "rgba(255,255,255,0.04)"),
                  stroke: () => "rgba(255,255,255,0.18)",
                  strokeWidth: 0.6,
                  interactive: false,
                },
              ]}
              pins={ponto ? [{ coord: ponto, kind: "loja" }] : []}
              onPointClick={(c) => {
                set({ lon: c[0], lat: c[1] });
                const dentro = BAIRROS.find((b) => geoContains(b.geometry as GeoPermissibleObjects, c));
                setAviso(dentro ? `Ponto marcado em ${dentro.properties.nome}, ${dentro.properties.municipio}.` : "Ponto marcado.");
              }}
              className="h-auto w-full cursor-crosshair"
              ariaLabel="Mapa para marcar o ponto do restaurante"
            />
          </div>
        )}
        <p className="mt-2 text-[12px] text-fumo">{ponto ? "Toque no mapa para ajustar o ponto." : "Sem ponto ainda: use o botão ou toque no mapa."} É este ponto que aparece no Território do painel do dono.</p>
      </div>
    </div>
  );
}
