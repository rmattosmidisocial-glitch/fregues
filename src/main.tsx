import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./tema";
import { useRota } from "./router";
import { PainelLayout } from "./pages/painel/Layout";
import { Loja } from "./pages/loja/Loja";
import { DadosProvider } from "./data/dados";
import { Bio } from "./pages/publico/Bio";
import { Pesquisa } from "./pages/publico/Pesquisa";
import { Privacidade, Termos } from "./pages/publico/Legal";
import { Admin } from "./pages/admin/Admin";
import { Mesa } from "./pages/publico/Mesa";

class Protecao extends React.Component<{ children: React.ReactNode }, { erro: string | null }> {
  state = { erro: null as string | null };
  static getDerivedStateFromError(e: Error) {
    return { erro: e.message };
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
  const rota = useRota();
  if (rota === "inicio") return <PainelLayout rota="painel" />;
  if (rota === "loja") return <Loja />;
  if (rota === "bio") return <Bio />;
  if (rota === "pesquisa") return <Pesquisa />;
  if (rota === "admin") return <Admin />;
  if (rota === "mesa") return <Mesa />;
  if (rota === "termos") return <Termos />;
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
