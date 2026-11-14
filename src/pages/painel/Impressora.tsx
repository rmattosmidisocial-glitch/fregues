import { useMemo, useState } from "react";
import { CheckCircle2, Printer, X } from "lucide-react";
import { CFG_PADRAO, PEDIDO_TESTE, htmlComanda, imprimirComanda, lerImpressora, salvarImpressora, type ImpressoraCfg } from "../../components/comanda";
import { SLUG, useDados } from "../../data/dados";

/** Configuração da impressora térmica: papel, vias, letra, prévia ao vivo, teste e passo a passo para instalar. */
export function ImpressoraModal({ fechar, auto, setAuto }: { fechar: () => void; auto: boolean; setAuto: (v: boolean) => void }) {
  const d = useDados();
  const [cfg, setCfg] = useState<ImpressoraCfg>(lerImpressora);
  const [aba, setAba] = useState<"ajustes" | "instalar">("ajustes");
  const [testou, setTestou] = useState(false);
  const loja = d.loja.nome || "Sua loja";
  const set = (p: Partial<ImpressoraCfg>) => {
    const n = { ...cfg, ...p };
    setCfg(n);
    salvarImpressora(n);
  };
  const previa = useMemo(() => htmlComanda({ ...PEDIDO_TESTE, criadoEm: new Date().toISOString() }, loja, cfg), [cfg, loja]);
  const linkPedidos = `${window.location.origin}/?r=${SLUG}#pedidos`;
  const opcao = (ativo: boolean) => `rounded-full px-3 py-1.5 text-[13px] font-semibold ${ativo ? "bg-papel text-carvao" : "border border-linha text-areia hover:text-papel"}`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={fechar}>
      <div role="dialog" aria-label="Impressora" className="scroll-thin max-h-[92vh] w-full max-w-[860px] overflow-y-auto rounded-3xl border border-linha bg-forno p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-[24px] font-extrabold">
              <Printer className="h-6 w-6 text-brasa" /> Impressora
            </h2>
            <p className="mt-1 text-[14px] text-areia">Fica salvo neste computador. Funciona com impressora térmica de 80 mm ou 58 mm (Elgin, Bematech, Epson, Tanca e outras).</p>
          </div>
          <button onClick={fechar} aria-label="Fechar" className="rounded-full p-2 hover:bg-grafite">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex gap-2" role="tablist">
          <button role="tab" aria-selected={aba === "ajustes"} onClick={() => setAba("ajustes")} className={opcao(aba === "ajustes")}>
            Ajustes e teste
          </button>
          <button role="tab" aria-selected={aba === "instalar"} onClick={() => setAba("instalar")} className={opcao(aba === "instalar")}>
            Como instalar
          </button>
        </div>

        {aba === "ajustes" ? (
          <div className="mt-5 grid gap-6 md:grid-cols-[1fr_300px]">
            <div className="space-y-5 text-[14px]">
              <div>
                <p className="font-semibold">Largura do papel</p>
                <div className="mt-2 flex gap-2">
                  {([80, 58] as const).map((v) => (
                    <button key={v} onClick={() => set({ papel: v })} className={opcao(cfg.papel === v)}>
                      {v} mm
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[12px] text-areia">80 mm é o mais comum em restaurante. Confira na caixa da bobina.</p>
              </div>
              <div>
                <p className="font-semibold">Quantas vias por pedido</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={() => set({ vias: 1 })} className={opcao(cfg.vias === 1)}>
                    1 via
                  </button>
                  <button onClick={() => set({ vias: 2 })} className={opcao(cfg.vias === 2)}>
                    2 vias (cozinha + entregador)
                  </button>
                </div>
              </div>
              {cfg.vias === 2 && (
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={cfg.cozinhaSemPreco} onChange={(e) => set({ cozinhaSemPreco: e.target.checked })} className="h-4 w-4 accent-[#ff5b1f]" />
                  Via da cozinha sem preços, telefone e endereço
                </label>
              )}
              <div>
                <p className="font-semibold">Tamanho da letra</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => set({ letra: "normal" })} className={opcao(cfg.letra === "normal")}>
                    Normal
                  </button>
                  <button onClick={() => set({ letra: "grande" })} className={opcao(cfg.letra === "grande")}>
                    Grande
                  </button>
                </div>
              </div>
              <label className="block font-semibold">
                Mensagem no fim
                <input value={cfg.rodape} onChange={(e) => set({ rodape: e.target.value })} maxLength={60} className="mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px] font-normal text-papel" />
              </label>
              <label className="flex items-center gap-2 rounded-2xl bg-grafite p-3">
                <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="h-4 w-4 accent-[#ff5b1f]" />
                <span>
                  <b>Imprimir sozinho quando chegar pedido</b>
                  <br />
                  <span className="text-[12px] text-areia">Deixe a tela de Pedidos aberta neste computador.</span>
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    imprimirComanda({ ...PEDIDO_TESTE, criadoEm: new Date().toISOString() }, loja, cfg);
                    setTestou(true);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-brasa px-4 py-3 font-semibold text-carvao hover:bg-mostarda"
                >
                  <Printer className="h-4 w-4" /> Imprimir teste
                </button>
                <button onClick={() => (setCfg(CFG_PADRAO), salvarImpressora(CFG_PADRAO))} className="rounded-xl border border-linha px-4 py-3 text-[13px] font-semibold">
                  Voltar ao padrão
                </button>
              </div>
              {testou && (
                <p className="rounded-xl bg-carvao p-3 text-[13px] text-areia">
                  Sem impressora ainda? Na janela que abriu, escolha <b className="text-papel">"Salvar como PDF"</b> para ver exatamente o que vai sair no papel.
                </p>
              )}
            </div>
            <div>
              <p className="mb-2 text-[13px] font-semibold text-areia">Como sai no papel (pedido de exemplo)</p>
              <div className="overflow-hidden rounded-2xl border border-linha bg-[#e9e4dc] p-3">
                <iframe title="Prévia da comanda" srcDoc={previa} className="mx-auto block h-[520px] w-full rounded bg-white shadow" />
              </div>
            </div>
          </div>
        ) : (
          <ol className="mt-5 space-y-4 text-[14px]">
            {[
              ["Ligue a impressora no computador", "Pelo cabo USB (ou na mesma rede, se ela for de rede). Instale o programa (driver) que vem no site do fabricante: Elgin, Bematech, Epson, Tanca etc."],
              ["Deixe ela como impressora padrão", "No Windows: Configurações → Bluetooth e dispositivos → Impressoras → clique nela → \"Definir como padrão\". Desligue a opção \"Deixar o Windows gerenciar minha impressora padrão\"."],
              ["Acerte o papel", `Nas preferências da impressora, escolha o papel de ${cfg.papel} mm (às vezes aparece como "80 x 297 mm" ou "Roll Paper"). Margens: zero.`],
              ["Teste", "Volte na aba \"Ajustes e teste\" e toque em \"Imprimir teste\". Na janela, escolha a impressora térmica e imprima. Se sair cortado ou pequeno, ajuste a largura do papel e a letra aqui."],
              [
                "Impressão automática, sem janela",
                `Para o pedido sair sozinho, sem precisar clicar em "Imprimir": crie um atalho do Chrome só para os pedidos. Clique com o botão direito na área de trabalho → Novo → Atalho, e cole:`,
              ],
            ].map(([t, x], i) => (
              <li key={t} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brasa text-[13px] font-bold text-carvao">{i + 1}</span>
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="mt-0.5 text-areia">{x}</p>
                  {i === 4 && (
                    <>
                      <code className="mt-2 block break-all rounded-xl bg-carvao p-3 text-[12px] text-papel">"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing --user-data-dir="C:\FreguesPedidos" {linkPedidos}</code>
                      <p className="mt-2 text-areia">
                        Dê o nome <b className="text-papel">Freguês Pedidos</b>. Abra sempre por esse atalho, entre com o login da loja uma vez e ligue <b className="text-papel">"Imprimir sozinho quando chegar pedido"</b>. Cada pedido novo sai direto na impressora padrão.
                      </p>
                    </>
                  )}
                </div>
              </li>
            ))}
            <li className="flex items-start gap-2 rounded-2xl bg-grafite p-3 text-areia">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-manjericao" />
              Sem esse atalho também funciona: o pedido abre a janela de impressão e você só toca em "Imprimir".
            </li>
          </ol>
        )}
      </div>
    </div>
  );
}
