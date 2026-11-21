// Planos ativos para o site (usefregues.com.br): o que o Admin muda aparece no site sozinho.
import { lerServidor, erroServidor } from "./_lib/base.js";

const ORIGENS = ["https://usefregues.com.br", "https://www.usefregues.com.br", "https://fregues-site.vercel.app", "http://localhost:5191"];

export default async function handler(req, res) {
  const o = req.headers.origin;
  if (o && ORIGENS.includes(o)) res.setHeader("Access-Control-Allow-Origin", o);
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  if (req.method === "OPTIONS") return res.status(204).end();
  try {
    const ps = await lerServidor("plans", "ativo=eq.true&order=ordem.asc&select=id,nome,preco,preco_primeiro_mes,descricao,recursos,usuarios,lojas");
    return res.status(200).json(ps.map((p) => ({ ...p, preco: Number(p.preco), preco_primeiro_mes: p.preco_primeiro_mes == null ? null : Number(p.preco_primeiro_mes) })));
  } catch (e) {
    await erroServidor("planos", e);
    return res.status(502).json({ erro: "Não consegui ler os planos" });
  }
}
