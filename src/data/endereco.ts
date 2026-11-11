import { geoCentroid, geoContains, type GeoPermissibleObjects } from "d3-geo";
import { BAIRROS, MUNICIPIOS_RJ } from "../components/GeoMap";

// Busca de endereço por CEP + número.
// CEP: ViaCEP (grátis). Ponto no mapa: OpenStreetMap/Nominatim (grátis, 1 consulta por segundo).
// Se o número não for achado, usa a rua; se nem a rua, usa o centro do bairro.

export type EnderecoCep = { cep: string; rua: string; bairro: string; cidade: string; uf: string };
export type Achado = { coord: [number, number]; precisao: "numero" | "rua" | "bairro" };

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export async function buscarCep(cep: string): Promise<EnderecoCep | null> {
  const d = cep.replace(/\D/g, "");
  if (d.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    if (!r.ok) return null;
    const j = await r.json();
    if (j.erro) return null;
    return { cep: d, rua: j.logradouro ?? "", bairro: j.bairro ?? "", cidade: j.localidade ?? "", uf: j.uf ?? "" };
  } catch {
    return null;
  }
}

// O ponto precisa cair no estado do RJ, senão a busca errou de cidade.
const dentroDoRJ = (c: [number, number]) => MUNICIPIOS_RJ.some((m) => geoContains(m.geometry as GeoPermissibleObjects, c));

async function nominatim(params: Record<string, string>): Promise<[number, number] | null> {
  const q = new URLSearchParams({ format: "jsonv2", limit: "1", countrycodes: "br", "accept-language": "pt-BR", ...params });
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?${q}`);
    if (!r.ok) return null;
    const j = (await r.json()) as { lat: string; lon: string }[];
    if (!j.length) return null;
    const c: [number, number] = [Number(j[0].lon), Number(j[0].lat)];
    return dentroDoRJ(c) ? c : null;
  } catch {
    return null;
  }
}

function centroDoBairro(bairro: string, cidade: string): [number, number] | null {
  const b = norm(bairro);
  const c = norm(cidade);
  const f = BAIRROS.find((x) => norm(x.properties.nome) === b && norm(x.properties.municipio ?? "") === c) ?? BAIRROS.find((x) => norm(x.properties.nome) === b);
  return f ? (geoCentroid(f as GeoPermissibleObjects) as [number, number]) : null;
}

export async function localizar(e: EnderecoCep, numero: string): Promise<Achado | null> {
  const base = { city: e.cidade, state: "Rio de Janeiro", country: "Brasil" };
  if (e.rua && numero.trim()) {
    const c = await nominatim({ ...base, street: `${numero.trim()} ${e.rua}` });
    if (c) return { coord: c, precisao: "numero" };
  }
  if (e.rua) {
    const c = await nominatim({ ...base, street: e.rua });
    if (c) return { coord: c, precisao: "rua" };
  }
  const c = e.bairro ? centroDoBairro(e.bairro, e.cidade) : null;
  return c ? { coord: c, precisao: "bairro" } : null;
}
