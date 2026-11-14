// "Esqueci minha senha": manda por e-mail um link de uso único (vale 1 hora).
import crypto from "node:crypto";
import { SUPA_URL, rpcServidor, erroServidor } from "../_lib/base.js";
import { emailConfigurado, enviarEmail } from "../_lib/email.js";

const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  if (!emailConfigurado()) return res.status(200).json({ enviado: false, motivo: "sem_email" });
  const em = String((req.body || {}).email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return res.status(400).json({ erro: "Informe um e-mail válido." });
  try {
    const ja = (await rpcServidor("usuario_por_email", { p_email: em })) || [];
    if (ja.length && !ja[0].admin) {
      const token = crypto.randomBytes(32).toString("base64url");
      const hash = crypto.createHash("sha256").update(token).digest("hex");
      await fetch(`${SUPA_URL}/rest/v1/senha_links`, {
        method: "POST",
        headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ token_hash: hash, user_id: ja[0].id, expira_em: new Date(Date.now() + 3600e3).toISOString() }),
      });
      const link = `https://${req.headers["x-forwarded-host"] || req.headers.host}/?t=${token}#redefinir`;
      await enviarEmail({
        para: em,
        assunto: "Criar uma nova senha no Freguês",
        texto: `Recebemos um pedido para trocar a senha do seu painel.\n\nCrie a nova senha por este link (vale por 1 hora):\n${link}\n\nSe não foi você, ignore este e-mail. Sua senha continua a mesma.`,
      });
    }
    // a resposta é sempre a mesma, para ninguém descobrir quais e-mails têm conta
    return res.status(200).json({ enviado: true });
  } catch (e) {
    await erroServidor("conta/esqueci", e);
    return res.status(500).json({ erro: "Não consegui enviar agora. Tente de novo em alguns minutos." });
  }
}
