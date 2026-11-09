import { useState } from "react";
import { Activity, BookOpen, ChefHat, ClipboardList, ExternalLink, Link2, LogOut, Map as MapIcon, MessagesSquare, Sparkles, Users, Workflow, X } from "lucide-react";
import { useCrescer } from "../../data/crescer";
import { Atendimento } from "./Atendimento";
import { Automacoes } from "./Automacoes";
import { Formularios } from "./Formularios";
import { Links } from "./Links";
import { Logo } from "../../components/Logo";
import type { Rota } from "../../router";
import { useDados } from "../../data/dados";
import { Login } from "./Login";
import { Pulso } from "./Pulso";
import { Pedidos } from "./Pedidos";
import { MapaAtuacao } from "./Mapa";
import { Fregueses } from "./Fregueses";
import { Cardapio } from "./Cardapio";
import { Copiloto } from "./Copiloto";

type Item = { rota: Rota; rotulo: string; curto: string; icone: React.ReactNode; grupo: "Operação" | "Crescer" };
const ITENS: Item[] = [
  { rota: "painel", rotulo: "Pulso", curto: "Pulso", grupo: "Operação", icone: <Activity className="h-5 w-5" /> },
  { rota: "pedidos", rotulo: "Pedidos", curto: "Pedidos", grupo: "Operação", icone: <ChefHat className="h-5 w-5" /> },
  { rota: "atendimento", rotulo: "Atendimento", curto: "Conversas", grupo: "Operação", icone: <MessagesSquare className="h-5 w-5" /> },
  { rota: "cardapio", rotulo: "Cardápio", curto: "Cardápio", grupo: "Operação", icone: <BookOpen className="h-5 w-5" /> },
  { rota: "mapa", rotulo: "Mapa de atuação", curto: "Mapa", grupo: "Operação", icone: <MapIcon className="h-5 w-5" /> },
  { rota: "fregueses", rotulo: "Fregueses", curto: "Fregueses", grupo: "Crescer", icone: <Users className="h-5 w-5" /> },
  { rota: "automacoes", rotulo: "Automações", curto: "Automações", grupo: "Crescer", icone: <Workflow className="h-5 w-5" /> },
  { rota: "formularios", rotulo: "Formulários", curto: "Formulários", grupo: "Crescer", icone: <ClipboardList className="h-5 w-5" /> },
  { rota: "links", rotulo: "Links da bio", curto: "Links", grupo: "Crescer", icone: <Link2 className="h-5 w-5" /> },
];

export function PainelLayout({ rota }: { rota: Rota }) {
  const [copiloto, setCopiloto] = useState(false);
  const d = useDados();
  const naoLidas = useCrescer((s) => s.conversas.filter((c) => c.naoLida).length);
  const contador = (r: Rota) => (r === "pedidos" ? d.pedidos.filter((p) => p.status === "novo").length : r === "atendimento" ? naoLidas : 0);
  const aberta = d.loja.aberto;
  const setAberta = (v: boolean) => d.acoes.setAberta(v);
  if (d.modo === "real" && d.carregando) return <div className="grid min-h-screen place-items-center text-areia">Abrindo o painel…</div>;
  if (d.modo === "real" && !d.sessao) return <Login />;
  return (
    <div className="min-h-screen bg-carvao md:grid md:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-linha bg-forno px-4 py-5 md:flex">
        <a href="#" aria-label="Voltar para o site do Freguês" className="px-2">
          <Logo />
        </a>
        <div className="mt-5 rounded-2xl bg-grafite p-3">
          <p className="font-display text-[17px] font-bold leading-tight">{d.loja.nome}</p>
          <p className="text-[13px] text-areia">{d.loja.bairro}</p>
          <button
            onClick={() => setAberta(!aberta)}
            className={`mt-3 flex w-full items-center justify-between rounded-xl px-3 py-2 text-[14px] font-semibold ${aberta ? "bg-[#17351f] text-[#9be3b0]" : "bg-[#4a1c10] text-[#ffb4a0]"}`}
          >
            {aberta ? "Loja aberta" : "Loja pausada"}
            <span className={`relative h-5 w-9 rounded-full ${aberta ? "bg-manjericao" : "bg-tomate"}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-papel transition-all ${aberta ? "left-[18px]" : "left-0.5"}`} />
            </span>
          </button>
        </div>
        <nav className="scroll-thin mt-5 min-h-0 flex-1 space-y-0.5 overflow-y-auto" aria-label="Painel">
          {ITENS.map((i, k) => {
            const ativo = rota === i.rota;
            const n = contador(i.rota);
            const titulo = k === 0 || ITENS[k - 1].grupo !== i.grupo;
            return (
              <div key={i.rota}>
              {titulo && <p className={`px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-fumo ${k ? "pt-4" : ""}`}>{i.grupo}</p>}
              <a
                key={i.rota}
                href={`#${i.rota}`}
                aria-current={ativo ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] transition ${ativo ? "bg-papel font-semibold text-carvao" : "text-areia hover:bg-grafite hover:text-papel"}`}
              >
                {i.icone}
                {i.rotulo}
                {n > 0 && <span className="tabular ml-auto rounded-full bg-brasa px-2 text-[12px] font-bold text-carvao">{n}</span>}
              </a>
              </div>
            );
          })}
        </nav>
        <div className="mt-3 space-y-1.5">
          <button
            onClick={() => setCopiloto(true)}
            className="flex w-full items-center gap-3 rounded-xl bg-brasa px-3 py-3 text-[15px] font-semibold text-carvao transition hover:bg-mostarda"
          >
            <Sparkles className="h-5 w-5" /> Copiloto Chef
          </button>
          <a href="#loja" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-areia hover:text-papel">
            <ExternalLink className="h-4 w-4" /> Ver a loja do cliente
          </a>
          {d.sessao && (
            <button onClick={() => d.acoes.sair()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-areia hover:text-papel">
              <LogOut className="h-4 w-4" /> Sair
            </button>
          )}
        </div>
      </aside>

      <div className="min-w-0 pb-24 md:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-linha bg-carvao/90 px-4 py-3 backdrop-blur md:hidden">
          <Logo />
          <button onClick={() => setCopiloto(true)} className="flex items-center gap-2 rounded-full bg-brasa px-3 py-2 text-[14px] font-semibold text-carvao">
            <Sparkles className="h-4 w-4" /> Copiloto
          </button>
        </header>
        <main className="mx-auto max-w-[1280px] px-4 py-6 md:px-8 md:py-8">
          {d.erro && <p className="mb-4 rounded-2xl bg-[#4a1c10] p-4 text-[#ffd9c4]">{d.erro}</p>}
          {rota === "painel" && <Pulso abrirCopiloto={() => setCopiloto(true)} />}
          {rota === "pedidos" && <Pedidos />}
          {rota === "mapa" && <MapaAtuacao />}
          {rota === "fregueses" && <Fregueses />}
          {rota === "cardapio" && <Cardapio />}
          {rota === "atendimento" && <Atendimento />}
          {rota === "automacoes" && <Automacoes />}
          {rota === "formularios" && <Formularios />}
          {rota === "links" && <Links />}
        </main>
      </div>

      <nav className="scroll-thin fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-linha bg-forno md:hidden" aria-label="Painel">
        {ITENS.map((i) => (
          <a
            key={i.rota}
            href={`#${i.rota}`}
            aria-current={rota === i.rota ? "page" : undefined}
            className={`relative flex min-w-[76px] flex-col items-center gap-1 px-1 py-2.5 text-[11px] ${rota === i.rota ? "text-brasa" : "text-areia"}`}
          >
            {i.icone}
            {i.curto}
            {contador(i.rota) > 0 && <span className="absolute right-4 top-1.5 h-2 w-2 rounded-full bg-brasa" />}
          </a>
        ))}
      </nav>

      {copiloto && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setCopiloto(false)}>
          <div
            role="dialog"
            aria-label="Copiloto Chef"
            className="flex h-full w-full max-w-[460px] flex-col border-l border-linha bg-forno"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-linha px-5 py-4">
              <p className="flex items-center gap-2 font-display text-[20px] font-bold">
                <Sparkles className="h-5 w-5 text-brasa" /> Copiloto Chef
              </p>
              <button onClick={() => setCopiloto(false)} aria-label="Fechar o Copiloto" className="rounded-full p-2 hover:bg-grafite">
                <X className="h-5 w-5" />
              </button>
            </div>
            <Copiloto />
          </div>
        </div>
      )}
    </div>
  );
}
