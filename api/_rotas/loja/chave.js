// O dono (ou gerente) liga uma integração colando a chave dela (Mercado Pago, WhatsApp, Focus NFe, Pixel da Meta). A chave é testada e guardada só no servidor.
import { corpoJson, erroServidor } from "../../_lib/base.js";
import { atualizar, focus, loja, metaEventos, mp, papelNaLoja, salvarSegredos, segredos, wa } from "../../_lib/loja.js";

export default async function chave(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  const b = corpoJson(req);
  const { store_id, tipo, remover } = b;
  if (!store_id || !["mp", "wa", "focus", "meta"].includes(tipo)) return res.status(400).json({ erro: "Pedido inválido" });
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
      } else if (tipo === "meta") {
        await salvarSegredos(store_id, { meta_token: null, meta_teste: null });
        await atualizar("stores", `id=eq.${store_id}`, { meta_pixel_id: null, meta_capi: false });
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

    if (tipo === "meta") {
      const pixel = String(b.pixel || "").replace(/\D/g, "");
      if (!/^[0-9]{6,20}$/.test(pixel)) return res.status(400).json({ erro: "Cole o ID do Pixel (só números, fica no Gerenciador de Eventos da Meta)" });
      const atual = await segredos(store_id);
      const token = String(b.token || "").trim() || atual.meta_token || null;
      const teste =
        b.teste === undefined
          ? atual.meta_teste || null
          : String(b.teste || "")
              .trim()
              .slice(0, 40) || null;
      if (token) {
        // confere o token lendo o Pixel; com código de teste, manda um evento que só aparece em "Testar eventos"
        const r = await fetch(`https://graph.facebook.com/v21.0/${pixel}?fields=id,name&access_token=${encodeURIComponent(token)}`);
        const c = await r.json().catch(() => ({}));
        if (!r.ok) return res.status(400).json({ erro: `A Meta recusou esse token para o Pixel ${pixel} (${c.error?.message || r.status})` });
        if (teste)
          await metaEventos(
            pixel,
            token,
            [
              {
                event_name: "PageView",
                event_time: Math.floor(Date.now() / 1000),
                action_source: "website",
                event_source_url: `https://${req.headers.host}/`,
                user_data: {
                  client_user_agent: req.headers["user-agent"] || "Freguês",
                  client_ip_address:
                    String(req.headers["x-forwarded-for"] || "")
                      .split(",")[0]
                      .trim() || undefined,
                },
              },
            ],
            teste,
          ).catch(() => null);
        await salvarSegredos(store_id, { meta_token: token, meta_teste: teste });
        await atualizar("stores", `id=eq.${store_id}`, { meta_pixel_id: pixel, meta_capi: true });
        return res.status(200).json({ ok: true, pixel, nome: c.name || "", capi: true });
      }
      await salvarSegredos(store_id, { meta_teste: teste });
      await atualizar("stores", `id=eq.${store_id}`, { meta_pixel_id: pixel, meta_capi: false });
      return res.status(200).json({ ok: true, pixel, capi: false });
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
