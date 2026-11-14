import { useState } from "react";
import { KeyRound, LogOut, Mail, X } from "lucide-react";
import { useDados } from "../../data/dados";

const campo = "mt-1.5 w-full rounded-xl border border-linha bg-grafite px-4 py-3 text-[16px] text-papel outline-none focus:border-brasa";

/** O dono troca a senha provisória e o e-mail de login. */
export function MinhaConta({ fechar }: { fechar: () => void }) {
  const d = useDados();
  const emailAtual = d.sessao?.user.email ?? "";
  const provisoria = !!d.sessao?.user.user_metadata?.trocar_senha;
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [email, setEmail] = useState("");
  const [msgSenha, setMsgSenha] = useState<{ ok: boolean; t: string } | null>(null);
  const [msgEmail, setMsgEmail] = useState<{ ok: boolean; t: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={fechar}>
      <div role="dialog" aria-label="Minha conta" className="scroll-thin max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-3xl border border-linha bg-forno p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-[24px] font-extrabold">Minha conta</h2>
            <p className="mt-1 break-all text-[14px] text-areia">Você entra com {emailAtual}</p>
          </div>
          <button onClick={fechar} aria-label="Fechar" className="rounded-full p-2 hover:bg-grafite">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          className="mt-5 rounded-2xl border border-linha p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (senha !== senha2) return setMsgSenha({ ok: false, t: "As duas senhas não são iguais." });
            setOcupado(true);
            const erro = await d.acoes.trocarSenha(senha);
            setOcupado(false);
            setMsgSenha(erro ? { ok: false, t: erro } : { ok: true, t: "Senha trocada. Use a nova senha no próximo acesso." });
            if (!erro) {
              setSenha("");
              setSenha2("");
            }
          }}
        >
          <h3 className="flex items-center gap-2 text-[17px] font-bold">
            <KeyRound className="h-5 w-5 text-brasa" /> Trocar a senha
          </h3>
          {provisoria && <p className="mt-1 text-[14px] text-mostarda">Você está com a senha provisória que recebeu. Crie uma só sua.</p>}
          <label className="mt-3 block text-[14px] font-semibold">
            Nova senha <span className="font-normal text-areia">(mínimo 8 caracteres)</span>
            <input type="password" required minLength={8} autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} className={campo} />
          </label>
          <label className="mt-3 block text-[14px] font-semibold">
            Repita a nova senha
            <input type="password" required minLength={8} autoComplete="new-password" value={senha2} onChange={(e) => setSenha2(e.target.value)} className={campo} />
          </label>
          {msgSenha && <p className={`mt-3 text-[14px] ${msgSenha.ok ? "text-manjericao" : "text-[#e8846f]"}`}>{msgSenha.t}</p>}
          <button disabled={ocupado} className="mt-4 w-full rounded-xl bg-brasa py-3 text-[16px] font-bold text-carvao hover:bg-mostarda disabled:opacity-60">
            Salvar nova senha
          </button>
        </form>

        <form
          className="mt-4 rounded-2xl border border-linha p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setOcupado(true);
            const erro = await d.acoes.trocarEmail(email);
            setOcupado(false);
            setMsgEmail(erro ? { ok: false, t: erro } : { ok: true, t: `Mandamos um link de confirmação para ${email.trim()}. Abra e confirme (pode chegar também no e-mail atual). Até confirmar, continue entrando com ${emailAtual}.` });
          }}
        >
          <h3 className="flex items-center gap-2 text-[17px] font-bold">
            <Mail className="h-5 w-5 text-brasa" /> Trocar o e-mail de login
          </h3>
          <label className="mt-3 block text-[14px] font-semibold">
            Novo e-mail
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={campo} />
          </label>
          {msgEmail && <p className={`mt-3 text-[14px] ${msgEmail.ok ? "text-manjericao" : "text-[#e8846f]"}`}>{msgEmail.t}</p>}
          <button disabled={ocupado} className="mt-4 w-full rounded-xl border-2 border-papel py-3 text-[16px] font-semibold text-papel hover:bg-papel hover:text-carvao disabled:opacity-60">
            Trocar e-mail
          </button>
        </form>

        <button onClick={() => d.acoes.sair()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[15px] text-areia hover:text-papel">
          <LogOut className="h-4 w-4" /> Sair do painel
        </button>
      </div>
    </div>
  );
}
