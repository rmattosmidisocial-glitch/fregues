// Nomes dos bairros sem carregar o mapa inteiro (o mapa pesa ~600 KB; este índice, poucos KB).
import nomes from "./bairros-nomes.json";

const N = nomes as unknown as Record<string, [string, string]>;
export const nomeBairro = (id: string) => N[id]?.[0] ?? id;
export const municipioDoBairro = (id: string) => N[id]?.[1] ?? "";
const RIO: Record<string, string> = Object.fromEntries(Object.entries(N).filter(([, v]) => v[1] === "Rio de Janeiro").map(([id, v]) => [v[0], id]));
export const idRio = (nome: string) => RIO[nome] ?? nome;
