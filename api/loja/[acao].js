// Integrações de cada restaurante numa função só:
// /api/loja/chave (liga Mercado Pago, WhatsApp ou Focus NFe) · pix · conferir · mp (aviso do Mercado Pago) · whatsapp · nfce
import chave from "../_rotas/loja/chave.js";
import pix, { avisoMP, conferir } from "../_rotas/loja/pix.js";
import whatsapp from "../_rotas/loja/whatsapp.js";
import nfce from "../_rotas/loja/nfce.js";

const ROTAS = { chave, pix, conferir, mp: avisoMP, whatsapp, nfce };

export default async function handler(req, res) {
  const r = ROTAS[req.query.acao];
  if (!r) return res.status(404).json({ erro: "Rota não existe" });
  return r(req, res);
}
