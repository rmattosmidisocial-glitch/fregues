// Dados de exemplo da demonstração. Nada aqui é dado real de cliente.
import { idRio, nomeBairro } from "../components/GeoMap";

let seed = 20261109;
function rnd() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

export const LOJA = {
  nome: "Brasa Burger",
  slug: "brasa-burger",
  bairro: "Vila da Penha",
  cidade: "Rio de Janeiro",
  coord: [-43.3115, -22.8405] as [number, number],
  nota: 4.8,
  avaliacoes: 1284,
  aberto: true,
  horario: "Hoje, 18h às 23h30",
};

export type Zona = {
  id: string;
  nome: string;
  taxa: number;
  tempo: [number, number];
  minimo: number;
  gratisAcima?: number;
  /** Distância máxima do restaurante, em km (linha reta). Vazio = sem limite de distância. */
  raioKm?: number;
  cor: string;
  bairros: string[]; // ids IBGE dos bairros
  /** Taxa própria de alguns bairros (no lugar da taxa da zona). */
  taxasBairro?: Record<string, number>;
  /** Cor própria de alguns bairros no mapa (no lugar da cor da zona). */
  coresBairro?: Record<string, string>;
  municipios?: string[]; // códigos IBGE de municípios atendidos inteiros
};

export const ZONAS: Zona[] = [
  {
    id: "z1",
    nome: "Vizinhança",
    taxa: 4.9,
    tempo: [25, 35],
    minimo: 25,
    gratisAcima: 80,
    cor: "#ff5b1f",
    bairros: ["Vila da Penha", "Vista Alegre", "Irajá", "Vicente de Carvalho", "Vila Kosmos", "Brás de Pina"].map(idRio),
  },
  {
    id: "z2",
    nome: "Ao redor",
    taxa: 6.9,
    tempo: [35, 45],
    minimo: 30,
    cor: "#ffc03a",
    bairros: ["Penha", "Penha Circular", "Cordovil", "Colégio", "Olaria", "Rocha Miranda", "Engenho da Rainha", "Tomás Coelho"].map(idRio),
  },
  {
    id: "z3",
    nome: "Mais longe",
    taxa: 9.9,
    tempo: [45, 60],
    minimo: 40,
    cor: "#2f7d77",
    bairros: ["Madureira", "Ramos", "Vaz Lobo", "Turiaçu", "Coelho Neto", "Parada de Lucas", "Vigário Geral", "Jardim América"].map(idRio),
  },
];

const DEMANDA_NOMES: Record<string, number> = {
  Bonsucesso: 31,
  Pavuna: 23,
  Acari: 14,
  "Méier": 12,
  Cachambi: 9,
  "Jardim Guanabara": 9,
  Inhaúma: 7,
};
export const DEMANDA_FORA: Record<string, number> = Object.fromEntries(Object.entries(DEMANDA_NOMES).map(([n, v]) => [idRio(n), v]));

export function zonaDoBairro(b: string) {
  return ZONAS.find((z) => z.bairros.includes(b));
}

// ---------- Cardápio ----------
export type Arte = "smash" | "duplo" | "frango" | "veg" | "batata" | "onion" | "refri" | "shake" | "brownie" | "combo" | "suco" | "sem";
export type Complemento = { id?: string; nome: string; preco: number };
export type Grupo = { nome: string; min: number; max: number; itens: Complemento[] };
export type Produto = {
  id: string;
  cat: string;
  nome: string;
  desc: string;
  preco: number;
  promo?: number;
  arte: Arte;
  /** Foto enviada pelo dono. Sem ela, usa a ilustração (demo) ou um quadro neutro. */
  foto?: string;
  tags?: string[];
  grupos?: Grupo[];
  esgotado?: boolean;
  maisPedido?: boolean;
};

const adicionais: Grupo = {
  nome: "Turbine seu burger",
  min: 0,
  max: 4,
  itens: [
    { nome: "Bacon crocante", preco: 5 },
    { nome: "Cheddar cremoso extra", preco: 4 },
    { nome: "Ovo na chapa", preco: 3 },
    { nome: "Cebola caramelizada", preco: 3.5 },
  ],
};
const ponto: Grupo = {
  nome: "Ponto da carne",
  min: 1,
  max: 1,
  itens: [
    { nome: "Ao ponto", preco: 0 },
    { nome: "Ao ponto para mais", preco: 0 },
    { nome: "Bem passado", preco: 0 },
  ],
};
const bebidaCombo: Grupo = {
  nome: "Bebida do combo",
  min: 1,
  max: 1,
  itens: [
    { nome: "Guaraná lata", preco: 0 },
    { nome: "Coca-Cola lata", preco: 0 },
    { nome: "Suco de maracujá", preco: 3 },
  ],
};

export const CATEGORIAS = ["Smash", "Da casa", "Combos", "Porções", "Bebidas", "Sobremesas"];

export const CARDAPIO: Produto[] = [
  { id: "p1", cat: "Smash", nome: "Smash da Penha", desc: "Dois smash de 70g, queijo prato derretido, picles e molho da casa no pão brioche.", preco: 27.9, arte: "smash", maisPedido: true, grupos: [adicionais] },
  { id: "p2", cat: "Smash", nome: "Smash Bacon", desc: "Dois smash de 70g, cheddar, bacon crocante e cebola roxa.", preco: 31.9, arte: "smash", grupos: [adicionais] },
  { id: "p3", cat: "Smash", nome: "Triplo Brasa", desc: "Três smash, três fatias de cheddar e maionese defumada. Para quem chegou com fome.", preco: 36.9, arte: "duplo", tags: ["Bem servido"], grupos: [adicionais] },
  { id: "p4", cat: "Da casa", nome: "X-Bacon Duplo", desc: "Dois blends de 150g, bacon, cheddar, alface, tomate e molho barbecue.", preco: 39.9, arte: "duplo", maisPedido: true, grupos: [ponto, adicionais] },
  { id: "p5", cat: "Da casa", nome: "Brasa Clássico", desc: "Blend de 180g na brasa, queijo prato, alface, tomate e maionese verde.", preco: 32.9, arte: "smash", grupos: [ponto, adicionais] },
  { id: "p6", cat: "Da casa", nome: "Frango Crocante", desc: "Sobrecoxa empanada no panko, coleslaw e maionese de limão.", preco: 29.9, arte: "frango", grupos: [adicionais] },
  { id: "p7", cat: "Da casa", nome: "Vila Verde", desc: "Burger de grão-de-bico e cogumelos, queijo coalho, rúcula e tomate confit.", preco: 30.9, arte: "veg", tags: ["Vegetariano"] },
  { id: "p8", cat: "Combos", nome: "Combo Smash", desc: "Smash da Penha, batata média e bebida.", preco: 42.9, promo: 38.9, arte: "combo", grupos: [bebidaCombo, adicionais] },
  { id: "p9", cat: "Combos", nome: "Combo Casal", desc: "Dois X-Bacon Duplo, batata grande com cheddar e bacon e duas bebidas.", preco: 104.9, promo: 94.9, arte: "combo", tags: ["Serve 2"], grupos: [bebidaCombo] },
  { id: "p10", cat: "Porções", nome: "Batata rústica", desc: "Com páprica defumada e maionese da casa.", preco: 18.9, arte: "batata" },
  { id: "p11", cat: "Porções", nome: "Batata cheddar e bacon", desc: "Batata frita coberta de cheddar cremoso e bacon.", preco: 26.9, arte: "batata", maisPedido: true },
  { id: "p12", cat: "Porções", nome: "Onion rings", desc: "Anéis de cebola empanados, com molho barbecue.", preco: 21.9, arte: "onion", esgotado: true },
  { id: "p13", cat: "Bebidas", nome: "Refrigerante lata", desc: "Guaraná, Coca-Cola ou Coca Zero.", preco: 6.5, arte: "refri" },
  { id: "p14", cat: "Bebidas", nome: "Suco de maracujá", desc: "Feito na hora, 400ml.", preco: 10.9, arte: "suco" },
  { id: "p15", cat: "Bebidas", nome: "Milk-shake de Ovomaltine", desc: "500ml, cremoso de verdade.", preco: 19.9, arte: "shake" },
  { id: "p16", cat: "Sobremesas", nome: "Brownie com sorvete", desc: "Brownie quente de chocolate meio amargo com bola de creme.", preco: 17.9, arte: "brownie" },
];

// ---------- Fregueses ----------
const NOMES = ["Carlos", "Ana", "João", "Mariana", "Rafael", "Juliana", "Bruno", "Camila", "Diego", "Fernanda", "Thiago", "Larissa", "Rodrigo", "Patrícia", "Lucas", "Aline", "Felipe", "Bianca", "Gustavo", "Renata", "Marcelo", "Tatiane", "André", "Priscila", "Leandro", "Vanessa", "Wellington", "Jéssica", "Matheus", "Daniela", "Vinícius", "Gabriela", "Paulo", "Carolina", "Igor", "Natália", "Eduardo", "Luana", "Fábio", "Amanda"];
const SOBRENOMES = ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Rodrigues", "Almeida", "Nascimento", "Carvalho", "Gomes", "Martins", "Araújo", "Ribeiro", "Barbosa", "Rocha", "Freitas", "Moreira", "Mendes"];

export type Status = "ritmo" | "atrasado" | "sumindo";
export type Freguês = {
  id: string;
  nome: string;
  tel: string;
  bairro: string;
  bairroId?: string;
  pedidos: number;
  ticket: number;
  intervalo: number;
  diasDesde: number;
  favorito: string;
  status: Status;
  nivel: "Visitante" | "Freguês" | "Fiel" | "Lenda da Casa";
  canal: "Loja própria" | "WhatsApp" | "Salão";
  horario: string;
  aniversario?: string;
  tags: string[];
  pontos: number;
  /** Etapa escolhida pelo dono no quadro (sem ela, a etapa é calculada). */
  etapa?: "novo" | "voltando" | "fiel" | "esfriando" | "sumindo";
  obs?: string;
  aceitaMarketing?: boolean;
  /** AAAA-MM-DD */
  aniversarioISO?: string;
};

const bairrosAtendidos = ZONAS.flatMap((z) => z.bairros.map((b) => ({ b, w: z.id === "z1" ? 5 : z.id === "z2" ? 3 : 1 })));
function bairroPesado() {
  const total = bairrosAtendidos.reduce((s, x) => s + x.w, 0);
  let r = rnd() * total;
  for (const x of bairrosAtendidos) {
    r -= x.w;
    if (r <= 0) return x.b;
  }
  return idRio("Vila da Penha");
}

const favoritos = ["X-Bacon Duplo", "Smash da Penha", "Combo Smash", "Smash Bacon", "Triplo Brasa", "Frango Crocante", "Combo Casal", "Batata cheddar e bacon", "Brasa Clássico"];
const horarios = ["Sexta, 20h", "Sábado, 21h", "Domingo, 19h", "Quinta, 20h", "Quarta, 21h"];
const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export const FREGUESES: Freguês[] = Array.from({ length: 300 }, (_, i) => {
  const intervalo = Math.round(5 + rnd() * 25);
  const fator = rnd() < 0.62 ? rnd() * 1.2 : rnd() < 0.55 ? 1.3 + rnd() * 0.6 : 2.1 + rnd() * 3;
  const diasDesde = Math.max(1, Math.round(intervalo * fator));
  const razao = diasDesde / intervalo;
  const status: Status = razao <= 1.25 ? "ritmo" : razao <= 2 ? "atrasado" : "sumindo";
  const pedidos = Math.max(1, Math.round(365 / intervalo / (1 + rnd())));
  const nivel = pedidos >= 30 ? "Lenda da Casa" : pedidos >= 14 ? "Fiel" : pedidos >= 4 ? "Freguês" : "Visitante";
  const nome = `${pick(NOMES)} ${pick(SOBRENOMES)}`;
  const tags: string[] = [];
  if (rnd() < 0.25) tags.push("Ama bacon");
  if (rnd() < 0.15) tags.push("Avaliou bem");
  if (rnd() < 0.08) tags.push("Sem lactose");
  if (pedidos >= 20) tags.push("VIP");
  const aniv = rnd() < 0.4 ? `${1 + Math.floor(rnd() * 28)} ${pick(meses)}` : undefined;
  return {
    id: `c${i + 1}`,
    nome,
    tel: `(21) 9${Math.floor(6000 + rnd() * 3999)}-${String(Math.floor(rnd() * 9999)).padStart(4, "0")}`,
    ...(() => {
      const b = bairroPesado();
      return { bairro: nomeBairro(b), bairroId: b };
    })(),
    pedidos,
    ticket: Math.round((38 + rnd() * 52) * 10) / 10,
    intervalo,
    diasDesde,
    favorito: pick(favoritos),
    status,
    nivel,
    canal: rnd() < 0.55 ? "Loja própria" : rnd() < 0.7 ? "WhatsApp" : "Salão",
    horario: pick(horarios),
    aniversario: aniv,
    tags,
    pontos: Math.round(pedidos * (30 + rnd() * 40)),
  };
});

// Destaques fixos para a demonstração ficar previsível
Object.assign(FREGUESES[0], { nome: "Carlos Menezes", bairro: "Vila da Penha", bairroId: idRio("Vila da Penha"), favorito: "X-Bacon Duplo", intervalo: 9, diasDesde: 34, status: "sumindo", pedidos: 31, nivel: "Lenda da Casa", ticket: 62.4, tags: ["VIP", "Ama bacon"], horario: "Sexta, 20h", aniversario: "14 nov" });
Object.assign(FREGUESES[1], { nome: "Ana Paula Ribeiro", bairro: "Vista Alegre", bairroId: idRio("Vista Alegre"), favorito: "Combo Casal", intervalo: 7, diasDesde: 12, status: "atrasado", pedidos: 22, nivel: "Fiel", ticket: 96.8, tags: ["VIP", "Avaliou bem"], horario: "Sábado, 21h" });
Object.assign(FREGUESES[2], { nome: "João Ricardo Lima", bairro: "Irajá", bairroId: idRio("Irajá"), favorito: "Smash Bacon", intervalo: 14, diasDesde: 6, status: "ritmo", pedidos: 17, nivel: "Fiel", ticket: 44.9, tags: ["Ama bacon"] });

export const pulsoResumo = (() => {
  const prob = { ritmo: 0, atrasado: 0.45, sumindo: 0.8 } as const;
  let risco = 0;
  for (const f of FREGUESES) risco += f.ticket * (7 / f.intervalo) * prob[f.status] * 1.6;
  const ritmo = FREGUESES.filter((f) => f.status === "ritmo").length;
  const atrasado = FREGUESES.filter((f) => f.status === "atrasado").length;
  const sumindo = FREGUESES.filter((f) => f.status === "sumindo").length;
  return { risco: Math.round(risco), recuperado: 2910, ritmo, atrasado, sumindo };
})();

export const chamarHoje = FREGUESES.filter((f) => f.status !== "ritmo")
  .sort((a, b) => b.ticket * b.pedidos - a.ticket * a.pedidos)
  .slice(0, 6);

// ---------- Pedidos ao vivo ----------
export type StatusPedido = "novo" | "preparo" | "pronto" | "rota" | "entregue";
export type Pedido = {
  id?: string;
  num: number;
  cliente: string;
  bairro: string;
  itens: string[];
  total: number;
  pag: "Pix pago" | "Pix pendente" | "Cartão online" | "Dinheiro (troco p/ 100)" | "Maquininha";
  modo: "Entrega" | "Retirada" | "Balcão" | `Mesa ${string}`;
  min: number;
  status: StatusPedido;
  motoboy?: string;
  primeira?: boolean;
  nota?: string;
  tel?: string;
  endereco?: { rua?: string; numero?: string; complemento?: string; bairro?: string; cep?: string };
  pago?: boolean;
  forma?: "pix" | "cartao" | "dinheiro" | "maquininha";
  criadoEm?: string;
  /** dinheiro: troco para quanto */
  troco?: number;
};

export const PEDIDOS: Pedido[] = [
  { num: 1047, cliente: "Larissa Gomes", bairro: "Vista Alegre", itens: ["2x Smash da Penha", "1x Batata rústica", "2x Refrigerante lata"], total: 92.1, pag: "Pix pago", modo: "Entrega", min: 1, status: "novo", primeira: true },
  { num: 1046, cliente: "Rodrigo Martins", bairro: "Penha", itens: ["1x Combo Smash", "Bebida: Guaraná lata"], total: 45.8, pag: "Cartão online", modo: "Entrega", min: 3, status: "novo" },
  { num: 1045, cliente: "Mesa 4", bairro: "Salão", itens: ["1x Brasa Clássico", "1x Milk-shake de Ovomaltine"], total: 52.8, pag: "Maquininha", modo: "Mesa 4", min: 6, status: "preparo" },
  { num: 1044, cliente: "Ana Paula Ribeiro", bairro: "Vista Alegre", itens: ["1x Combo Casal", "+ Bacon crocante"], total: 104.8, pag: "Pix pago", modo: "Entrega", min: 9, status: "preparo", nota: "Sem cebola em um dos burgers" },
  { num: 1043, cliente: "Felipe Araújo", bairro: "Irajá", itens: ["1x Triplo Brasa", "1x Batata cheddar e bacon"], total: 68.7, pag: "Dinheiro (troco p/ 100)", modo: "Entrega", min: 14, status: "pronto" },
  { num: 1042, cliente: "Bianca Rocha", bairro: "Retirada", itens: ["2x Frango Crocante"], total: 59.8, pag: "Pix pago", modo: "Retirada", min: 17, status: "pronto" },
  { num: 1041, cliente: "Thiago Freitas", bairro: "Olaria", itens: ["1x X-Bacon Duplo", "1x Suco de maracujá"], total: 57.7, pag: "Cartão online", modo: "Entrega", min: 24, status: "rota", motoboy: "Marquinhos" },
  { num: 1040, cliente: "Juliana Costa", bairro: "Vicente de Carvalho", itens: ["1x Smash Bacon", "1x Brownie com sorvete"], total: 54.7, pag: "Dinheiro (troco p/ 100)", modo: "Entrega", min: 29, status: "rota", motoboy: "Dudu" },
  { num: 1039, cliente: "Marcelo Souza", bairro: "Brás de Pina", itens: ["1x Combo Smash"], total: 43.8, pag: "Maquininha", modo: "Entrega", min: 41, status: "entregue", motoboy: "Marquinhos" },
];

// dados de exemplo para detalhes, WhatsApp e impressão da comanda na demonstração
PEDIDOS.forEach((p, i) => {
  p.tel = `(21) 9${8100 + i * 37}-${String(4100 + i * 113).slice(0, 4)}`;
  p.forma = p.pag.startsWith("Pix") ? "pix" : p.pag === "Cartão online" ? "cartao" : p.pag === "Maquininha" ? "maquininha" : "dinheiro";
  p.pago = p.pag === "Pix pago" || p.pag === "Cartão online";
  p.criadoEm = new Date(Date.now() - p.min * 60000).toISOString();
  if (p.modo === "Entrega") p.endereco = { rua: ["Rua Uranos", "Av. Brás de Pina", "Rua Montevidéu", "Estrada do Itararé"][i % 4], numero: String(120 + i * 17), complemento: i % 2 ? "Casa 2" : "Ap 301", bairro: p.bairro };
});

export const VENDAS_SEMANA = [
  { dia: "Seg", propria: 1180, marketplace: 640 },
  { dia: "Ter", propria: 1320, marketplace: 590 },
  { dia: "Qua", propria: 1490, marketplace: 720 },
  { dia: "Qui", propria: 1860, marketplace: 810 },
  { dia: "Sex", propria: 3240, marketplace: 1290 },
  { dia: "Sáb", propria: 3780, marketplace: 1460 },
  { dia: "Dom", propria: 2610, marketplace: 1120 },
];

export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
