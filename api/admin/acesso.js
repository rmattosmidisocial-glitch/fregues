// Cria (ou vincula) o login do dono do restaurante com uma senha provisória. Só o administrador do Freguês usa.
import { SUPA_URL, exigirAdmin, lerServidor, rpcServidor } from "../_lib/base.js";
import { emailAcesso, emailConfigurado, enviarEmail } from "../_lib/email.js";

const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function auth(caminho, metodo, corpo) {
  const r = await fetch(`${SUPA_URL}/auth/v1/admin/${caminho}`, {
    method: metodo,
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const c = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(c.msg || c.message || c.error_description || `Supabase respondeu ${r.status}`);
  return c;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  if (!SERVICE) return res.status(500).json({ erro: "Falta a chave SUPABASE_SERVICE_ROLE_KEY na Vercel" });
  if (!(await exigirAdmin(req))) return res.status(403).json({ erro: "Só o administrador do Freguês pode criar acessos" });

  const { org_id, email, senha, redefinir } = req.body || {};
  const em = String(email || "").trim().toLowerCase();
  if (!org_id) return res.status(400).json({ erro: "Cliente não informado" });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return res.status(400).json({ erro: "Informe um e-mail válido" });
  if (String(senha || "").length < 8) return res.status(400).json({ erro: "A senha precisa ter pelo menos 8 caracteres" });

  try {
    const ja = (await rpcServidor("usuario_por_email", { p_email: em })) || [];
    let id;
    let senhaTrocada = true;
    if (ja.length) {
      if (ja[0].admin) return res.status(409).json({ erro: "Esse e-mail é de um administrador do Freguês. Use o e-mail do dono do restaurante." });
      id = ja[0].id;
      if (redefinir) await auth(`users/${id}`, "PUT", { password: senha, email_confirm: true, user_metadata: { trocar_senha: true } });
      else senhaTrocada = false;
    } else {
      const u = await auth("users", "POST", { email: em, password: senha, email_confirm: true, user_metadata: { trocar_senha: true } });
      id = u.id;
    }
    await rpcServidor("dono_vincular", { p_org: org_id, p_user: id, p_email: em });
    if (!senhaTrocada) return res.status(200).json({ ok: true, email: em, ja_existia: true, senha_trocada: false });

    // manda o acesso para o e-mail do dono
    const [st] = await lerServidor("stores", `select=nome,slug&org_id=eq.${encodeURIComponent(org_id)}&limit=1`);
    const link = `https://${req.headers["x-forwarded-host"] || req.headers.host}/?r=${st?.slug || ""}#painel`;
    let enviado = false;
    let aviso = "";
    if (emailConfigurado()) try {
      const m = emailAcesso({ loja: st?.nome || "sua loja", link, email: em, senha, novaSenha: ja.length > 0 });
      await enviarEmail({ para: em, assunto: m.assunto, texto: m.texto, html: m.html });
      enviado = true;
    } catch (e) {
      aviso = e.message;
    }
    return res.status(200).json({ ok: true, email: em, ja_existia: ja.length > 0, senha_trocada: true, enviado, aviso, link });
  } catch (e) {
    return res.status(500).json({ erro: e.message });
  }
}
