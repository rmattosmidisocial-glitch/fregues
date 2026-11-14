// O dono cria o login de alguém da equipe (caixa, garçom, cozinha, entregador, gerente) com senha provisória.
import { SUPA_URL, rpcServidor, erroServidor } from "../_lib/base.js";

const ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAPEIS = ["gerente", "caixa", "cozinha", "garcom", "entregador"];

async function auth(caminho, metodo, corpo) {
  const r = await fetch(`${SUPA_URL}/auth/v1/admin/${caminho}`, {
    method: metodo,
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const c = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(c.msg || c.message || `Supabase respondeu ${r.status}`);
  return c;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  if (!SERVICE) return res.status(500).json({ erro: "Falta configurar o servidor" });
  const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const { org_id, email, papel, senha } = req.body || {};
  if (!jwt || !org_id) return res.status(401).json({ erro: "Entre de novo no painel." });

  // quem pediu é o dono desta loja?
  const p = await fetch(`${SUPA_URL}/rest/v1/rpc/meu_papel`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_org: org_id }),
  }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (p !== "dono") return res.status(403).json({ erro: "Só o dono da loja cadastra a equipe." });

  const em = String(email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return res.status(400).json({ erro: "Informe um e-mail válido." });
  if (!PAPEIS.includes(papel)) return res.status(400).json({ erro: "Escolha a função." });
  if (String(senha || "").length < 8) return res.status(400).json({ erro: "A senha provisória precisa ter 8 caracteres ou mais." });

  try {
    const ja = (await rpcServidor("usuario_por_email", { p_email: em })) || [];
    let id;
    if (ja.length) {
      if (ja[0].admin) return res.status(409).json({ erro: "Esse e-mail é de um administrador do Freguês." });
      id = ja[0].id; // já tem login: só ganha acesso a esta loja, a senha dele continua a mesma
    } else {
      id = (await auth("users", "POST", { email: em, password: senha, email_confirm: true, user_metadata: { trocar_senha: true } })).id;
    }
    await rpcServidor("equipe_vincular_srv", { p_org: org_id, p_user: id, p_papel: papel });
    return res.status(200).json({ ok: true, ja_existia: ja.length > 0 });
  } catch (e) {
    await erroServidor("conta/equipe", e);
    return res.status(500).json({ erro: e.message });
  }
}
