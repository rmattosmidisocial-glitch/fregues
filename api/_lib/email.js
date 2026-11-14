// Envio de e-mail pelo Gmail (ou outro SMTP). Variáveis na Vercel:
// SMTP_USER (o e-mail que envia) e SMTP_PASS (senha de app do Google). Opcional: SMTP_HOST, SMTP_PORT, SMTP_NOME.
import nodemailer from "nodemailer";

export const emailConfigurado = () => !!(process.env.SMTP_USER && process.env.SMTP_PASS);

export async function enviarEmail({ para, assunto, texto, html }) {
  if (!emailConfigurado()) throw new Error("O envio de e-mail ainda não está configurado (SMTP_USER e SMTP_PASS na Vercel).");
  const porta = Number(process.env.SMTP_PORT || 465);
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: porta,
    secure: porta === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await t.sendMail({ from: `"${process.env.SMTP_NOME || "Freguês"}" <${process.env.SMTP_USER}>`, to: para, subject: assunto, text: texto, html });
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function emailAcesso({ loja, link, email, senha, novaSenha }) {
  const titulo = novaSenha ? `Nova senha provisória do painel ${loja}` : `Seu acesso ao painel do Freguês: ${loja}`;
  const texto = `${novaSenha ? "Geramos uma nova senha provisória para o seu painel." : "O painel da sua loja no Freguês está pronto."}

Acesse: ${link}
E-mail: ${email}
Senha provisória: ${senha}

No primeiro acesso, o sistema pede para você criar a sua própria senha. Depois disso, só você sabe a senha.`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;color:#2a1d14;max-width:520px">
<h2 style="margin:0 0 12px">${esc(loja)}</h2>
<p>${novaSenha ? "Geramos uma nova senha provisória para o seu painel." : "O painel da sua loja no Freguês está pronto."}</p>
<p style="background:#fff3e2;border-radius:12px;padding:14px;line-height:1.7">
<b>E-mail:</b> ${esc(email)}<br><b>Senha provisória:</b> ${esc(senha)}</p>
<p><a href="${esc(link)}" style="display:inline-block;background:#e8743b;color:#1c1410;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">Abrir meu painel</a></p>
<p style="color:#6b5546;font-size:14px">No primeiro acesso, o sistema pede para você criar a sua própria senha. Depois disso, só você sabe a senha.</p>
</div>`;
  return { assunto: titulo, texto, html };
}
