// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { CONFIG_PADRAO, MODELOS_PADRAO, mensagem, preencher } from "../src/pages/admin/adminDados";

describe("Modelos de mensagem", () => {
  it("troca os campos", () => {
    expect(preencher("Olá {nome}, a {loja} vence {vencimento}.", { nome: "Carla", loja: "Cantina", vencimento: "10/12" })).toBe("Olá Carla, a Cantina vence 10/12.");
  });
  it("linha só com campo vazio some, e nome vazio não deixa espaço sobrando", () => {
    expect(preencher("Olá {nome}!\n{link}\nFim", { nome: "", link: "" })).toBe("Olá!\nFim");
  });
  it("mensagem usa o modelo salvo ou o padrão, com a assinatura", () => {
    const c = { ...CONFIG_PADRAO, responsavel: "Renan", whatsapp: "21967640607" };
    expect(mensagem(c, "lembrete", { nome: "Ana", loja: "Bar", valor: "R$ 249,00", vencimento: "10/12" })).toContain("Renan · WhatsApp (21) 96764-0607");
    expect(mensagem({ ...c, modelos: { lembrete: "Oi {nome}" } }, "lembrete", { nome: "Ana" })).toBe("Oi Ana");
    expect(Object.keys(MODELOS_PADRAO)).toHaveLength(6);
  });
});
