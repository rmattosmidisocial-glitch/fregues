import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { useRota } from "./router";
import { Landing } from "./pages/Landing";
import { PainelLayout } from "./pages/painel/Layout";
import { Loja } from "./pages/loja/Loja";
import { DadosProvider } from "./data/dados";
import { Bio } from "./pages/publico/Bio";
import { Pesquisa } from "./pages/publico/Pesquisa";

function App() {
  const rota = useRota();
  if (rota === "inicio") return <Landing />;
  if (rota === "loja") return <Loja />;
  if (rota === "bio") return <Bio />;
  if (rota === "pesquisa") return <Pesquisa />;
  return <PainelLayout rota={rota} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DadosProvider>
      <App />
    </DadosProvider>
  </React.StrictMode>,
);
