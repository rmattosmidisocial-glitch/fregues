// Pix "copia e cola" (BR Code do Banco Central) com valor e identificação do pedido.
// O dinheiro cai direto na conta da chave do restaurante; a confirmação é feita pela loja no painel.

const tlv = (id: string, v: string) => id + String(v.length).padStart(2, "0") + v;

function crc16(s: string) {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// o padrão aceita só letras sem acento, números e espaço
const limpo = (s: string, max: number) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, max);

/** Deixa a chave no formato que o Pix espera (telefone com +55, CPF/CNPJ só números). */
export function normalizarChave(chave: string) {
  const c = chave.trim();
  if (c.includes("@")) return c.toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c)) return c.toLowerCase(); // chave aleatória
  const d = c.replace(/\D/g, "");
  if (c.startsWith("+")) return "+" + d;
  if (d.length === 11 && /^\d{2}9/.test(d) && !cpfValido(d)) return "+55" + d; // celular
  return d; // CPF (11) ou CNPJ (14)
}

function cpfValido(d: string) {
  if (!/^\d{11}$/.test(d) || /^(\d)\1+$/.test(d)) return false;
  const dig = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dig(9) === Number(d[9]) && dig(10) === Number(d[10]);
}

/** Diz que tipo de chave é, ou null se não parece uma chave Pix válida. */
export function tipoChave(chave: string): "e-mail" | "celular" | "CPF" | "CNPJ" | "aleatória" | null {
  const c = normalizarChave(chave);
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c)) return "e-mail";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(c)) return "aleatória";
  if (/^\+55\d{10,11}$/.test(c)) return "celular";
  if (/^\d{11}$/.test(c)) return "CPF";
  if (/^\d{14}$/.test(c)) return "CNPJ";
  return null;
}

/** Código Pix copia e cola com valor. `txid` identifica o pedido no extrato (ex.: PED1234). */
export function codigoPix({ chave, nome, cidade, valor, txid }: { chave: string; nome: string; cidade: string; valor: number; txid?: string }) {
  const conta = tlv("00", "br.gov.bcb.pix") + tlv("01", normalizarChave(chave));
  const id = (txid || "***").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const corpo =
    tlv("00", "01") +
    tlv("26", conta) +
    tlv("52", "0000") +
    tlv("53", "986") +
    (valor > 0 ? tlv("54", valor.toFixed(2)) : "") +
    tlv("58", "BR") +
    tlv("59", limpo(nome, 25) || "LOJA") +
    tlv("60", limpo(cidade, 15) || "RIO DE JANEIRO") +
    tlv("62", tlv("05", id)) +
    "6304";
  return corpo + crc16(corpo);
}
