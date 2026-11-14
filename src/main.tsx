import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./tema";
import { useRota } from "./router";
import { DadosProvider } from "./data/dados";
import { iniciarMonitor, registrarErro } from "./lib/monitor";

// Cada área é baixada só quando abre: o cliente que vai pedir não carrega o painel nem a administração.
const PainelLayout = lazy(() => import("./pages/painel/Layout").then((m) => ({ default: m.PainelLayout })));
const Loja = lazy(() => import("./pages/loja/Loja").then((m) => ({ default: m.Loja })));
const Bio = lazy(() => import("./pages/publico/Bio").then((m) => ({ default: m.Bio })));
const Pesquisa = lazy(() => import("./pages/publico/Pesquisa").then((m) => ({ default: m.Pesquisa })));
const Termos = lazy(() => import("./pages/publico/Legal").then((m) => ({ default: m.Termos })));
const Privacidade = lazy(() => import("./pages/publico/Legal").then((m) => ({ default: m.Privacidade })));
const Redefinir = lazy(() => import("./pages/painel/Login").then((m) => ({ default: m.Redefinir })));
const Admin = lazy(() => import("./pages/admin/Admin").then((m) => ({ default: m.Admin })));
const Mesa = lazy(() => import("./pages/publico/Mesa").then((m) => ({ default: m.Mesa })));

iniciarMonitor();

const Abrindo = () => <div className="grid min-h-screen place-items-center bg-carvao text-areia">Abrindo…</div>;

class Protecao extends React.Component<{ children: React.ReactNode }, { erro: string | null }> {
  state = { erro: null as string | null };
  static getDerivedStateFromError(e: Error) {
    return { erro: e.message };
  }
  componentDidCatch(e: Error, info: React.ErrorInfo) {
    // depois de uma atualização do sistema, a tela aberta pode pedir um pedaço antigo que não existe mais: recarrega uma vez
    if (/dynamically imported module|Importing a module script failed|error loading dynamically/i.test(e.message) && !sessionStorage.getItem("fregues-recarregou")) {
      sessionStorage.setItem("fregues-recarregou", "1");
      window.location.reload();
      return;
    }
    registrarErro(e, "tela", info.componentStack ?? undefined);
  }
  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-carvao p-6 text-center">
        <div className="max-w-[420px]">
          <p className="font-display text-[24px] font-extrabold">Algo deu errado nesta tela</p>
          <p className="mt-2 text-areia">Recarregue a página. Se continuar, mande esta mensagem para o suporte: {this.state.erro}</p>
          <button onClick={() => window.location.reload()} className="mt-5 rounded-full bg-brasa px-6 py-3 font-semibold text-carvao">
            Recarregar
          </button>
        </div>
      </div>
    );
  }
}

function App() {
  return (
    <Suspense fallback={<Abrindo />}>
      <Rotas />
    </Suspense>
  );
}

function Rotas() {
  const rota = useRota();
  if (rota === "inicio") return <PainelLayout rota="painel" />;
  if (rota === "loja") return <Loja />;
  if (rota === "bio") return <Bio />;
  if (rota === "pesquisa") return <Pesquisa />;
  if (rota === "admin") return <Admin />;
  if (rota === "mesa") return <Mesa />;
  if (rota === "termos") return <Termos />;
  if (rota === "redefinir") return <Redefinir />;
  if (rota === "privacidade") return <Privacidade />;
  return <PainelLayout rota={rota} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Protecao>
      <DadosProvider>
        <App />
      </DadosProvider>
    </Protecao>
  </React.StrictMode>,
);
