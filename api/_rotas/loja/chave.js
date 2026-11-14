// O dono (ou gerente) liga uma integração colando a chave dela. A chave é testada e guardada só no servidor.
import { corpoJson, erroServidor } from "../../_lib/base.js";
import { atualizar, focus, loja, mp, papelNaLoja, salvarSegredos, segredos, wa } from "../../_lib/loja.js";

export default async function chave(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  const b = corpoJson(req);
  const { store_id, tipo, remover } = b;
  if (!store_id || !["mp", "wa", "focus"].includes(tipo)) return res.status(400).json({ erro: "Pedido inválido" });
  const papel = await papelNaLoja(req, store_id);
  if (!["dono", "gerente"].includes(papel)) return res.status(403).json({ erro: "Só o dono ou o gerente mudam as integrações" });

  try {
    if (remover) {
      if (tipo === "mp") {
        await salvarSegredos(store_id, { mp_token: null });
        await atualizar("stores", `id=eq.${store_id}`, { pagamento_online: false, pagamento_online_ok: false });
      } else if (tipo === "wa") {
        await salvarSegredos(store_id, { wa_token: null, wa_phone_id: null });
        await atualizar("stores", `id=eq.${store_id}`, { whatsapp_ativo: false, whatsapp_ok: false });
      } else {
        await salvarSegredos(store_id, { focus_token: null });
        await atualizar("stores", `id=eq.${store_id}`, { nfce_ativo: false, nfce_ok: false });
      }
      return res.status(200).json({ ok: true });
    }

    if (tipo === "mp") {
      const token = String(b.token || "").trim();
      if (!/^(APP_USR|TEST)-/.test(token)) return res.status(400).json({ erro: "Cole o Access Token do Mercado Pago (começa com APP_USR-)" });
      const eu = await mp(token, "/users/me").catch((e) => ({ erro: e.message }));
      if (eu.erro) return res.status(400).json({ erro: `O Mercado Pago recusou essa chave (${eu.erro})` });
      await salvarSegredos(store_id, { mp_token: token });
      await atualizar("stores", `id=eq.${store_id}`, { pagamento_online_ok: true });
      return res.status(200).json({ ok: true, conta: eu.nickname || eu.email || "", teste: token.startsWith("TEST-") });
    }

    if (tipo === "wa") {
      const atual = await segredos(store_id);
      const token = String(b.token || "").trim() || atual.wa_token;
      const phone = String(b.phone_id || "").replace(/\D/g, "") || atual.wa_phone_id;
      if (!token || !phone) return res.status(400).json({ erro: "Informe o ID do número e o token do WhatsApp" });
      const n = await wa(token, `/${phone}?fields=display_phone_number,verified_name`).catch((e) => ({ erro: e.message }));
      if (n.erro) return res.status(400).json({ erro: `A Meta recusou (${n.erro})` });
      const modelos = b.modelos && typeof b.modelos === "object" ? Object.fromEntries(Object.entries(b.modelos).filter(([, v]) => typeof v === "string" && /^[a-z0-9_]{1,512}$/.test(v))) : atual.wa_modelos || {};
      await salvarSegredos(store_id, { wa_token: token, wa_phone_id: phone, wa_modelos: modelos });
      await atualizar("stores", `id=eq.${store_id}`, { whatsapp_ok: true });
      return res.status(200).json({ ok: true, numero: n.display_phone_number, nome: n.verified_name });
    }

    // Focus NFe: confere a chave consultando uma nota que não existe (404 = chave boa)
    const token = String(b.token || "").trim();
    const st = await loja(store_id);
    if (!token) return res.status(400).json({ erro: "Cole o token da Focus NFe" });
    const r = await focus(token, !!st?.nfce_producao, "/v2/nfce/fregues-teste-de-chave");
    if (r.status === 401 || r.status === 403) return res.status(400).json({ erro: `A Focus NFe recusou esse token no ambiente de ${st?.nfce_producao ? "produção" : "homologação (teste)"}` });
    await salvarSegredos(store_id, { focus_token: token });
    await atualizar("stores", `id=eq.${store_id}`, { nfce_ok: true });
    return res.status(200).json({ ok: true });
  } catch (e) {
    await erroServidor("loja/chave", e);
    return res.status(500).json({ erro: e.message });
  }
}
