import { useEffect, useState } from "react";
import { Cake, HeartHandshake, MapPin, MessageCircle, RefreshCw, SkipForward, Star, UserRoundSearch, Zap } from "lucide-react";
import { brl } from "../../data/mock";
import { useDados } from "../../data/dados";
import { INFO, TIPOS, montarTexto, useAutomacoes, type ItemFila, type Regra, type TipoAuto } from "../../data/automacoes";
import { useToast } from "../../components/ui";

const ICONE: Record<TipoAuto, React.ReactNode> = {
  sumindo: <UserRoundSearch className="h-5 w-5" />,
  aniversario: <Cake className="h-5 w-5" />,
  pos_entrega: <Star className="h-5 w-5" />,
  primeiro_pedido: <HeartHandshake className="h-5 w-5" />,
};

function Interruptor({ ligado, onChange, rotulo }: { ligado: boolean; onChange: (v: boolean) => void; rotulo: string }) {
  return (
    <button role="switch" aria-checked={ligado} aria-label={rotulo} onClick={() => onChange(!ligado)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${ligado ? "bg-manjericao" : "bg-linha"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${ligado ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export function Automacoes() {
  const d = useDados();
  const a = useAutomacoes();
  const { show, Toast } = useToast();
  const ligadas = a.regras.filter((r) => r.ligada).length;
  const total30 = TIPOS.reduce((s, t) => s + a.resumo[t].enviadas, 0);
  const voltaram30 = TIPOS.reduce((s, t) => s + a.resumo[t].voltaram, 0);
  const receita30 = TIPOS.reduce((s, t) => s + a.resumo[t].receita, 0);

  return (
    <div>
      <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Automações</h1>
      <p className="max-w-[760px] text-[15px] text-areia">
        Ligue as mensagens que a casa quer mandar. Todo dia o sistema separa <b className="text-papel">quem deve receber cada uma</b>, já com o texto pronto. Você envia com um toque no WhatsApp e acompanha quem voltou a pedir.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {[
          ["Regras ligadas", `${ligadas} de ${TIPOS.length}`],
          ["Na fila hoje", String(a.fila.length)],
          ["Enviadas (30 dias)", String(total30)],
          ["Voltaram a pedir", total30 ? `${voltaram30} · ${brl(receita30)}` : "—"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-linha bg-forno p-4">
            <p className="text-[13px] text-areia">{k}</p>
            <p className="tabular mt-1 font-display text-[24px] font-extrabold">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <section className="rounded-3xl border border-linha bg-forno p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-[22px] font-bold">
              <MessageCircle className="h-5 w-5 text-brasa" /> Fila de hoje
            </h2>
            <button onClick={() => a.recarregar().then(() => show("Fila atualizada"))} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-areia hover:bg-grafite hover:text-papel">
              <RefreshCw className="h-4 w-4" /> Atualizar
            </button>
          </div>
          {a.carregando ? (
            <p className="mt-4 text-areia">Montando a fila…</p>
          ) : ligadas === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-linha p-6 text-center text-areia">Ligue uma regra ao lado e a fila aparece aqui.</p>
          ) : a.fila.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-linha p-6 text-center text-areia">Tudo em dia! Ninguém para chamar agora.</p>
          ) : (
            <div className="mt-3 space-y-5">
              {TIPOS.filter((t) => a.fila.some((i) => i.tipo === t)).map((t) => (
                <div key={t}>
                  <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-areia">
                    {INFO[t].nome} · {a.fila.filter((i) => i.tipo === t).length}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {a.fila
                      .filter((i) => i.tipo === t)
                      .map((i) => (
                        <LinhaFila key={i.tipo + i.customerId + (i.ref ?? "")} i={i} regra={a.regras.find((r) => r.tipo === t)!} loja={d.loja.nome} marcar={a.marcar} />
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-4">
          {TIPOS.map((t) => (
            <CartaoRegra key={t} r={a.regras.find((x) => x.tipo === t)!} res={a.resumo[t]} salvar={a.salvarRegra} avisar={show} loja={d.loja.nome} />
          ))}
          <div className="flex gap-3 rounded-3xl border border-linha bg-forno p-5 text-[14px]">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brasa" />
            <p className="text-areia">
              <b className="text-papel">Avisar quem estava fora da área:</b> quando você libera um bairro no <a href="#mapa" className="font-semibold text-papel underline">Território</a>, a lista de quem pediu aparece lá, com o botão Avisar.
            </p>
          </div>
          <div className="flex gap-3 rounded-3xl border border-dashed border-linha p-5 text-[14px]">
            <Zap className="mt-0.5 h-5 w-5 shrink-0 text-mostarda" />
            <p className="text-areia">
              <b className="text-papel">Envio 100% automático (sem tocar):</b> depende do WhatsApp oficial da loja (API da Meta). Quando estiver ligado, estas mesmas regras passam a sair sozinhas.
            </p>
          </div>
        </div>
      </div>
      <Toast />
    </div>
  );
}

function LinhaFila({ i, regra, loja, marcar }: { i: ItemFila; regra: Regra; loja: string; marcar: (i: ItemFila, pulou: boolean) => Promise<void> }) {
  const texto = montarTexto(regra.texto, i, loja);
  const tel = i.telefone.replace(/\D/g, "");
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl bg-grafite px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-semibold">{i.nome}</p>
        <p className="truncate text-[13px] text-areia">{i.detalhe}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button onClick={() => marcar(i, true)} title="Pular (não mandar)" aria-label={`Pular ${i.nome}`} className="rounded-full p-2 text-areia hover:bg-carvao hover:text-papel">
          <SkipForward className="h-4 w-4" />
        </button>
        <a
          href={`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`}
          target="_blank"
          rel="noreferrer"
          onClick={() => marcar(i, false)}
          className="flex items-center gap-1.5 rounded-full bg-[#25d366] px-3 py-1.5 text-[13px] font-semibold text-[#08301a]"
        >
          <MessageCircle className="h-4 w-4" /> Enviar
        </a>
      </div>
    </li>
  );
}

function CartaoRegra({
  r,
  res,
  salvar,
  avisar,
  loja,
}: {
  r: Regra;
  res: { enviadas: number; voltaram: number; receita: number };
  salvar: (t: TipoAuto, c: Partial<Regra>) => Promise<string | null>;
  avisar: (t: string) => void;
  loja: string;
}) {
  const info = INFO[r.tipo];
  const [texto, setTexto] = useState(r.texto);
  const [aberto, setAberto] = useState(false);
  useEffect(() => setTexto(r.texto), [r.texto]);
  return (
    <section className={`rounded-3xl border bg-forno p-5 ${r.ligada ? "border-manjericao/50" : "border-linha"}`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${r.ligada ? "bg-manjericao text-carvao" : "bg-grafite text-areia"}`}>{ICONE[r.tipo]}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{info.nome}</p>
          <p className="text-[13px] text-areia">{info.quando}</p>
        </div>
        <Interruptor
          ligado={r.ligada}
          rotulo={`Ligar ${info.nome}`}
          onChange={async (v) => {
            const e = await salvar(r.tipo, { ligada: v });
            avisar(e ?? (v ? `${info.nome}: ligada` : `${info.nome}: desligada`));
          }}
        />
      </div>
      {res.enviadas > 0 && (
        <p className="mt-3 text-[13px] text-areia">
          30 dias: <b className="text-papel">{res.enviadas}</b> enviadas · <b className="text-papel">{res.voltaram}</b> pediram em até 7 dias{res.receita ? ` · ${brl(res.receita)}` : ""}
        </p>
      )}
      <button onClick={() => setAberto(!aberto)} className="mt-3 text-[13px] font-semibold text-areia underline">
        {aberto ? "Fechar" : "Ver e editar a mensagem"}
      </button>
      {aberto && (
        <div className="mt-3 space-y-2 text-[13px] text-areia">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={async () => {
              if (texto === r.texto) return;
              const e = await salvar(r.tipo, { texto });
              avisar(e ?? "Mensagem salva");
            }}
            rows={4}
            aria-label={`Mensagem: ${info.nome}`}
            className="w-full rounded-xl border border-linha bg-grafite px-3 py-2 text-[14px] leading-relaxed text-papel"
          />
          <p>
            Preenchidos sozinhos: <code>{"{nome}"}</code> <code>{"{loja}"}</code> <code>{"{favorito}"}</code> <code>{"{link}"}</code>
          </p>
          <p className="rounded-xl rounded-tl-sm bg-[#e4f3ea] p-3 text-[14px] leading-relaxed text-[#1e3a2c]">{montarTexto(texto, { nome: "Maria Silva", favorito: "X-Bacon" }, loja)}</p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>{info.regra}</p>
            {texto !== INFO[r.tipo].padrao && (
              <button
                onClick={async () => {
                  setTexto(INFO[r.tipo].padrao);
                  const e = await salvar(r.tipo, { texto: INFO[r.tipo].padrao });
                  avisar(e ?? "Voltou ao texto padrão");
                }}
                className="font-semibold underline"
              >
                Voltar ao texto padrão
              </button>
            )}
          </div>
          {r.tipo === "aniversario" && (
            <label className="flex items-center gap-2">
              Avisar
              <input
                inputMode="numeric"
                defaultValue={r.dias}
                onBlur={async (e) => {
                  const n = Math.max(0, Math.min(15, Number(e.target.value) || 0));
                  if (n === r.dias) return;
                  const er = await salvar(r.tipo, { dias: n });
                  avisar(er ?? `Agora avisa ${n} dias antes`);
                }}
                className="w-14 rounded-lg border border-linha bg-grafite px-2 py-1 text-center text-papel"
              />
              dias antes do aniversário
            </label>
          )}
        </div>
      )}
    </section>
  );
}
