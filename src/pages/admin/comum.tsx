// Peças comuns da administração: datas, telefones, senha provisória e o botão de mandar no WhatsApp.
import { useState } from "react";
import { Copy, MessageCircle } from "lucide-react";

export const dataBR = (s?: string | null) => (s ? new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—");
export const diasAte = (s?: string | null) => (s ? Math.round((new Date(s + "T12:00:00").getTime() - Date.now()) / 86400000) : null);
export const desde = (s?: string | null) => {
  if (!s) return "nunca";
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
  return d <= 0 ? "hoje" : d === 1 ? "ontem" : `há ${d} dias`;
};

// senha provisória: nome da loja + 4 números (fácil de digitar, difícil de adivinhar)
export function senhaProvisoria(loja: string) {
  const base =
    loja
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 12) || "fregues";
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return base + String(1000 + (n[0] % 9000));
}

export const linkPainelDe = (slug: string) => `${window.location.origin}/?r=${slug}#painel`;
export const linkLojaDe = (slug: string) => `${window.location.origin}/?r=${slug}#loja`;
export const telFmt = (t: string) => {
  const d = (t || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : t;
};
export const zapDe = (t: string) => {
  const d = (t || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  return d.length >= 10 ? "55" + d : "";
};

/** Botões de envio: WhatsApp (abre a conversa com a mensagem pronta) e copiar. */
export function Enviar({ msg, telefone }: { msg: string; telefone: string }) {
  const [copiado, setCopiado] = useState(false);
  const zap = zapDe(telefone);
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <a href={zap ? `https://wa.me/${zap}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25d366] px-4 py-3 text-[15px] font-bold text-[#0b2e17] hover:brightness-95">
        <MessageCircle className="h-5 w-5" /> Enviar no WhatsApp
        {zap ? ` · ${telFmt(telefone)}` : ""}
      </a>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(msg).catch(() => {});
          setCopiado(true);
        }}
        className="flex items-center gap-1.5 rounded-xl border border-linha px-4 py-3 text-[14px] font-semibold hover:border-areia"
      >
        <Copy className="h-4 w-4" /> {copiado ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
