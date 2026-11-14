// O dono troca o e-mail de login dele (confirmando a senha atual). Não depende do e-mail do Supabase.
import { SUPA_URL } from "../_lib/base.js";
import { emailConfigurado, enviarEmail } from "../_lib/email.js";

const ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  if (!SERVICE) return res.status(500).json({ erro: "Falta configurar o servidor" });
  const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const u = jwt ? await fetch(`${SUPA_URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${jwt}` } }).then((r) => (r.ok ? r.json() : null)).catch(() => null) : null;
  if (!u?.id) return res.status(401).json({ erro: "Entre de novo no painel e tente outra vez." });

  const { novo, senha } = req.body || {};
  const em = String(novo || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return res.status(400).json({ erro: "Informe um e-mail válido." });
  if (em === String(u.email).toLowerCase()) return res.status(400).json({ erro: "Esse já é o seu e-mail de login." });

  // confere a senha atual
  const ok = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: u.email, password: String(senha || "") }),
  }).then((r) => r.ok).catch(() => false);
  if (!ok) return res.status(400).json({ erro: "Senha atual incorreta." });

  const r = await fetch(`${SUPA_URL}/auth/v1/admin/users/${u.id}`, {
    method: "PUT",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: em, email_confirm: true }),
  });
  const c = await r.json().catch(() => ({}));
  if (!r.ok) {
    const m = c.msg || c.message || "";
    return res.status(400).json({ erro: /already|registered|exists/i.test(m) ? "Esse e-mail já é usado por outra conta." : m || "Não consegui trocar o e-mail." });
  }
  if (emailConfigurado()) {
    const aviso = `O e-mail de login do seu painel no Freguês foi trocado de ${u.email} para ${em}. Se não foi você, fale com a equipe do Freguês.`;
    await Promise.allSettled([u.email, em].map((para) => enviarEmail({ para, assunto: "Seu e-mail de login no Freguês mudou", texto: aviso })));
  }
  return res.status(200).json({ ok: true });
}
