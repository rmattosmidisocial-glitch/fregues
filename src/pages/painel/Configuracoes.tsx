import { useState } from "react";
import { CheckCircle2, Wallet } from "lucide-react";
import { useDados } from "../../data/dados";
import { codigoPix, normalizarChave, tipoChave } from "../../lib/pix";
import { brl } from "../../data/mock";

const campo = "mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px] text-papel";

/** Configurações da loja, feitas pelo próprio dono. */
export function Configuracoes() {
  const d = useDados();
  if (d.modo === "real" && !d.loja.id) return <p className="text-areia">Abrindo as configurações…</p>;
  return (
    <div className="max-w-[760px]">
      <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Configurações</h1>
      <p className="text-[15px] text-areia">Tudo o que você ajusta aqui muda na hora na sua loja.</p>
      <div className="mt-6 space-y-5">
        <Pagamentos key={d.loja.id} />
      </div>
    </div>
  );
}

function Secao({ icone, titulo, sub, children }: { icone: React.ReactNode; titulo: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-linha bg-forno p-5">
      <h2 className="flex items-center gap-2 font-display text-[20px] font-bold">
        {icone} {titulo}
      </h2>
      <p className="mt-1 text-[14px] text-areia">{sub}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Pagamentos() {
  const d = useDados();
  const [chave, setChave] = useState(d.loja.pix_chave ?? "");
  const [nome, setNome] = useState(d.loja.pix_nome ?? d.loja.nome ?? "");
  const [cidade, setCidade] = useState(d.loja.pix_cidade ?? d.loja.cidade ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const tipo = chave.trim() ? tipoChave(chave) : null;
  const exemplo = tipo ? codigoPix({ chave, nome: nome || d.loja.nome, cidade: cidade || "Rio de Janeiro", valor: 1, txid: "TESTE" }) : "";

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (chave.trim() && !tipo) return setMsg({ ok: false, t: "Essa chave não parece válida. Use CPF, CNPJ, celular, e-mail ou chave aleatória." });
    const r = await d.acoes.salvarLoja({ pix_chave: chave.trim() ? normalizarChave(chave) : null, pix_nome: nome.trim() || null, pix_cidade: cidade.trim() || null });
    setMsg(r ? { ok: false, t: r } : { ok: true, t: chave.trim() ? "Pix ligado. Seus clientes já podem pagar com Pix na loja." : "Pix desligado na loja." });
  }

  return (
    <Secao icone={<Wallet className="h-5 w-5 text-brasa" />} titulo="Pix da loja" sub="O cliente paga pelo app do banco e o dinheiro cai direto na sua conta. Sem taxa do Freguês.">
      <form onSubmit={salvar} className="space-y-3 text-[14px]">
        <label className="block font-semibold">
          Sua chave Pix
          <input value={chave} onChange={(e) => (setChave(e.target.value), setMsg(null))} placeholder="CPF, CNPJ, celular, e-mail ou chave aleatória" className={campo} />
          {chave.trim() && <span className={`mt-1 block text-[13px] font-normal ${tipo ? "text-manjericao" : "text-[#e8846f]"}`}>{tipo ? `Chave de ${tipo}: ${normalizarChave(chave)}` : "Chave não reconhecida"}</span>}
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block font-semibold">
            Nome de quem recebe
            <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={25} className={campo} />
          </label>
          <label className="block font-semibold">
            Cidade
            <input value={cidade} onChange={(e) => setCidade(e.target.value)} maxLength={15} className={campo} />
          </label>
        </div>
        {msg && <p className={`text-[14px] ${msg.ok ? "text-manjericao" : "text-[#e8846f]"}`}>{msg.t}</p>}
        <button className="w-full rounded-xl bg-brasa py-3 font-semibold text-carvao hover:bg-mostarda">Salvar Pix</button>
      </form>
      {exemplo && (
        <div className="mt-4 rounded-2xl bg-carvao p-4 text-[13px]">
          <p className="flex items-center gap-1.5 font-semibold text-papel">
            <CheckCircle2 className="h-4 w-4 text-manjericao" /> Teste antes de divulgar
          </p>
          <p className="mt-1 text-areia">Copie o código abaixo e cole no app do seu banco (Pix → Copia e cola). Deve aparecer o seu nome e o valor de {brl(1)}. Não precisa pagar.</p>
          <p className="mt-2 break-all rounded-xl bg-grafite p-2.5 font-mono text-[12px] text-papel">{exemplo}</p>
          <button type="button" onClick={() => navigator.clipboard?.writeText(exemplo)} className="mt-2 rounded-full border border-linha px-3 py-1.5 font-semibold text-papel">
            Copiar código de teste
          </button>
        </div>
      )}
      <p className="mt-4 text-[13px] text-areia">
        Como funciona: cada pedido gera um Pix com o valor certo e o número do pedido (ex.: PED1234). O pedido chega em Pedidos como <b className="text-papel">Pix pendente</b>; confira no seu banco e toque em <b className="text-papel">Marcar como pago</b>. Cartão e dinheiro são pagos na entrega ou na retirada.
      </p>
    </Secao>
  );
}
