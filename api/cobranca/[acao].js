// Rotas de cobrança da mensalidade (Admin) numa função só: /api/cobranca/ativar · atualizar · saude
import ativar from "../_rotas/cobranca/ativar.js";
import atualizar from "../_rotas/cobranca/atualizar.js";
import saude from "../_rotas/cobranca/saude.js";

const ROTAS = { ativar, atualizar, saude };

export default async function handler(req, res) {
  const r = ROTAS[req.query.acao];
  if (!r) return res.status(404).json({ erro: "Rota não existe" });
  return r(req, res);
}
