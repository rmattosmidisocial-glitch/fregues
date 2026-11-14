import { describe, expect, it } from "vitest";
import { codigoPix, normalizarChave, tipoChave } from "../src/lib/pix";

// CRC16-CCITT (0x1021, início 0xFFFF), feito à parte para conferir o do sistema
function crc(s: string) {
  let c = 0xffff;
  for (const ch of Buffer.from(s, "utf8")) {
    c ^= ch << 8;
    for (let i = 0; i < 8; i++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
  }
  return c.toString(16).toUpperCase().padStart(4, "0");
}

describe("Pix copia e cola", () => {
  const cod = codigoPix({ chave: "contato@tobrocado.com.br", nome: "Tô Brocado Hamburgueria Artesanal", cidade: "Mesquita", valor: 52.9, txid: "PED-1234" });

  it("tem CRC válido no fim", () => {
    expect(cod.slice(-4)).toBe(crc(cod.slice(0, -4)));
  });
  it("leva o valor com duas casas e o identificador do pedido", () => {
    expect(cod).toContain("540552.90");
    expect(cod).toContain("PED1234");
  });
  it("limpa acentos e corta o nome em 25 letras", () => {
    expect(cod).toMatch(/5925TO BROCADO HAMBURGUERIA/);
  });
  it("reconhece o tipo de chave", () => {
    expect(tipoChave("contato@loja.com")).toBe("e-mail");
    expect(tipoChave("(21) 96764-0607")).toBe("celular");
    expect(tipoChave("123.456.789-09")).toBe("CPF");
    expect(tipoChave("12.345.678/0001-90")).toBe("CNPJ");
    expect(tipoChave("abc")).toBeNull();
    expect(normalizarChave("(21) 96764-0607")).toBe("+5521967640607");
  });
});
