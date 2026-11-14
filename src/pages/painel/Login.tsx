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
        <Esqueci emailInicial={email} />
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

/** Esqueci minha senha: manda link por e-mail; sem e-mail configurado, orienta a falar com o suporte. */
function Esqueci({ emailInicial }: { emailInicial: string }) {
  const [aberto, setAberto] = useState(false);
  const [em, setEm] = useState(emailInicial);
  const [estado, setEstado] = useState<"" | "enviando" | "ok" | "sem_email">("");
  const [erro, setErro] = useState("");
  if (!aberto)
    return (
      <button type="button" onClick={() => (setAberto(true), setEm(emailInicial))} className="mt-3 w-full text-center text-[14px] text-areia underline-offset-4 hover:text-papel hover:underline">
        Esqueci minha senha
      </button>
    );
  return (
    <div className="mt-4 rounded-2xl border border-linha bg-forno p-4 text-[14px]">
      {estado === "ok" ? (
        <p>Se esse e-mail tiver acesso, chega em instantes um link para criar a nova senha. Olhe também a caixa de spam.</p>
      ) : estado === "sem_email" ? (
        <p>
          Fale com o suporte do Freguês pelo{" "}
          <a href="https://wa.me/5521967640607?text=Esqueci%20a%20senha%20do%20meu%20painel%20do%20Fregu%C3%AAs" target="_blank" rel="noreferrer" className="font-semibold underline">
            WhatsApp
          </a>{" "}
          e receba uma senha provisória.
        </p>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setErro("");
            setEstado("enviando");
            const r = await fetch("/api/conta/esqueci", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: em }) }).catch(() => null);
            const c = r ? await r.json().catch(() => ({})) : {};
            if (!r || !r.ok) {
              setEstado("");
              return setErro(c.erro || "Não consegui agora. Tente de novo.");
            }
            setEstado(c.motivo === "sem_email" ? "sem_email" : "ok");
          }}
        >
          <p className="font-semibold">Esqueci minha senha</p>
          <input type="email" required value={em} onChange={(e) => setEm(e.target.value)} placeholder="seu@email.com" className="mt-2 w-full rounded-xl border-2 border-[#6b5546] bg-[#fff6e9] px-4 py-3 text-[16px] text-carvao outline-none" />
          {erro && <p className="mt-2 text-[#9b3530]">{erro}</p>}
          <button disabled={estado === "enviando"} className="mt-3 w-full rounded-full border border-linha py-2.5 font-semibold hover:border-areia disabled:opacity-60">
            {estado === "enviando" ? "Enviando…" : "Mandar link por e-mail"}
          </button>
        </form>
      )}
    </div>
  );
}

/** Página aberta pelo link do e-mail: cria a senha nova. */
export function Redefinir() {
  const token = new URLSearchParams(window.location.search).get("t") ?? "";
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  return (
    <div className="grid min-h-screen place-items-center bg-carvao p-4 text-papel">
      <form
        className="w-full max-w-[420px] rounded-3xl border border-linha bg-forno p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (s1 !== s2) return setMsg({ ok: false, t: "As duas senhas não são iguais." });
          setEnviando(true);
          const r = await fetch("/api/conta/redefinir", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, senha: s1 }) }).catch(() => null);
          const c = r ? await r.json().catch(() => ({})) : {};
          setEnviando(false);
          setMsg(r && r.ok ? { ok: true, t: "Senha nova criada. Já pode entrar no painel." } : { ok: false, t: c.erro || "Não consegui agora. Tente de novo." });
        }}
      >
        <h1 className="font-display text-[26px] font-extrabold">Criar nova senha</h1>
        {msg?.ok ? (
          <>
            <p className="mt-3 text-[15px] text-manjericao">{msg.t}</p>
            <a href="/#painel" className="mt-5 block rounded-full bg-brasa py-3 text-center font-semibold text-carvao">
              Ir para o painel
            </a>
          </>
        ) : (
          <>
            <label className="mt-4 block text-[14px] font-semibold">
              Nova senha (mínimo 8 caracteres)
              <input type="password" required minLength={8} value={s1} onChange={(e) => setS1(e.target.value)} autoComplete="new-password" className="mt-1.5 w-full rounded-xl border-2 border-[#6b5546] bg-[#fff6e9] px-4 py-3 text-[16px] text-carvao outline-none" />
            </label>
            <label className="mt-3 block text-[14px] font-semibold">
              Repita a senha
              <input type="password" required minLength={8} value={s2} onChange={(e) => setS2(e.target.value)} autoComplete="new-password" className="mt-1.5 w-full rounded-xl border-2 border-[#6b5546] bg-[#fff6e9] px-4 py-3 text-[16px] text-carvao outline-none" />
            </label>
            {msg && <p className="mt-3 text-[14px] text-[#e8846f]">{msg.t}</p>}
            <button disabled={enviando || !token} className="mt-5 w-full rounded-full bg-brasa py-3.5 font-semibold text-carvao disabled:opacity-60">
              {enviando ? "Salvando…" : "Salvar senha"}
            </button>
            {!token && <p className="mt-2 text-[13px] text-areia">Link incompleto. Abra de novo pelo e-mail.</p>}
          </>
        )}
      </form>
    </div>
  );
}
