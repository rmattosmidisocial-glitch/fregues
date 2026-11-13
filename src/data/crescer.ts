// Módulos de crescimento: automações, atendimento com IA, formulários e links da bio.
// Estado compartilhado entre as telas (painel e loja) durante a sessão.
import { useSyncExternalStore } from "react";
import { BAIRROS, nomeBairro } from "../components/GeoMap";
import { CARDAPIO, FREGUESES, LOJA, ZONAS, brl, type Produto, type Zona } from "./mock";

// ---------------- store mínima ----------------
type Ouvinte = () => void;
function criarStore<T>(inicial: T) {
  let estado = inicial;
  const ouvintes = new Set<Ouvinte>();
  return {
    get: () => estado,
    set: (f: (s: T) => T) => {
      estado = f(estado);
      ouvintes.forEach((o) => o());
    },
    sub: (o: Ouvinte) => {
      ouvintes.add(o);
      return () => ouvintes.delete(o);
    },
  };
}

const agora = Date.now();
const H = 3600_000;
const D = 24 * H;
const uid = () => Math.random().toString(36).slice(2, 10);

// ---------------- Automações ----------------
export type TipoNo = "gatilho" | "espera" | "filtro" | "whatsapp" | "cupom" | "etiqueta" | "alerta" | "pontos";
export type No = { id: string; tipo: TipoNo; titulo: string; detalhe: string; texto?: string; horas?: number };
export type Execucao = { id: string; quando: number; cliente: string; resultado: "convertido" | "enviado" | "parou" | "teste"; nota: string; valor?: number };
export type Automacao = {
  id: string;
  nome: string;
  descricao: string;
  estado: "ativa" | "pausada" | "rascunho";
  nos: No[];
  disparos: number;
  conversoes: number;
  receita: number;
  execucoes: Execucao[];
  editada: number;
};

const fs = FREGUESES;
const exec = (n: number, base: number, notas: [Execucao["resultado"], string, number?][]) =>
  notas.slice(0, n).map(([resultado, nota, valor], i) => ({ id: uid(), quando: agora - base * (i + 1) - i * 1700_000, cliente: fs[(i * 7 + base / H) % 300 | 0].nome, resultado, nota, valor }));

export const MODELOS: Omit<Automacao, "id" | "estado" | "disparos" | "conversoes" | "receita" | "execucoes" | "editada">[] = [
  {
    nome: "Pedir avaliação depois da entrega",
    descricao: "1 hora depois da entrega, pergunta como estava. Nota baixa avisa você na hora e manda um cupom de desculpas.",
    nos: [
      { id: "a", tipo: "gatilho", titulo: "Pedido entregue", detalhe: "Qualquer pedido da loja própria" },
      { id: "b", tipo: "espera", titulo: "Esperar 1 hora", detalhe: "Tempo de comer com calma", horas: 1 },
      { id: "c", tipo: "whatsapp", titulo: "Perguntar como estava", detalhe: "WhatsApp com o link da pesquisa", texto: "Oi, {nome}! Seu {pedido} chegou bem? Dá uma nota rapidinho, leva 10 segundos: {link_pesquisa}" },
      { id: "d", tipo: "filtro", titulo: "Nota 3 ou menos?", detalhe: "Nota baixa segue para o alerta" },
      { id: "e", tipo: "alerta", titulo: "Avisar o dono", detalhe: "Notificação no painel e no celular" },
      { id: "f", tipo: "cupom", titulo: "Cupom de desculpas", detalhe: "15% no próximo pedido, válido 7 dias", texto: "{nome}, sentimos muito. Você tem 15% no próximo pedido: {cupom}" },
    ],
  },
  {
    nome: "Resgatar quem está sumindo",
    descricao: "Quando o freguês passa do dobro do tempo em que costuma pedir, manda o pedido de sempre pronto no carrinho.",
    nos: [
      { id: "a", tipo: "gatilho", titulo: "Freguês ficou Sumindo", detalhe: "Passou de 2x o intervalo dele" },
      { id: "b", tipo: "filtro", titulo: "Aceita receber ofertas?", detalhe: "Respeita a LGPD" },
      { id: "c", tipo: "espera", titulo: "Esperar o melhor horário", detalhe: "O dia e a hora em que ele costuma pedir", horas: 0 },
      { id: "d", tipo: "whatsapp", titulo: "Mandar o de sempre", detalhe: "Carrinho já montado + 10% por 48h", texto: "Fala, {nome}! Faz um tempinho 🍔 Separamos seu {favorito} do jeitinho de sempre, com 10% até amanhã: {link_o_de_sempre}" },
      { id: "e", tipo: "espera", titulo: "Esperar 2 dias", detalhe: "", horas: 48 },
      { id: "f", tipo: "filtro", titulo: "Ainda não pediu?", detalhe: "Confere se voltou a pedir" },
      { id: "g", tipo: "etiqueta", titulo: "Marcar \"Precisa de atenção\"", detalhe: "Aparece no seu Pulso" },
    ],
  },
  {
    nome: "Presente de aniversário",
    descricao: "3 dias antes do aniversário, oferece um mimo para comemorar na casa.",
    nos: [
      { id: "a", tipo: "gatilho", titulo: "Aniversário chegando", detalhe: "3 dias antes" },
      { id: "b", tipo: "whatsapp", titulo: "Mandar o presente", detalhe: "Batata rústica grátis na semana do aniversário", texto: "{nome}, seu aniversário tá chegando 🎉 A batata é por nossa conta na semana do seu dia: {cupom}" },
      { id: "c", tipo: "etiqueta", titulo: "Marcar \"Aniversariante\"", detalhe: "Fica visível no pedido para a cozinha" },
    ],
  },
  {
    nome: "Avisar quem estava fora da área",
    descricao: "Quando você liga um bairro novo no Mapa de atuação, avisa todo mundo que tentou pedir de lá.",
    nos: [
      { id: "a", tipo: "gatilho", titulo: "Bairro entrou na área", detalhe: "Você ligou um bairro no Mapa de atuação" },
      { id: "b", tipo: "filtro", titulo: "Quem tentou pedir de lá", detalhe: "Lista de espera do bairro" },
      { id: "c", tipo: "whatsapp", titulo: "Avisar com frete grátis", detalhe: "Primeiro pedido sem taxa", texto: "Boa notícia, {nome}! Agora a gente entrega em {bairro}. O primeiro pedido vai sem taxa: {link_loja}" },
    ],
  },
  {
    nome: "Boas-vindas na primeira compra",
    descricao: "Agradece o primeiro pedido e convida para o clube de cashback.",
    nos: [
      { id: "a", tipo: "gatilho", titulo: "Primeiro pedido", detalhe: "Cliente novo na casa" },
      { id: "b", tipo: "espera", titulo: "Esperar 1 dia", detalhe: "", horas: 24 },
      { id: "c", tipo: "whatsapp", titulo: "Agradecer e convidar", detalhe: "Link do Clube Brasa", texto: "{nome}, valeu pelo primeiro pedido! Entra no Clube Brasa e ganhe 5% de volta em todo pedido: {link_clube}" },
      { id: "d", tipo: "pontos", titulo: "Dar 100 pontos", detalhe: "Bônus de boas-vindas" },
    ],
  },
  {
    nome: "Subiu para Fiel",
    descricao: "Quando o freguês chega a 14 pedidos, comemora e dá pontos em dobro no próximo.",
    nos: [
      { id: "a", tipo: "gatilho", titulo: "Mudou de nível", detalhe: "Chegou em Fiel ou Lenda da Casa" },
      { id: "b", tipo: "whatsapp", titulo: "Comemorar", detalhe: "", texto: "{nome}, agora você é {nivel} da Brasa! Seu próximo pedido vale pontos em dobro 🔥" },
      { id: "c", tipo: "pontos", titulo: "Pontos em dobro", detalhe: "No próximo pedido" },
    ],
  },
];

const AUTOS_INICIAIS: Automacao[] = [
  {
    ...MODELOS[0],
    id: "au1",
    estado: "ativa",
    disparos: 412,
    conversoes: 268,
    receita: 0,
    editada: agora - 6 * D,
    execucoes: exec(8, 2 * H, [
      ["enviado", "Nota 5 · \"chegou quentinho\""],
      ["enviado", "Nota 4"],
      ["parou", "Nota 2 · você foi avisado, cupom enviado"],
      ["enviado", "Nota 5"],
      ["enviado", "Sem resposta"],
      ["enviado", "Nota 5 · \"melhor smash da região\""],
      ["enviado", "Nota 4"],
      ["enviado", "Nota 5"],
    ]),
  },
  {
    ...MODELOS[1],
    id: "au2",
    estado: "ativa",
    disparos: 96,
    conversoes: 31,
    receita: 1874.6,
    editada: agora - 3 * D,
    execucoes: exec(8, 5 * H, [
      ["convertido", "Voltou e pediu X-Bacon Duplo", 62.4],
      ["enviado", "Mensagem lida"],
      ["convertido", "Voltou e pediu Combo Casal", 94.9],
      ["enviado", "Aguardando 2 dias"],
      ["parou", "Não aceita ofertas"],
      ["convertido", "Voltou e pediu Smash Bacon", 41.8],
      ["enviado", "Mensagem lida"],
      ["convertido", "Voltou e pediu Combo Smash", 38.9],
    ]),
  },
  {
    ...MODELOS[2],
    id: "au3",
    estado: "ativa",
    disparos: 38,
    conversoes: 21,
    receita: 1302.2,
    editada: agora - 20 * D,
    execucoes: exec(5, 11 * H, [
      ["convertido", "Comemorou com Combo Casal", 94.9],
      ["enviado", "Mensagem lida"],
      ["convertido", "Usou a batata grátis", 58.7],
      ["enviado", "Mensagem enviada"],
      ["convertido", "Pediu para 4 pessoas", 168.4],
    ]),
  },
  {
    ...MODELOS[3],
    id: "au4",
    estado: "pausada",
    disparos: 0,
    conversoes: 0,
    receita: 0,
    editada: agora - 1 * D,
    execucoes: [],
  },
];

// ---------------- Atendimento ----------------
export type Autor = "cliente" | "ia" | "equipe" | "sistema";
export type Mensagem = { id: string; de: Autor; texto: string; quando: number };
export type Humor = "positivo" | "neutro" | "negativo";
export type Conversa = {
  id: string;
  cliente: string;
  tel?: string;
  canal: "Loja" | "WhatsApp" | "Instagram";
  titulo: string;
  humor: Humor;
  status: "ia" | "equipe" | "fechada";
  naoLida: boolean;
  bairro?: string;
  mensagens: Mensagem[];
  resumo: string;
  pedidoGerado?: number;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const BAIRROS_NORM = BAIRROS.map((b) => ({ id: b.properties.id, nome: b.properties.nome, mun: (b.properties as { mun?: string }).mun ?? "", n: norm(b.properties.nome) })).sort((a, b) => b.n.length - a.n.length);

export type Resposta = { texto: string; humor: Humor; equipe: boolean; titulo: string; bairro?: string };

function zonaDe(id: string, zonas: Zona[]) {
  return zonas.find((z) => z.bairros.includes(id));
}

export function acharBairro(texto: string, zonas: Zona[] = ZONAS) {
  const t = ` ${norm(texto)} `;
  const achados = BAIRROS_NORM.filter((b) => b.n.length > 3 && t.includes(` ${b.n} `));
  if (!achados.length) return undefined;
  const maior = achados[0].n.length;
  const top = achados.filter((b) => b.n.length === maior);
  return top.find((b) => zonaDe(b.id, zonas)) ?? top.find((b) => b.id.startsWith("3304557")) ?? top[0];
}

export type Ajustes = { tom: "amigavel" | "direto"; emojis: boolean; recomendar: boolean; passarReclamacao: boolean; nomeAtendente: string };

export type LojaInfo = { nome: string; bairro: string; horario: string; aberto: boolean };

export function responder(texto: string, ctx: { zonas?: Zona[]; ajustes?: Ajustes; cardapio?: Produto[]; loja?: LojaInfo } = {}): Resposta {
  const zonas = ctx.zonas ?? ZONAS;
  const CARD = ctx.cardapio ?? CARDAPIO;
  const LJ = ctx.loja ?? LOJA;
  const aj = ctx.ajustes ?? store.get().ajustes;
  const e = (s: string) => (aj.emojis ? s : s.replace(/[\u{1F300}-\u{1FAFF}☀-➿]️?/gu, "").replace(/\s+([.!?,])/g, "$1").trim());
  const t = norm(texto);
  const tem = (...ps: string[]) => ps.some((p) => t.includes(p));
  const disponiveis = CARD.filter((p) => !p.esgotado);

  if (tem("frio", "atras", "demor", "errad", "faltou", "falta ", "veio sem", "ruim", "pessim", "horrivel", "reclama", "nao chegou", "cade meu", "estorno", "cru")) {
    return {
      texto: e(aj.passarReclamacao ? "Poxa, sinto muito por isso 😔 Já chamei alguém da equipe para resolver com você agora. Pode me mandar o número do pedido enquanto isso?" : "Poxa, sinto muito 😔 Me passa o número do pedido que eu verifico para você."),
      humor: "negativo",
      equipe: aj.passarReclamacao,
      titulo: "Problema com pedido",
    };
  }

  const b = acharBairro(texto, zonas);
  if (b || tem("entrega", "taxa", "frete", "atende", "chega ai", "chega aqui")) {
    if (!b) return { texto: e("Entregamos em vários bairros da região 🛵 Me diz o seu bairro que eu te passo a taxa e o tempo certinho."), humor: "neutro", equipe: false, titulo: "Taxa de entrega" };
    const z = zonaDe(b.id, zonas) ?? zonas.find((zz) => zz.municipios?.includes(b.mun));
    if (z) {
      const gratis = z.gratisAcima ? ` Acima de ${brl(z.gratisAcima)} a entrega é grátis.` : "";
      return {
        texto: e(`Entregamos aí, sim! (${b.nome}) 🛵 Taxa de ${brl(z.taxa)}, chega em ${z.tempo[0]} a ${z.tempo[1]} minutos e o pedido mínimo é ${brl(z.minimo)}.${gratis} Quer que eu te mande o link para pedir?`),
        humor: "positivo",
        equipe: false,
        titulo: `Entrega em ${b.nome}`,
        bairro: b.nome,
      };
    }
    return {
      texto: e(`Ainda não chegamos até ${b.nome} 😕 Deixei anotado que você quer, e assim que a gente chegar aí eu te aviso com o primeiro pedido sem taxa. Se preferir, dá para retirar aqui na ${LJ.bairro}.`),
      humor: "neutro",
      equipe: false,
      titulo: `Fora da área: ${b.nome}`,
      bairro: b.nome,
    };
  }

  const prod = disponiveis.find((p) => t.includes(norm(p.nome))) ?? disponiveis.find((p) => norm(p.nome).split(" ").filter((w) => w.length > 4).some((w) => t.includes(w)));
  if (prod && !tem("cardapio")) {
    const preco = prod.promo ? `${brl(prod.promo)} (de ${brl(prod.preco)})` : brl(prod.preco);
    return { texto: e(`O ${prod.nome} sai por ${preco}. ${prod.desc} Quer pedir? É só tocar em "Fazer pedido" 😉`), humor: "positivo", equipe: false, titulo: prod.nome };
  }
  if (tem("esgot", "onion")) {
    const esg = CARD.filter((p) => p.esgotado).map((p) => p.nome);
    return { texto: e(esg.length ? `Hoje acabou: ${esg.join(", ")}. O resto do cardápio está saindo normal 👍` : "Hoje não acabou nada, o cardápio está completo 👍"), humor: "neutro", equipe: false, titulo: "Disponibilidade" };
  }
  if (tem("vegetar", "vegan", "sem carne")) {
    const v = CARD.filter((p) => p.tags?.includes("Vegetariano"));
    if (!v.length) return { texto: e("Deixa eu confirmar com a equipe as opções sem carne de hoje, já te respondem aqui 🌱"), humor: "neutro", equipe: true, titulo: "Opção vegetariana" };
    return { texto: e(`Temos o ${v.map((p) => `${p.nome} (${brl(p.preco)})`).join(", ")}: ${v[0]?.desc} 🌱`), humor: "positivo", equipe: false, titulo: "Opção vegetariana" };
  }
  if (tem("cardapio", "menu", "o que tem", "oque tem", "recomenda", "mais pedido", "sugest", "indica", "melhor")) {
    const top = CARD.filter((p) => p.maisPedido && !p.esgotado);
    const lista = top.map((p) => `${p.nome} (${brl(p.promo ?? p.preco)})`).join(", ");
    const cats = [...new Set(CARD.map((p) => p.cat))].join(", ").toLowerCase();
    return { texto: e(aj.recomendar && lista ? `Os mais pedidos da casa são ${lista} 🔥 O cardápio completo está na loja.` : `O cardápio completo está na loja${cats ? `: ${cats}` : ""}.`), humor: "positivo", equipe: false, titulo: "Cardápio" };
  }
  if (tem("horario", "abre", "aberto", "fecha", "funciona", "hoje tem")) {
    return { texto: e(`${LJ.aberto ? "Estamos abertos agora" : "Agora estamos fechados"}! Funcionamos ${LJ.horario.replace("Hoje, ", "hoje das ").replace(" às ", " às ")} 🕗`), humor: "neutro", equipe: false, titulo: "Horário" };
  }
  if (tem("pix", "cartao", "dinheiro", "pagamento", "pagar", "troco")) {
    return { texto: e("Aceitamos Pix, cartão e dinheiro. Se for dinheiro, me diz se precisa de troco 💸"), humor: "neutro", equipe: false, titulo: "Formas de pagamento" };
  }
  if (tem("cashback", "clube", "pontos", "cupom", "desconto", "promo")) {
    return { texto: e("Pedindo pela nossa loja online você junta cashback para usar no próximo pedido 🎁 As promoções do dia aparecem marcadas no cardápio."), humor: "positivo", equipe: false, titulo: "Clube e promoções" };
  }
  if (tem("reserva", "mesa", "aniversario", "evento", "festa")) {
    return { texto: e("Dá para reservar sim! Me diz o dia, o horário e quantas pessoas, que a equipe confirma com você aqui mesmo 🎉"), humor: "positivo", equipe: true, titulo: "Reserva de mesa" };
  }
  if (tem("meu pedido", "status", "onde esta", "ja saiu", "saiu")) {
    return { texto: e("Já chamei a equipe para ver o seu pedido 📦 Se tiver o número (aparece na tela de confirmação), manda aqui."), humor: "neutro", equipe: true, titulo: "Status do pedido" };
  }
  if (tem("atendente", "humano", "pessoa", "falar com alguem", "gerente", "dono")) {
    return { texto: e("Claro! Já chamei alguém da equipe, é rapidinho 🙌"), humor: "neutro", equipe: true, titulo: "Pediu atendente" };
  }
  if (tem("obrigad", "valeu", "top", "perfeito", "show", "massa")) {
    return { texto: e("Nós que agradecemos! Bom apetite 🍔"), humor: "positivo", equipe: false, titulo: "Agradecimento" };
  }
  if (tem("oi", "ola", "boa noite", "boa tarde", "bom dia", "eai", "e ai", "opa")) {
    const nome = aj.nomeAtendente ? `Aqui é a ${aj.nomeAtendente}, da ${LJ.nome}. ` : "";
    return { texto: e(aj.tom === "amigavel" ? `Oi! 😊 ${nome}Posso te ajudar com o cardápio, a taxa de entrega do seu bairro, horário ou formas de pagamento. O que vai ser hoje?` : `Olá. ${nome}Posso informar cardápio, taxa de entrega, horário e pagamento.`), humor: "neutro", equipe: false, titulo: "Saudação" };
  }
  return { texto: e("Boa pergunta! Essa eu prefiro passar para alguém da equipe, que já te responde aqui mesmo 🙌"), humor: "neutro", equipe: true, titulo: "Dúvida para a equipe" };
}

function conversaDe(cliente: string, canal: Conversa["canal"], falas: string[], minutos: number, extra: Partial<Conversa> = {}): Conversa {
  const msgs: Mensagem[] = [];
  let quando = agora - minutos * 60_000;
  let ult: Resposta | null = null;
  let humor: Humor = "neutro";
  let status: Conversa["status"] = "ia";
  let titulo = "";
  let bairro: string | undefined;
  for (const f of falas) {
    msgs.push({ id: uid(), de: "cliente", texto: f, quando });
    quando += 40_000;
    if (status === "equipe") continue;
    ult = responder(f, { ajustes: AJUSTES_INICIAIS });
    msgs.push({ id: uid(), de: "ia", texto: ult.texto, quando });
    quando += 90_000;
    if (ult.humor !== "neutro") humor = ult.humor;
    if (ult.equipe) status = "equipe";
    if (!titulo || (ult.titulo !== "Saudação" && ult.titulo !== "Agradecimento")) titulo = ult.titulo === "Saudação" && titulo ? titulo : ult.titulo;
    bairro = ult.bairro ?? bairro;
  }
  return { id: uid(), cliente, canal, titulo, humor, status, naoLida: true, bairro, mensagens: msgs, resumo: "", ...extra };
}

const AJUSTES_INICIAIS: Ajustes = { tom: "amigavel", emojis: true, recomendar: true, passarReclamacao: true, nomeAtendente: "Bia" };

export function resumir(c: Conversa) {
  const temas = [...new Set(c.mensagens.filter((m) => m.de === "cliente").map((m) => responder(m.texto, { ajustes: AJUSTES_INICIAIS }).titulo).filter((x) => x !== "Saudação" && x !== "Agradecimento"))];
  const fim = c.status === "equipe" ? "A IA passou para a equipe." : c.pedidoGerado ? `Virou o pedido #${c.pedidoGerado}.` : "A IA resolveu sozinha.";
  return `${c.cliente.split(" ")[0]} perguntou sobre ${temas.join(", ").toLowerCase() || "a loja"}. ${fim}`;
}

const CONVERSAS_INICIAIS: Conversa[] = [
  conversaDe("Marcos Vinícius", "WhatsApp", ["boa noite", "meu pedido chegou frio e faltou a batata"], 6, { tel: "(21) 98812-4471", bairro: "Irajá" }),
  conversaDe("Visitante da loja", "Loja", ["vocês entregam no Méier?"], 14),
  conversaDe("Luana Costa", "Instagram", ["oi", "quanto ta o combo casal?", "vocês entregam na Penha Circular?"], 22, { pedidoGerado: 1049 }),
  conversaDe("Ana Paula Ribeiro", "WhatsApp", ["qual o mais pedido de vcs", "aceita pix?", "valeu!"], 48, { tel: "(21) 99731-2280", pedidoGerado: 1046, naoLida: false }),
  conversaDe("Visitante da loja", "Loja", ["tem opção vegetariana?"], 71, { naoLida: false }),
  conversaDe("Diego Martins", "WhatsApp", ["vocês fazem reserva para aniversário? somos 12 pessoas"], 95, { tel: "(21) 97004-1932", naoLida: false }),
  conversaDe("Bruno Souza", "Instagram", ["que horas abre hoje"], 180, { naoLida: false, status: "fechada" }),
  conversaDe("Camila Rocha", "WhatsApp", ["ainda tem onion rings?"], 260, { tel: "(21) 98123-0045", naoLida: false, status: "fechada" }),
];
CONVERSAS_INICIAIS.forEach((c) => (c.resumo = resumir(c)));
CONVERSAS_INICIAIS[3].status = "fechada";
CONVERSAS_INICIAIS[3].humor = "positivo";

// ---------------- Formulários ----------------
export type TipoCampo = "estrelas" | "nps" | "texto" | "escolha" | "data" | "hora" | "numero" | "telefone" | "nome";
export type Campo = { id: string; rotulo: string; tipo: TipoCampo; opcoes?: string[]; obrigatorio?: boolean };
export type RespostaForm = { id: string; quando: number; cliente: string; valores: Record<string, string | number> };
export type Formulario = { id: string; nome: string; descricao: string; estado: "no ar" | "pausado" | "rascunho"; campos: Campo[]; respostas: RespostaForm[]; obrigado: string; cor: string };

const nomesResp = fs.slice(3, 80).map((f) => f.nome);
function respostasPesquisa(n: number): RespostaForm[] {
  const coments = ["Chegou quentinho, perfeito", "Melhor smash da região", "Batata podia vir mais crocante", "Demorou um pouco mas valeu", "O molho da casa é absurdo", "", "", "Entregador muito educado", "Veio sem o picles que pedi", "", "Amei o brownie"];
  return Array.from({ length: n }, (_, i) => {
    const r = (i * 37) % 100;
    const estrelas = r < 62 ? 5 : r < 84 ? 4 : r < 93 ? 3 : r < 97 ? 2 : 1;
    const nps = estrelas === 5 ? 9 + (i % 2) : estrelas === 4 ? 7 + (i % 3) : estrelas === 3 ? 5 + (i % 3) : 2 + (i % 3);
    return {
      id: uid(),
      quando: agora - i * 5.3 * H,
      cliente: nomesResp[i % nomesResp.length],
      valores: { comida: estrelas, entrega: Math.max(1, Math.min(5, estrelas + ((i % 3) - 1) * (i % 4 === 0 ? 1 : 0))), nps, prato: ["X-Bacon Duplo", "Smash da Penha", "Combo Smash", "Batata cheddar e bacon", "Combo Casal"][i % 5], comentario: coments[i % coments.length] },
    };
  });
}

const FORMS_INICIAIS: Formulario[] = [
  {
    id: "fo1",
    nome: "Como estava seu pedido?",
    descricao: "Enviada 1h depois da entrega pela automação de avaliação.",
    estado: "no ar",
    cor: "#ff5b1f",
    obrigado: "Valeu demais! Sua opinião vai direto para a cozinha. 🔥",
    campos: [
      { id: "comida", rotulo: "Como estava a comida?", tipo: "estrelas", obrigatorio: true },
      { id: "entrega", rotulo: "E a entrega?", tipo: "estrelas", obrigatorio: true },
      { id: "nps", rotulo: "De 0 a 10, quanto você indicaria a Brasa para um amigo?", tipo: "nps", obrigatorio: true },
      { id: "prato", rotulo: "O que você pediu?", tipo: "escolha", opcoes: ["X-Bacon Duplo", "Smash da Penha", "Combo Smash", "Batata cheddar e bacon", "Combo Casal", "Outro"] },
      { id: "comentario", rotulo: "Quer contar mais alguma coisa?", tipo: "texto" },
    ],
    respostas: respostasPesquisa(64),
  },
  {
    id: "fo2",
    nome: "Reserva de mesa",
    descricao: "Para aniversários e grupos. A equipe confirma pelo WhatsApp.",
    estado: "no ar",
    cor: "#ffc03a",
    obrigado: "Pedido de reserva recebido! A gente confirma pelo WhatsApp em até 1 hora.",
    campos: [
      { id: "nome", rotulo: "Seu nome", tipo: "nome", obrigatorio: true },
      { id: "tel", rotulo: "WhatsApp", tipo: "telefone", obrigatorio: true },
      { id: "data", rotulo: "Dia", tipo: "data", obrigatorio: true },
      { id: "hora", rotulo: "Horário", tipo: "hora", obrigatorio: true },
      { id: "pessoas", rotulo: "Quantas pessoas?", tipo: "numero", obrigatorio: true },
      { id: "ocasiao", rotulo: "É alguma ocasião especial?", tipo: "escolha", opcoes: ["Aniversário", "Encontro", "Trabalho", "Só vontade de comer bem"] },
    ],
    respostas: [
      { id: uid(), quando: agora - 2 * H, cliente: "Diego Martins", valores: { nome: "Diego Martins", tel: "(21) 97004-1932", data: "14/11", hora: "20:00", pessoas: 12, ocasiao: "Aniversário" } },
      { id: uid(), quando: agora - 26 * H, cliente: "Juliana Lima", valores: { nome: "Juliana Lima", tel: "(21) 98220-5512", data: "15/11", hora: "21:00", pessoas: 4, ocasiao: "Encontro" } },
      { id: uid(), quando: agora - 50 * H, cliente: "Thiago Gomes", valores: { nome: "Thiago Gomes", tel: "(21) 96612-0081", data: "13/11", hora: "19:30", pessoas: 8, ocasiao: "Trabalho" } },
    ],
  },
  {
    id: "fo3",
    nome: "Clube Brasa",
    descricao: "Cadastro no cashback. Entra no QR code da mesa e da embalagem.",
    estado: "no ar",
    cor: "#49c27e",
    obrigado: "Bem-vindo ao Clube Brasa! Você já ganhou 100 pontos. 🎁",
    campos: [
      { id: "nome", rotulo: "Seu nome", tipo: "nome", obrigatorio: true },
      { id: "tel", rotulo: "WhatsApp", tipo: "telefone", obrigatorio: true },
      { id: "aniv", rotulo: "Data de aniversário", tipo: "data" },
      { id: "fav", rotulo: "Seu favorito da casa", tipo: "escolha", opcoes: ["Smash", "Burger da casa", "Frango", "Vegetariano"] },
    ],
    respostas: Array.from({ length: 41 }, (_, i) => ({ id: uid(), quando: agora - i * 9 * H, cliente: nomesResp[(i * 3) % nomesResp.length], valores: { nome: nomesResp[(i * 3) % nomesResp.length], tel: "(21) 9••••-••••", aniv: `${(i % 27) + 1}/${(i % 12) + 1}`, fav: ["Smash", "Burger da casa", "Frango", "Vegetariano"][i % 4] } })),
  },
];

// ---------------- Links da bio ----------------
export type TipoBotao = "pedir" | "cardapio" | "whatsapp" | "instagram" | "reserva" | "clube" | "avaliar" | "maps" | "outro";
export type Botao = { id: string; tipo: TipoBotao; rotulo: string; url: string; ativo: boolean; destaque?: boolean; cliques: number };
export type PaginaLinks = { endereco: string; titulo: string; bio: string; tema: "brasa" | "noite" | "papel"; botoes: Botao[]; visitas: number; pedidos: number; receita: number; cliquesDia: number[] };

const LINKS_INICIAL: PaginaLinks = {
  endereco: "brasaburger",
  titulo: "Brasa Burger",
  bio: "Smash na brasa na Vila da Penha 🔥 Entrega até 60 min · Seg a Dom, 18h às 23h30",
  tema: "brasa",
  visitas: 3184,
  pedidos: 212,
  receita: 11482.3,
  cliquesDia: [42, 38, 51, 47, 66, 98, 104, 55, 49, 58, 61, 72, 121, 133, 60, 52, 49, 63, 70, 118, 126, 58, 44, 50, 57, 69, 112, 140, 61, 48],
  botoes: [
    { id: "b1", tipo: "pedir", rotulo: "Fazer pedido com 5% de volta", url: "#loja", ativo: true, destaque: true, cliques: 1312 },
    { id: "b2", tipo: "cardapio", rotulo: "Ver o cardápio", url: "#loja", ativo: true, cliques: 604 },
    { id: "b3", tipo: "whatsapp", rotulo: "Falar no WhatsApp", url: "https://wa.me/5521999999999", ativo: true, cliques: 288 },
    { id: "b4", tipo: "reserva", rotulo: "Reservar mesa", url: "#pesquisa", ativo: true, cliques: 97 },
    { id: "b5", tipo: "clube", rotulo: "Entrar no Clube Brasa", url: "#pesquisa", ativo: true, cliques: 141 },
    { id: "b6", tipo: "maps", rotulo: "Como chegar", url: "https://maps.google.com", ativo: true, cliques: 76 },
    { id: "b7", tipo: "avaliar", rotulo: "Avaliar no Google", url: "https://google.com", ativo: false, cliques: 0 },
  ],
};

// ---------------- Kanban ----------------
export type Etapa = "novo" | "voltando" | "fiel" | "esfriando" | "sumindo";

// ---------------- estado global ----------------
type Estado = {
  automacoes: Automacao[];
  conversas: Conversa[];
  ajustes: Ajustes;
  forms: Formulario[];
  formPublico: string;
  links: PaginaLinks;
  etapas: Record<string, Etapa>;
  conversaLoja?: string;
};

export const store = criarStore<Estado>({
  automacoes: AUTOS_INICIAIS,
  conversas: CONVERSAS_INICIAIS,
  ajustes: AJUSTES_INICIAIS,
  forms: FORMS_INICIAIS,
  formPublico: "fo1",
  links: LINKS_INICIAL,
  etapas: {},
});

export function useCrescer<T>(sel: (s: Estado) => T): T {
  return useSyncExternalStore(store.sub, () => sel(store.get()));
}

/** Ganchos de gravação no banco (ligados pelo atendimento real quando a loja usa o Supabase). */
export const persistir: {
  conversa?: (c: Conversa) => void;
  equipe?: (id: string, texto: string) => void;
  ajustes?: (a: Ajustes) => void;
} = {};

export const crescer = {
  // automações
  setAuto(id: string, f: (a: Automacao) => Automacao) {
    store.set((s) => ({ ...s, automacoes: s.automacoes.map((a) => (a.id === id ? { ...f(a), editada: Date.now() } : a)) }));
  },
  novaDeModelo(i: number) {
    const m = MODELOS[i];
    const a: Automacao = { ...m, nos: m.nos.map((n) => ({ ...n })), id: uid(), estado: "rascunho", disparos: 0, conversoes: 0, receita: 0, execucoes: [], editada: Date.now() };
    store.set((s) => ({ ...s, automacoes: [a, ...s.automacoes] }));
    return a.id;
  },
  removerAuto(id: string) {
    store.set((s) => ({ ...s, automacoes: s.automacoes.filter((a) => a.id !== id) }));
  },
  registrarTeste(id: string, cliente: string) {
    crescer.setAuto(id, (a) => ({ ...a, execucoes: [{ id: uid(), quando: Date.now(), cliente, resultado: "teste", nota: "Teste: percorreu todos os passos" }, ...a.execucoes] }));
  },
  // atendimento
  setConversa(id: string, f: (c: Conversa) => Conversa) {
    store.set((s) => ({ ...s, conversas: s.conversas.map((c) => (c.id === id ? f(c) : c)) }));
    const c = store.get().conversas.find((x) => x.id === id);
    if (c) persistir.conversa?.(c);
  },
  enviarEquipe(id: string, texto: string) {
    store.set((s) => ({ ...s, conversas: s.conversas.map((c) => (c.id === id ? { ...c, status: "equipe", naoLida: false, mensagens: [...c.mensagens, { id: uid(), de: "equipe", texto, quando: Date.now() }] } : c)) }));
    persistir.equipe?.(id, texto);
  },
  setAjustes(p: Partial<Ajustes>) {
    store.set((s) => ({ ...s, ajustes: { ...s.ajustes, ...p } }));
    persistir.ajustes?.(store.get().ajustes);
  },
  /** Mensagem do cliente vinda do chat da loja. Cria a conversa na primeira vez. */
  falarNaLoja(texto: string, zonas?: Zona[]) {
    const s = store.get();
    let id = s.conversaLoja;
    const conv = id ? s.conversas.find((c) => c.id === id) : undefined;
    const msg: Mensagem = { id: uid(), de: "cliente", texto, quando: Date.now() };
    if (!conv) {
      id = uid();
      const nova: Conversa = { id, cliente: "Visitante da loja", canal: "Loja", titulo: "Nova conversa", humor: "neutro", status: "ia", naoLida: true, mensagens: [msg], resumo: "" };
      store.set((st) => ({ ...st, conversaLoja: id, conversas: [nova, ...st.conversas] }));
    } else {
      crescer.setConversa(id!, (c) => ({ ...c, naoLida: true, mensagens: [...c.mensagens, msg] }));
    }
    const atual = store.get().conversas.find((c) => c.id === id)!;
    if (atual.status === "equipe") return null;
    const r = responder(texto, { zonas });
    setTimeout(() => {
      crescer.setConversa(id!, (c) => {
        const nc: Conversa = {
          ...c,
          humor: r.humor === "neutro" ? c.humor : r.humor,
          status: r.equipe ? "equipe" : c.status === "fechada" ? "ia" : c.status,
          titulo: r.titulo === "Saudação" && c.titulo !== "Nova conversa" ? c.titulo : r.titulo,
          bairro: r.bairro ?? c.bairro,
          mensagens: [...c.mensagens, { id: uid(), de: "ia", texto: r.texto, quando: Date.now() }, ...(r.equipe ? [{ id: uid(), de: "sistema" as Autor, texto: "A conversa foi passada para a equipe da loja.", quando: Date.now() }] : [])],
        };
        nc.resumo = resumir(nc);
        return nc;
      });
    }, 700);
    return r;
  },
  // formulários
  setForm(id: string, f: (x: Formulario) => Formulario) {
    store.set((s) => ({ ...s, forms: s.forms.map((x) => (x.id === id ? f(x) : x)) }));
  },
  novoForm() {
    const f: Formulario = { id: uid(), nome: "Novo formulário", descricao: "", estado: "rascunho", cor: "#ff5b1f", obrigado: "Obrigado! Recebemos sua resposta.", campos: [{ id: uid(), rotulo: "Seu nome", tipo: "nome", obrigatorio: true }], respostas: [] };
    store.set((s) => ({ ...s, forms: [f, ...s.forms] }));
    return f.id;
  },
  responderForm(id: string, valores: Record<string, string | number>) {
    const nome = String(valores.nome ?? "Cliente da loja");
    crescer.setForm(id, (f) => ({ ...f, respostas: [{ id: uid(), quando: Date.now(), cliente: nome, valores }, ...f.respostas] }));
  },
  abrirPublico(id: string) {
    store.set((s) => ({ ...s, formPublico: id }));
  },
  // links
  setLinks(f: (p: PaginaLinks) => PaginaLinks) {
    store.set((s) => ({ ...s, links: f(s.links) }));
  },
  clique(id: string) {
    crescer.setLinks((p) => ({ ...p, botoes: p.botoes.map((b) => (b.id === id ? { ...b, cliques: b.cliques + 1 } : b)), cliquesDia: [...p.cliquesDia.slice(0, -1), p.cliquesDia[p.cliquesDia.length - 1] + 1] }));
  },
  // kanban
  moverEtapa(clienteId: string, e: Etapa) {
    store.set((s) => ({ ...s, etapas: { ...s.etapas, [clienteId]: e } }));
  },
};

export function etapaAuto(f: { pedidos: number; status: string; nivel: string }): Etapa {
  if (f.status === "sumindo") return "sumindo";
  if (f.status === "atrasado") return "esfriando";
  if (f.nivel === "Fiel" || f.nivel === "Lenda da Casa") return "fiel";
  if (f.pedidos <= 9) return "novo";
  return "voltando";
}

export const quandoTxt = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
};

export { nomeBairro };
