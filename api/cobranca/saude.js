// Diagnóstico da cobrança: diz se as chaves da Asaas e do Supabase funcionam. Não devolve nenhuma chave.
import { ASAAS_URL, asaas, faltando, lerServidor } from "../_lib/base.js";

export default async function handler(req, res) {
  const r = { falta: faltando(), ambiente: ASAAS_URL.includes("sandbox") ? "teste (sandbox)" : "produção", asaas: "não testado", supabase: "não testado" };
  try {
    await asaas("/customers?limit=1");
    r.asaas = "ok";
  } catch (e) {
    r.asaas = "erro: " + e.message;
  }
  try {
    await lerServidor("plans", "select=id&limit=1");
    r.supabase = "ok";
  } catch (e) {
    r.supabase = "erro: " + e.message;
  }
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json(r);
}
