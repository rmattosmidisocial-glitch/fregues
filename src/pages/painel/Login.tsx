import { useState } from "react";
import { Logo } from "../../components/Logo";
import { useDados } from "../../data/dados";

export const DEMO_EMAIL = "demo@fregues.app";
export const DEMO_SENHA = "brasa2026";

export function Login() {
  const { acoes } = useDados();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(e?: React.FormEvent, em = email, se = senha) {
    e?.preventDefault();
    if (!em.trim() || !se) {
      setErro("Preencha e-mail e senha.");
      return;
    }
    setEnviando(true);
    const r = await acoes.entrar(em.trim(), se);
    setEnviando(false);
    if (r) setErro(r);
  }

  return (
    <div className="tema-claro grid min-h-screen place-items-center bg-carvao px-4">
      <div className="w-full max-w-[400px]">
        <a href="#" aria-label="Voltar para o site">
          <Logo />
        </a>
        <h1 className="mt-8 font-display text-[34px] font-extrabold leading-tight tracking-[-0.015em]">Entrar no painel</h1>
        <p className="mt-2 text-[15px] text-areia">Acompanhe pedidos, entregas e fregueses da sua casa.</p>
        <form onSubmit={entrar} className="mt-6 space-y-3" noValidate>
          <label className="block text-[15px] font-semibold text-papel">
            E-mail
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErro("");
              }}
              className="mt-1.5 w-full rounded-xl border-2 border-[#6b5546] bg-[#fff6e9] px-4 py-3 text-[16px] text-carvao outline-none focus:border-brasa"
            />
          </label>
          <label className="block text-[15px] font-semibold text-papel">
            Senha
            <input
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value);
                setErro("");
              }}
              className="mt-1.5 w-full rounded-xl border-2 border-[#6b5546] bg-[#fff6e9] px-4 py-3 text-[16px] text-carvao outline-none focus:border-brasa"
            />
          </label>
          {erro && (
            <p role="alert" className="text-[14px] font-semibold text-[#9b3530]">
              {erro}
            </p>
          )}
          <button disabled={enviando} className="w-full rounded-full bg-brasa py-3.5 text-[16px] font-semibold text-carvao hover:bg-mostarda disabled:opacity-60">
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <div className="mt-6 rounded-2xl border border-linha bg-forno p-4">
          <p className="text-[14px] text-areia">Quer só conhecer? Entre na loja de demonstração Brasa Burger.</p>
          <button
            onClick={() => {
              setEmail(DEMO_EMAIL);
              setSenha(DEMO_SENHA);
              entrar(undefined, DEMO_EMAIL, DEMO_SENHA);
            }}
            className="mt-3 w-full rounded-full border border-linha py-3 text-[15px] font-semibold hover:border-areia"
          >
            Entrar na demonstração
          </button>
        </div>
      </div>
    </div>
  );
}
