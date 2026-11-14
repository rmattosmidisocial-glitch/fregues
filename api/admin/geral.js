// Rotas do administrador do Freguês que precisam do servidor:
//   acao "saude": confere se cada integração está funcionando (não devolve nenhuma chave)
//   acao "novo_admin": cria (ou liga) o login de outro administrador com senha provisória
import { ASAAS_URL, SUPA_URL, asaas, corpoJson, exigirAdmin, lerServidor, rpcServidor } from "../_lib/base.js";
import { emailConfigurado } from "../_lib/email.js";

const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function authAdmin(caminho, metodo, corpo) {
  const r = await fetch(`${SUPA_URL}/auth/v1/admin/${caminho}`, {
    method: metodo,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json",
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const c = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(c.msg || c.message || c.error_description || `Supabase respondeu ${r.status}`);
  return c;
}

async function quemSou(req) {
  const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const r = await fetch(`${SUPA_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${jwt}` },
  });
  return r.ok ? r.json() : null;
}

async function saude(host) {
  const itens = [];
  const add = (nome, ok, detalhe) => itens.push({ nome, ok, detalhe });

  // banco
  if (!SERVICE) add("Banco de dados (Supabase)", false, "Falta SUPABASE_SERVICE_ROLE_KEY na Vercel");
  else
    try {
      await lerServidor("plans", "select=id&limit=1");
      add("Banco de dados (Supabase)", true, "Conectado");
    } catch (e) {
      add("Banco de dados (Supabase)", false, e.message);
    }

  // cobrança
  if (!process.env.ASAAS_API_KEY) add("Cobrança (Asaas)", false, "Falta ASAAS_API_KEY na Vercel");
  else {
    const amb = ASAAS_URL.includes("sandbox") ? "ambiente de teste (sandbox)" : "produção";
    try {
      await asaas("/customers?limit=1");
      add("Cobrança (Asaas)", true, `Conectado · ${amb}`);
      try {
        const url = `https://${host}/api/asaas/webhook`;
        const w = ((await asaas("/webhooks")).data || []).find((x) => x.url === url);
        if (!w) add("Aviso de pagamento (webhook)", null, "Ainda não ligado. Liga sozinho ao ativar a cobrança do primeiro cliente.");
        else if (w.interrupted || w.enabled === false) add("Aviso de pagamento (webhook)", false, "A Asaas pausou os avisos. Reative em Asaas > Integrações > Webhooks.");
        else add("Aviso de pagamento (webhook)", true, "Ligado neste endereço");
      } catch (e) {
        add("Aviso de pagamento (webhook)", false, e.message);
      }
    } catch (e) {
      add("Cobrança (Asaas)", false, `${e.message} · ${amb}`);
    }
  }

  // e-mail
  add("E-mail (senhas e acessos)", emailConfigurado() ? true : null, emailConfigurado() ? `Enviando por ${process.env.SMTP_USER}` : "Ainda não configurado (SMTP_USER e SMTP_PASS). Enquanto isso, os acessos vão pelo WhatsApp.");

  // IA
  if (!process.env.ANTHROPIC_API_KEY) add("Inteligência artificial (Claude)", null, "Sem chave (ANTHROPIC_API_KEY). A leitura de cardápio por foto fica desligada.");
  else
    try {
      const r = await fetch("https://api.anthropic.com/v1/models?limit=1", {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
      });
      add("Inteligência artificial (Claude)", r.ok, r.ok ? "Chave válida" : `A chave foi recusada (${r.status})`);
    } catch (e) {
      add("Inteligência artificial (Claude)", false, e.message);
    }

  return itens;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  if (!SERVICE) return res.status(500).json({ erro: "Falta a chave SUPABASE_SERVICE_ROLE_KEY na Vercel" });
  if (!(await exigirAdmin(req))) return res.status(403).json({ erro: "Só administradores do Freguês" });
  const { acao, email, senha } = corpoJson(req);

  try {
    if (acao === "saude")
      return res.status(200).json({
        itens: await saude(req.headers["x-forwarded-host"] || req.headers.host),
      });

    if (acao === "novo_admin") {
      const em = String(email || "")
        .trim()
        .toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return res.status(400).json({ erro: "Informe um e-mail válido" });
      if (String(senha || "").length < 8)
        return res.status(400).json({
          erro: "A senha provisória precisa ter pelo menos 8 caracteres",
        });
      const eu = await quemSou(req);
      const ja = (await rpcServidor("usuario_por_email", { p_email: em })) || [];
      if (ja[0]?.admin) return res.status(409).json({ erro: "Esse e-mail já é administrador" });
      let id;
      if (ja.length) {
        // primeiro confere e liga (recusa login de restaurante); só depois troca a senha
        id = ja[0].id;
        await rpcServidor("admin_adicionar_srv", {
          p_user: id,
          p_por: eu?.id ?? null,
          p_email: em,
        });
        await authAdmin(`users/${id}`, "PUT", {
          password: senha,
          email_confirm: true,
          user_metadata: { trocar_senha: true },
        });
      } else {
        id = (
          await authAdmin("users", "POST", {
            email: em,
            password: senha,
            email_confirm: true,
            user_metadata: { trocar_senha: true },
          })
        ).id;
        await rpcServidor("admin_adicionar_srv", {
          p_user: id,
          p_por: eu?.id ?? null,
          p_email: em,
        });
      }
      return res.status(200).json({
        ok: true,
        email: em,
        link: `https://${req.headers["x-forwarded-host"] || req.headers.host}/#admin`,
      });
    }

    return res.status(400).json({ erro: "Ação desconhecida" });
  } catch (e) {
    return res.status(500).json({ erro: e.message });
  }
}
