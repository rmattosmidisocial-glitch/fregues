// Lê a foto (ou PDF) de uma nota fiscal de compra com IA e devolve os itens já em kg, litro ou
// unidade, com quantidade e preço, para o dono conferir antes de lançar no estoque.
// Usa a mesma ANTHROPIC_API_KEY da leitura de cardápio. Só aceita quem está logado no painel.
import { SUPA_URL, erroServidor } from "../_lib/base.js";

const ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const CHAVE = process.env.ANTHROPIC_API_KEY;
const MODELO = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const WORKSPACE = process.env.ANTHROPIC_WORKSPACE_ID;

export const config = { maxDuration: 120 };

const FERRAMENTA = {
  name: "registrar_nota",
  description: "Registra os itens comprados na nota fiscal, já convertidos para a unidade de controle de estoque.",
  input_schema: {
    type: "object",
    properties: {
      fornecedor: { type: "string", description: "Nome do fornecedor/emitente. Vazio se não aparecer." },
      data: { type: "string", description: "Data da compra no formato DD/MM/AAAA. Vazio se não aparecer." },
      total_nota: { type: ["number", "null"], description: "Valor total da nota em reais." },
      itens: {
        type: "array",
        items: {
          type: "object",
          properties: {
            descricao: { type: "string", description: "Descrição do produto como está na nota." },
            nome: { type: "string", description: "Nome limpo e curto do produto, como um cozinheiro chamaria (ex.: 'Bacon', 'Queijo prato', 'Coca-Cola lata 350ml'). Sem marca, a não ser que importe." },
            unidade: { type: "string", enum: ["kg", "l", "un"], description: "Unidade de controle: kg para o que é pesado, l para líquido a granel (óleo, leite, molho em galão), un para o que se conta (latas, garrafas, pães, embalagens, ovos)." },
            quantidade: { type: "number", description: "Quantidade TOTAL comprada já na unidade escolhida. Ex.: 4 pacotes de 500 g = 2 (kg); 2 caixas com 12 latas = 24 (un); 3 galões de 900 ml = 2.7 (l)." },
            valor_total: { type: "number", description: "Valor total pago neste item, em reais (com desconto do item, se houver)." },
          },
          required: ["descricao", "nome", "unidade", "quantidade", "valor_total"],
        },
      },
      avisos: { type: "array", items: { type: "string" }, description: "O que o dono deve conferir (valor ilegível, quantidade duvidosa, item cortado). Curto, em português." },
    },
    required: ["fornecedor", "data", "total_nota", "itens", "avisos"],
  },
};

const INSTRUCOES = `Você lê notas fiscais e cupons de compra de restaurantes do Brasil (NF-e, NFC-e, cupom de atacarejo, nota de fornecedor) e transcreve os itens comprados para lançar no estoque.
Regras:
- Um item por linha de produto da nota. Ignore impostos, frete, troco, forma de pagamento, totais e propaganda.
- Converta a quantidade para a unidade de controle: gramas viram kg, ml vira litro (quando é a granel), embalagens que se contam viram unidades. Leia a descrição para achar o conteúdo (ex.: "PCT 500G", "CX C/12", "FD 6X2L").
- Bebida em lata/garrafa e itens que o restaurante conta um a um: unidade "un", contando cada lata/garrafa.
- valor_total é o que foi pago no item (quantidade × preço unitário da nota, menos desconto do item).
- Não invente item, quantidade ou valor. Se algo estiver ilegível, faça a melhor leitura e coloque um aviso.`;

async function usuarioValido(req) {
  const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!jwt || !SUPA_URL || !ANON) return false;
  const r = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${jwt}` } }).catch(() => null);
  return !!(r && r.ok);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  if (!CHAVE) return res.status(503).json({ erro: "A leitura com IA ainda não foi ligada (falta a ANTHROPIC_API_KEY na Vercel)." });
  if (!(await usuarioValido(req))) return res.status(401).json({ erro: "Entre no painel de novo para ler a nota." });

  const arquivos = Array.isArray(req.body?.arquivos) ? req.body.arquivos.slice(0, 4) : [];
  const conteudo = [];
  for (const a of arquivos) {
    if (typeof a?.base64 !== "string") continue;
    if (a.tipo === "application/pdf") conteudo.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: a.base64 } });
    else if (/^image\/(jpeg|png|webp|gif)$/.test(a.tipo)) conteudo.push({ type: "image", source: { type: "base64", media_type: a.tipo, data: a.base64 } });
  }
  if (!conteudo.length) return res.status(400).json({ erro: "Envie a foto (JPG/PNG) ou o PDF da nota." });
  conteudo.push({ type: "text", text: "Transcreva os itens desta nota de compra. Responda chamando a ferramenta registrar_nota uma única vez." });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": CHAVE, "anthropic-version": "2023-06-01", "content-type": "application/json", ...(WORKSPACE ? { "anthropic-workspace-id": WORKSPACE } : {}) },
      body: JSON.stringify({ model: MODELO, max_tokens: 8000, system: INSTRUCOES, tools: [FERRAMENTA], tool_choice: { type: "tool", name: "registrar_nota" }, messages: [{ role: "user", content: conteudo }] }),
    });
    const corpo = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = corpo?.error?.message || String(r.status);
      if (r.status === 401) return res.status(502).json({ erro: "A chave da IA foi recusada (inválida ou revogada). Gere outra e troque na Vercel." });
      if (/credit|balance/i.test(msg)) return res.status(502).json({ erro: "A conta da IA está sem crédito. Adicione crédito no console da Anthropic." });
      return res.status(502).json({ erro: "A IA não conseguiu ler agora: " + msg });
    }
    const dados = (corpo.content || []).find((c) => c.type === "tool_use")?.input;
    if (!dados?.itens?.length) return res.status(502).json({ erro: "Não encontrei itens. Tente uma foto mais nítida, de frente e com a nota inteira." });
    dados.itens = dados.itens.filter((i) => i && Number(i.quantidade) > 0).map((i) => ({ ...i, quantidade: Math.round(Number(i.quantidade) * 1000) / 1000, valor_total: Math.round(Number(i.valor_total || 0) * 100) / 100 }));
    return res.status(200).json(dados);
  } catch (e) {
    await erroServidor("estoque/nota", e);
    return res.status(502).json({ erro: "Falha ao falar com a IA: " + e.message });
  }
}
