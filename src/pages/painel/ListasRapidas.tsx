import { useMemo, useState } from "react";
import { Cake, Clock, Copy, Crown, Download, Gift, MessageCircle, Repeat, Sparkles, TrendingDown, UserPlus } from "lucide-react";
import { brl, type Freguês } from "../../data/mock";
import { useDados } from "../../data/dados";

const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
/** Dia e mês do aniversário (do ISO ou do texto "14 nov" / "14 de nov."). */
export function diaMesAniv(f: Freguês): { dia: number; mes: number } | null {
  if (f.aniversarioISO) {
    const [, m, d] = f.aniversarioISO.split("-").map(Number);
    if (m && d) return { dia: d, mes: m };
  }
  const t = (f.aniversario ?? "").toLowerCase();
  const dia = Number(t.match(/\d+/)?.[0]);
  const mes = MES.findIndex((m) => t.includes(m)) + 1;
  return dia && mes ? { dia, mes } : null;
}
const gasto = (f: Freguês) => f.pontos; // total gasto (o CRM guarda em pontos 1 por real)

type Linha = { f: Freguês; valor: string };
type Lista = { id: string; titulo: string; sub: string; icone: React.ReactNode; ranking?: boolean; montar: (fs: Freguês[]) => Linha[]; msg: string };

function diasAteAniv(a: { dia: number; mes: number }) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  let alvo = new Date(hoje.getFullYear(), a.mes - 1, a.dia);
  if (alvo < hoje) alvo = new Date(hoje.getFullYear() + 1, a.mes - 1, a.dia);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400e3);
}

const LISTAS: Lista[] = [
  {
    id: "top",
    titulo: "Mais compram",
    sub: "Quem mais gastou na casa",
    icone: <Crown className="h-5 w-5" />,
    ranking: true,
    montar: (fs) => [...fs].sort((a, b) => gasto(b) - gasto(a)).map((f) => ({ f, valor: `${brl(gasto(f))} em ${f.pedidos} pedidos` })),
    msg: "Oi, {nome}! Aqui é da {loja}. Você está entre os nossos clientes mais especiais e a gente quis agradecer: no seu próximo pedido tem um mimo esperando por você. 🧡",
  },
  {
    id: "frequentes",
    titulo: "Mais frequentes",
    sub: "Quem mais vezes pediu",
    icone: <Repeat className="h-5 w-5" />,
    ranking: true,
    montar: (fs) => [...fs].sort((a, b) => b.pedidos - a.pedidos).map((f) => ({ f, valor: `${f.pedidos} pedidos · a cada ${f.intervalo} dias` })),
    msg: "Oi, {nome}! Aqui é da {loja}. Você é de casa! Obrigado por pedir sempre com a gente. Tem novidade no cardápio, vem conferir. 😉",
  },
  {
    id: "ticket",
    titulo: "Maior ticket",
    sub: "Quem gasta mais por pedido",
    icone: <Sparkles className="h-5 w-5" />,
    ranking: true,
    montar: (fs) =>
      fs
        .filter((f) => f.pedidos >= 2)
        .sort((a, b) => b.ticket - a.ticket)
        .map((f) => ({ f, valor: `${brl(f.ticket)} por pedido` })),
    msg: "Oi, {nome}! Aqui é da {loja}. Separamos uma novidade especial que tem a sua cara. Quer que eu te mande o cardápio?",
  },
  {
    id: "aniv-mes",
    titulo: "Aniversário no mês",
    sub: "Quem faz aniversário este mês",
    icone: <Cake className="h-5 w-5" />,
    montar: (fs) => {
      const m = new Date().getMonth() + 1;
      return fs
        .map((f) => ({ f, a: diaMesAniv(f) }))
        .filter((x) => x.a?.mes === m)
        .sort((x, y) => x.a!.dia - y.a!.dia)
        .map(({ f, a }) => ({ f, valor: `dia ${a!.dia}` }));
    },
    msg: "Oi, {nome}! Aqui é da {loja}. Seu aniversário está chegando e o presente é por nossa conta: na semana do seu dia, tem um mimo no seu pedido! 🎉",
  },
  {
    id: "aniv-7",
    titulo: "Aniversário em 7 dias",
    sub: "Para mandar o parabéns na hora certa",
    icone: <Gift className="h-5 w-5" />,
    montar: (fs) =>
      fs
        .map((f) => ({ f, a: diaMesAniv(f) }))
        .filter((x) => x.a && diasAteAniv(x.a) <= 7)
        .sort((x, y) => diasAteAniv(x.a!) - diasAteAniv(y.a!))
        .map(({ f, a }) => {
          const n = diasAteAniv(a!);
          return { f, valor: n === 0 ? "é hoje!" : n === 1 ? "amanhã" : `em ${n} dias (${a!.dia}/${String(a!.mes).padStart(2, "0")})` };
        }),
    msg: "Parabéns, {nome}! 🎂 A {loja} deseja um dia incrível. Para comemorar, seu próximo pedido tem um presente nosso!",
  },
  {
    id: "sumindo",
    titulo: "Bons clientes sumindo",
    sub: "Saíram do ritmo, ordenados por quanto gastam",
    icone: <TrendingDown className="h-5 w-5" />,
    montar: (fs) =>
      fs
        .filter((f) => f.status !== "ritmo")
        .sort((a, b) => gasto(b) - gasto(a))
        .map((f) => ({ f, valor: `${f.diasDesde} dias sem pedir · costuma a cada ${f.intervalo}` })),
    msg: "Oi, {nome}! Aqui é da {loja}. Sentimos sua falta! O seu {favorito} está te esperando. Bora pedir hoje?",
  },
  {
    id: "uma-vez",
    titulo: "Só 1 compra",
    sub: "Para trazer de volta no segundo pedido",
    icone: <UserPlus className="h-5 w-5" />,
    montar: (fs) =>
      fs
        .filter((f) => f.pedidos === 1)
        .sort((a, b) => a.diasDesde - b.diasDesde)
        .map((f) => ({ f, valor: `pediu há ${f.diasDesde} dias` })),
    msg: "Oi, {nome}! Aqui é da {loja}. Que bom ter você com a gente! Gostou do pedido? O segundo vem com um carinho especial. 😊",
  },
  {
    id: "60dias",
    titulo: "60+ dias sem pedir",
    sub: "Clientes antigos para reconquistar",
    icone: <Clock className="h-5 w-5" />,
    montar: (fs) =>
      fs
        .filter((f) => f.diasDesde >= 60)
        .sort((a, b) => gasto(b) - gasto(a))
        .map((f) => ({ f, valor: `${f.diasDesde} dias sem pedir` })),
    msg: "Oi, {nome}! Aqui é da {loja}. Faz tempo, hein? Muita coisa nova no cardápio. Que tal matar a saudade hoje?",
  },
];

const zap = (tel: string, texto: string) => {
  const t = tel.replace(/\D/g, "");
  if (t.length < 10) return null;
  return `https://wa.me/${t.startsWith("55") ? t : "55" + t}?text=${encodeURIComponent(texto)}`;
};

export function ListasRapidas({ avisar }: { avisar: (t: string) => void }) {
  const d = useDados();
  const [aberta, setAberta] = useState<string | null>(null);
  const [qtd, setQtd] = useState(10);
  const [soQuemAceita, setSoQuemAceita] = useState(true);
  const [msgs, setMsgs] = useState<Record<string, string>>({});
  const contagem = useMemo(() => Object.fromEntries(LISTAS.map((l) => [l.id, l.montar(d.fregueses).length])), [d.fregueses]);

  const lista = LISTAS.find((l) => l.id === aberta);
  const todas = lista ? lista.montar(d.fregueses) : [];
  const filtradas = todas.filter((x) => !soQuemAceita || x.f.aceitaMarketing !== false);
  const linhas = lista?.ranking ? filtradas.slice(0, qtd) : filtradas;
  const msg = lista ? (msgs[lista.id] ?? lista.msg) : "";
  const texto = (f: Freguês) =>
    msg
      .split("{nome}").join(f.nome.split(" ")[0])
      .split("{loja}").join(d.loja.nome)
      .split("{favorito}").join(f.favorito && f.favorito !== "—" ? f.favorito : "pedido de sempre");

  function copiar() {
    const tels = linhas.map((x) => x.f.tel).filter((t) => t.replace(/\D/g, "").length >= 10);
    navigator.clipboard?.writeText(tels.join("\n")).then(
      () => avisar(`${tels.length} telefones copiados`),
      () => avisar("Não consegui copiar"),
    );
  }
  function baixar() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = ["Posição;Nome;WhatsApp;Detalhe;Pedidos;Total gasto;Aniversário", ...linhas.map((x, i) => [i + 1, x.f.nome, x.f.tel, x.valor, x.f.pedidos, gasto(x.f).toFixed(2).replace(".", ","), x.f.aniversario ?? ""].map(esc).join(";"))].join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${lista!.titulo.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mt-6 rounded-3xl border border-linha bg-forno p-5">
      <h2 className="font-display text-[22px] font-bold">Listas rápidas</h2>
      <p className="text-[14px] text-areia">Um toque e a lista sai pronta, com a mensagem para mandar no WhatsApp.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {LISTAS.map((l) => (
          <button key={l.id} onClick={() => setAberta(aberta === l.id ? null : l.id)} aria-pressed={aberta === l.id} className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${aberta === l.id ? "border-brasa bg-brasa/10" : "border-linha hover:bg-grafite"}`}>
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${aberta === l.id ? "bg-brasa text-carvao" : "bg-grafite text-brasa"}`}>{l.icone}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold leading-tight">{l.titulo}</span>
              <span className="block truncate text-[12px] text-areia">{l.ranking ? l.sub : `${contagem[l.id]} ${contagem[l.id] === 1 ? "pessoa" : "pessoas"} · ${l.sub}`}</span>
            </span>
          </button>
        ))}
      </div>

      {lista && (
        <div className="mt-5 rounded-2xl border border-linha p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-[19px] font-bold">{lista.titulo}</h3>
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              {lista.ranking && (
                <select value={qtd} onChange={(e) => setQtd(Number(e.target.value))} aria-label="Quantos" className="rounded-full border border-linha bg-forno px-3 py-1.5">
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      Top {n}
                    </option>
                  ))}
                </select>
              )}
              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-linha px-3 py-1.5">
                <input type="checkbox" checked={soQuemAceita} onChange={() => setSoQuemAceita(!soQuemAceita)} className="accent-[#c2410c]" />
                Só quem aceita receber mensagens
              </label>
              <button onClick={copiar} disabled={!linhas.length} className="flex items-center gap-1.5 rounded-full border border-linha px-3 py-1.5 font-semibold hover:bg-grafite disabled:opacity-40">
                <Copy className="h-4 w-4" /> Copiar telefones
              </button>
              <button onClick={baixar} disabled={!linhas.length} className="flex items-center gap-1.5 rounded-full border border-linha px-3 py-1.5 font-semibold hover:bg-grafite disabled:opacity-40">
                <Download className="h-4 w-4" /> Planilha
              </button>
            </div>
          </div>

          <label className="mt-3 block text-[13px] font-semibold text-areia">
            Mensagem (use {"{nome}"}, {"{loja}"} e {"{favorito}"})
            <textarea value={msg} onChange={(e) => setMsgs({ ...msgs, [lista.id]: e.target.value })} rows={2} className="mt-1 w-full rounded-xl border border-linha bg-carvao/0 px-3 py-2 text-[14px] font-normal text-papel outline-none focus:border-brasa" />
          </label>

          {!linhas.length ? (
            <p className="mt-3 rounded-xl bg-grafite p-4 text-[14px] text-areia">
              {todas.length && soQuemAceita ? "Ninguém desta lista aceitou receber mensagens. Desmarque o filtro para ver todos." : lista.id.startsWith("aniv") ? "Ninguém aqui ainda. As datas chegam pelo pedido na loja online, pela mesa (o garçom anota) e pelos formulários." : "Ninguém nesta lista agora."}
            </p>
          ) : (
            <ol className="mt-3 divide-y divide-linha">
              {linhas.map((x, i) => {
                const link = zap(x.f.tel, texto(x.f));
                return (
                  <li key={x.f.id} className="flex items-center gap-3 py-2.5">
                    <span className={`tabular w-7 shrink-0 text-center font-display text-[16px] font-extrabold ${lista.ranking && i < 3 ? "text-brasa" : "text-fumo"}`}>{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {x.f.nome}
                        {x.f.aceitaMarketing === false && <span className="ml-2 rounded-full bg-grafite px-2 py-0.5 text-[11px] font-normal text-areia">não aceita ofertas</span>}
                      </p>
                      <p className="truncate text-[13px] text-areia">{x.valor}</p>
                    </div>
                    {link ? (
                      <a href={link} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1.5 rounded-full bg-papel px-3 py-2 text-[13px] font-semibold text-carvao hover:bg-mostarda">
                        <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">Mandar</span>
                      </a>
                    ) : (
                      <span className="shrink-0 text-[12px] text-fumo">sem telefone</span>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          {lista.ranking && filtradas.length > linhas.length && (
            <p className="mt-2 text-[13px] text-fumo">
              Mostrando {linhas.length} de {filtradas.length}.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
