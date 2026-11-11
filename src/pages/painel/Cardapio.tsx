import { useState } from "react";
import { ImageUp, Plus, X } from "lucide-react";
import { brl } from "../../data/mock";
import { useDados } from "../../data/dados";
import { Foto } from "../../components/Foto";
import { useToast } from "../../components/ui";

export function Cardapio() {
  const d = useDados();
  const itens = d.cardapio;
  const CATEGORIAS = d.categorias;
  const [importar, setImportar] = useState(false);
  const [etapa, setEtapa] = useState(0);
  const { show, Toast } = useToast();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Cardápio</h1>
          <p className="text-[15px] text-areia">{itens.length} produtos em {CATEGORIAS.length} categorias. Valem para delivery, retirada e mesa.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setImportar(true);
              setEtapa(0);
            }}
            className="flex items-center gap-2 rounded-full bg-brasa px-4 py-2.5 text-[14px] font-semibold text-carvao hover:bg-mostarda"
          >
            <ImageUp className="h-4 w-4" /> Importar de uma foto
          </button>
          <button onClick={() => show("Na versão completa, abre o editor de produto")} className="flex items-center gap-2 rounded-full border border-linha px-4 py-2.5 text-[14px] font-semibold">
            <Plus className="h-4 w-4" /> Produto
          </button>
        </div>
      </div>

      {CATEGORIAS.map((cat) => (
        <section key={cat} className="mt-8">
          <h2 className="font-display text-[22px] font-bold">{cat}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {itens
              .filter((p) => p.cat === cat)
              .map((p) => (
                <article key={p.id} className={`flex gap-4 rounded-2xl border border-linha bg-forno p-3 ${p.esgotado ? "opacity-60" : ""}`}>
                  <Foto nome={p.nome} arte={p.arte} className="h-20 w-20 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.nome}</p>
                    <p className="line-clamp-2 text-[13px] text-areia">{p.desc}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="tabular text-[15px] font-semibold">
                        {p.promo ? (
                          <>
                            {brl(p.promo)} <s className="text-[12px] text-fumo">{brl(p.preco)}</s>
                          </>
                        ) : (
                          brl(p.preco)
                        )}
                      </span>
                      <label className="flex cursor-pointer items-center gap-2 text-[12px] text-areia">
                        {p.esgotado ? "Esgotado" : "À venda"}
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={!p.esgotado}
                          onChange={() => {
                            d.acoes.toggleEsgotado(p.id);
                            show(p.esgotado ? `${p.nome} voltou para a loja` : `${p.nome} marcado como esgotado`);
                          }}
                        />
                        <span className={`relative h-5 w-9 rounded-full transition ${p.esgotado ? "bg-linha" : "bg-manjericao"} peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-mostarda`}>
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${p.esgotado ? "left-0.5" : "left-[18px]"}`} />
                        </span>
                      </label>
                    </div>
                  </div>
                </article>
              ))}
          </div>
        </section>
      ))}

      {importar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setImportar(false)}>
          <div role="dialog" aria-label="Importar cardápio" className="w-full max-w-[520px] rounded-3xl border border-linha bg-forno p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[24px] font-extrabold">Importar cardápio</h2>
              <button onClick={() => setImportar(false)} aria-label="Fechar" className="rounded-full p-2 hover:bg-grafite">
                <X className="h-5 w-5" />
              </button>
            </div>
            {etapa === 0 && (
              <>
                <p className="mt-2 text-[15px] text-areia">Envie uma foto do cardápio impresso, um PDF ou uma planilha. A IA lê e monta tudo para você revisar.</p>
                <button onClick={() => setEtapa(1)} className="mt-5 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-linha py-10 text-areia hover:border-brasa hover:text-papel">
                  <ImageUp className="h-8 w-8" />
                  <span className="font-semibold">Escolher arquivo</span>
                  <span className="text-[13px]">Para a demonstração, usamos um cardápio de exemplo</span>
                </button>
              </>
            )}
            {etapa === 1 && (
              <div className="mt-4 space-y-2 text-[15px]">
                {["Lendo a foto", "16 produtos encontrados", "Preços e descrições conferidos", "4 grupos de complementos criados"].map((t, i) => (
                  <p key={t} className="flex items-center gap-3 rounded-xl bg-grafite px-4 py-3" style={{ animation: `acender 500ms ${i * 350}ms both` }}>
                    <span className="h-2 w-2 rounded-full bg-manjericao" /> {t}
                  </p>
                ))}
                <button
                  onClick={() => {
                    setImportar(false);
                    show("Cardápio importado. Revise antes de publicar");
                  }}
                  className="mt-3 w-full rounded-xl bg-brasa py-3 font-semibold text-carvao hover:bg-mostarda"
                >
                  Revisar produtos
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <Toast />
    </div>
  );
}
