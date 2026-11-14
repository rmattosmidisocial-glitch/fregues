import { useState } from "react";
import { Copy, ExternalLink, MessageCircle, Store } from "lucide-react";
import { useDados } from "../../data/dados";

/** O link da loja (cardápio) para mandar aos clientes, e o botão de colocar a loja no ar. */
export function LinkDaLoja() {
  const d = useDados();
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  if (!d.loja.slug) return null;
  const link = `${window.location.origin}/?r=${d.loja.slug}#loja`;
  const noAr = d.modo === "demo" || d.loja.publicada !== false;
  const msg = `Peça direto pelo nosso cardápio online: ${link}`;
  const alternar = async (v: boolean) => {
    setOcupado(true);
    setErro((await d.acoes.publicarLoja(v)) ?? "");
    setOcupado(false);
  };
  return (
    <section className={`mb-4 rounded-2xl border p-4 ${noAr ? "border-linha bg-forno" : "border-mostarda bg-[#fcefd9] text-[#5c3a00]"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[15px] font-bold">
          <Store className="h-5 w-5" /> Link do seu cardápio
          <span className={`rounded-full px-2 py-0.5 text-[12px] ${noAr ? "bg-[#e4f3ea] text-[#1b6149]" : "bg-[#7a4600] text-[#fcefd9]"}`}>{noAr ? "No ar" : "Fora do ar"}</span>
        </p>
        {d.modo === "real" &&
          (noAr ? (
            <button disabled={ocupado} onClick={() => confirm("Tirar a loja do ar? Os clientes não vão conseguir abrir o cardápio.") && alternar(false)} className="text-[13px] underline opacity-70 hover:opacity-100">
              Tirar do ar
            </button>
          ) : (
            <button disabled={ocupado} onClick={() => alternar(true)} className="rounded-full bg-[#7a4600] px-4 py-2 text-[14px] font-bold text-[#fcefd9] disabled:opacity-60">
              {ocupado ? "Colocando…" : "Colocar a loja no ar"}
            </button>
          ))}
      </div>
      {!noAr && <p className="mt-1 text-[14px]">Monte o cardápio e o Território e depois coloque no ar. Até lá, só você vê a loja.</p>}
      <p className="mt-2 break-all text-[15px] font-semibold">{link.replace(/^https?:\/\//, "")}</p>
      {erro && <p className="mt-1 text-[14px] text-[#a3291c]">{erro}</p>}
      <div className="mt-3 flex flex-wrap gap-2 text-[14px]">
        <button
          onClick={() => {
            navigator.clipboard?.writeText(link).catch(() => {});
            setCopiado(true);
          }}
          className="flex items-center gap-1.5 rounded-full border border-current/30 px-3 py-1.5 font-semibold"
        >
          <Copy className="h-4 w-4" /> {copiado ? "Copiado" : "Copiar link"}
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full bg-[#25d366] px-3 py-1.5 font-semibold text-[#0b2e17]">
          <MessageCircle className="h-4 w-4" /> Mandar no WhatsApp
        </a>
        <a href={link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full border border-current/30 px-3 py-1.5 font-semibold">
          <ExternalLink className="h-4 w-4" /> Abrir
        </a>
      </div>
    </section>
  );
}
