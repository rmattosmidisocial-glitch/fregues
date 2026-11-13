// Lê um cardápio (fotos ou PDF) com IA e devolve os produtos organizados para o dono revisar.
// Precisa da variável ANTHROPIC_API_KEY na Vercel. Só aceita quem está logado no painel.
import { SUPA_URL } from "../_lib/base.js";

const ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const CHAVE = process.env.ANTHROPIC_API_KEY;
const MODELO = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
// Chave pessoal/de conta de serviço sem workspace fixo precisa dizer o workspace (opcional).
const WORKSPACE = process.env.ANTHROPIC_WORKSPACE_ID;

export const config = { maxDuration: 120 };

const FERRAMENTA = {
  name: "registrar_cardapio",
  description: "Registra todos os produtos encontrados no cardápio, organizados por categoria.",
  input_schema: {
    type: "object",
    properties: {
      categorias: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nome: { type: "string", description: "Nome da categoria como aparece no cardápio (ex.: Pizzas, Bebidas)." },
            produtos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nome: { type: "string" },
                  descricao: { type: "string", description: "Ingredientes ou descrição, se houver. Vazio se não houver." },
                  preco: { type: ["number", "null"], description: "Preço em reais. Com vários tamanhos, o MENOR preço. null se ilegível ou ausente." },
                  complementos: {
                    type: "array",
                    description: "Tamanhos, adicionais, bordas, sabores etc. ligados a este produto.",
                    items: {
                      type: "object",
                      properties: {
                        nome: { type: "string", description: "Ex.: Tamanho, Adicionais, Borda" },
                        obrigatorio: { type: "boolean", description: "true para tamanho/sabor que o cliente precisa escolher" },
                        max: { type: "integer", description: "Quantas opções o cliente pode marcar" },
                        opcoes: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: { nome: { type: "string" }, preco: { type: "number", description: "Valor A MAIS sobre o preço do produto (0 se não muda)." } },
                            required: ["nome", "preco"],
                          },
                        },
                      },
                      required: ["nome", "obrigatorio", "max", "opcoes"],
                    },
                  },
                },
                required: ["nome", "descricao", "preco", "complementos"],
              },
            },
          },
          required: ["nome", "produtos"],
        },
      },
      avisos: { type: "array", items: { type: "string" }, description: "Coisas que o dono deve conferir (preço ilegível, item cortado na foto etc.). Curto, em português." },
    },
    required: ["categorias", "avisos"],
  },
};

const INSTRUCOES = `Você lê cardápios de restaurantes, bares, pizzarias e hamburguerias do Brasil e transcreve TODOS os produtos com fidelidade.
Regras:
- Copie nomes e preços exatamente como estão. Não invente produto, preço nem descrição.
- Mantenha as categorias do cardápio. Se não houver, agrupe de forma óbvia (Lanches, Bebidas...).
- Produto com vários tamanhos (P/M/G, 300ml/500ml, broto/grande): preço = o menor; crie o complemento "Tamanho" obrigatório, max 1, com cada tamanho e a DIFERENÇA de preço em relação ao menor.
- Lista de adicionais que vale para vários produtos: coloque como complemento "Adicionais" (não obrigatório) em cada produto ao qual se aplica.
- Pizza meio a meio, combos e promoções: registre como produto normal com o preço indicado.
- Preço ilegível: preco = null e um aviso.
- Ignore telefone, endereço, horário, taxa de entrega e textos de propaganda.`;

async function usuarioValido(req) {
  const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!jwt || !SUPA_URL || !ANON) return false;
  const r = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${jwt}` } }).catch(() => null);
  return !!(r && r.ok);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  if (!CHAVE) return res.status(503).json({ erro: "A leitura com IA ainda não foi ligada (falta a ANTHROPIC_API_KEY na Vercel).", semChave: true });
  if (!(await usuarioValido(req))) return res.status(401).json({ erro: "Entre no painel de novo para importar." });

  const arquivos = Array.isArray(req.body?.arquivos) ? req.body.arquivos.slice(0, 8) : [];
  if (!arquivos.length) return res.status(400).json({ erro: "Nenhum arquivo enviado." });

  const conteudo = [];
  for (const a of arquivos) {
    if (typeof a?.base64 !== "string") continue;
    if (a.tipo === "application/pdf") conteudo.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: a.base64 } });
    else if (/^image\/(jpeg|png|webp|gif)$/.test(a.tipo)) conteudo.push({ type: "image", source: { type: "base64", media_type: a.tipo, data: a.base64 } });
  }
  if (!conteudo.length) return res.status(400).json({ erro: "Formato não suportado. Envie foto (JPG/PNG) ou PDF." });
  conteudo.push({ type: "text", text: "Transcreva este cardápio completo. Responda chamando a ferramenta registrar_cardapio uma única vez, com todos os produtos." });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": CHAVE,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        ...(WORKSPACE ? { "anthropic-workspace-id": WORKSPACE } : {}),
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 16000,
        system: INSTRUCOES,
        tools: [FERRAMENTA],
        tool_choice: { type: "auto" },
        messages: [{ role: "user", content: conteudo }],
      }),
    });
    const corpo = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = corpo?.error?.message || String(r.status);
      if (/workspace/i.test(msg)) return res.status(502).json({ erro: "A chave da IA não tem workspace definido. Crie a chave escolhendo um workspace, ou adicione ANTHROPIC_WORKSPACE_ID na Vercel." });
      if (r.status === 401) return res.status(502).json({ erro: "A chave da IA foi recusada (inválida ou revogada). Gere outra e troque na Vercel." });
      if (/credit|balance/i.test(msg)) return res.status(502).json({ erro: "A conta da IA está sem crédito. Adicione crédito no console da Anthropic." });
      return res.status(502).json({ erro: "A IA não conseguiu ler agora: " + msg });
    }
    const uso = (corpo.content || []).find((c) => c.type === "tool_use");
    let entrada = uso?.input;
    if (!entrada) {
      // às vezes o modelo responde em texto com o JSON; tenta aproveitar
      const txt = (corpo.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
      const m = txt.match(/\{[\s\S]*\}/);
      try {
        entrada = m ? JSON.parse(m[0]) : null;
      } catch {
        entrada = null;
      }
    }
    if (!entrada?.categorias) return res.status(502).json({ erro: "A IA não devolveu o cardápio. Tente uma foto mais nítida." });
    const truncado = corpo.stop_reason === "max_tokens";
    const dados = entrada;
    if (truncado) (dados.avisos ||= []).push("O cardápio é muito grande e pode ter ficado incompleto. Envie as páginas restantes em outra importação.");
    return res.status(200).json(dados);
  } catch (e) {
    return res.status(502).json({ erro: "Falha ao falar com a IA: " + e.message });
  }
}
