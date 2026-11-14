// Troca a senha pelo link de uso único do e-mail.
import crypto from "node:crypto";
import { SUPA_URL } from "../_lib/base.js";

const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  const { token, senha } = req.body || {};
  if (String(senha || "").length < 8) return res.status(400).json({ erro: "A senha precisa ter pelo menos 8 caracteres." });
  const hash = crypto.createHash("sha256").update(String(token || "")).digest("hex");
  const [l] = await fetch(`${SUPA_URL}/rest/v1/senha_links?token_hash=eq.${hash}&select=user_id,expira_em,usado_em`, { headers: h }).then((r) => r.json()).catch(() => []);
  if (!l || l.usado_em || new Date(l.expira_em) < new Date()) return res.status(400).json({ erro: "Este link venceu ou já foi usado. Peça outro em \"Esqueci minha senha\"." });
  const r = await fetch(`${SUPA_URL}/auth/v1/admin/users/${l.user_id}`, { method: "PUT", headers: h, body: JSON.stringify({ password: senha, user_metadata: { trocar_senha: false } }) });
  if (!r.ok) return res.status(500).json({ erro: "Não consegui trocar a senha. Tente de novo." });
  await fetch(`${SUPA_URL}/rest/v1/senha_links?token_hash=eq.${hash}`, { method: "PATCH", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify({ usado_em: new Date().toISOString() }) });
  return res.status(200).json({ ok: true });
}
