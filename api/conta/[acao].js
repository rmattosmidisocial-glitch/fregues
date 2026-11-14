// Rotas da conta do restaurante numa função só (o plano da Vercel limita o número de funções).
// /api/conta/email · equipe · esqueci · redefinir · ... (cada uma está em api/_rotas/conta)
import email from "../_rotas/conta/email.js";
import equipe from "../_rotas/conta/equipe.js";
import esqueci from "../_rotas/conta/esqueci.js";
import redefinir from "../_rotas/conta/redefinir.js";

const ROTAS = { email, equipe, esqueci, redefinir };

export default async function handler(req, res) {
  const r = ROTAS[req.query.acao];
  if (!r) return res.status(404).json({ erro: "Rota não existe" });
  return r(req, res);
}
