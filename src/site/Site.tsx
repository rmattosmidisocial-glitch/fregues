import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Bell, Play, Volume2, VolumeX, Bike, BarChart3, Calculator, ChefHat, ChevronDown, Clock, CreditCard, FileText, Gift, Map, MessageCircle, MessagesSquare, Palette, Printer, QrCode, Smartphone, Sparkles, Store, Check, Users, Workflow, Link2 } from "lucide-react";
import { Logo } from "../components/Logo";
import { BotaoTema } from "../tema";
import { Comanda } from "../components/Comanda";
import { GeoMap, BAIRROS, nomeBairro, vizinhos, type Layer } from "../components/GeoMap";
import { Foto } from "../components/Foto";
import { MarcaDagua } from "../components/MarcaDagua";
import { LOJA, ZONAS, brl, chamarHoje } from "../data/mock";

// Todo contato de venda vai para o WhatsApp da MMATTOS
const NUMERO = "5521967640607";
const wa = (msg = "Olá! Quero saber mais sobre o Freguês para a minha casa.") => `https://wa.me/${NUMERO}?text=${encodeURIComponent(msg)}`;
const WHATS = wa();
const DEMO = "https://app.usefregues.com.br/brasa-burger";

function HeroMapa() {
  const { layers, fit } = useMemo(() => {
    const idsZonas = ZONAS.flatMap((z) => z.bairros);
    const fit = BAIRROS.filter((f) => idsZonas.includes(f.properties.id));
    const base: Layer = {
      id: "base",
      features: vizinhos(fit, 0.6),
      fill: () => "#241b16",
      stroke: () => "#17110e",
      strokeWidth: 0.8,
    };
    const zonas: Layer[] = ZONAS.map((z, i) => ({
      id: z.id,
      features: BAIRROS.filter((f) => z.bairros.includes(f.properties.id)),
      fill: () => z.cor,
      stroke: () => "#17110e",
      strokeWidth: 1.2,
      className: "acender",
      style: { animationDelay: `${0.35 + i * 0.45}s` },
      opacity: () => (z.id === "z3" ? 0.85 : 0.95),
    }));
    return { layers: [base, ...zonas], fit };
  }, []);
  return (
    <GeoMap
      width={620}
      height={560}
      padding={30}
      fitTo={fit}
      layers={layers}
      pins={[{ coord: LOJA.coord, kind: "loja" }]}
      className="h-full w-full"
      ariaLabel="Mapa da Zona Norte do Rio com os bairros atendidos pela Brasa Burger acesos em três zonas de entrega"
    />
  );
}

function Nav() {
  return (
    <header className="relative z-20 mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 md:px-8">
      <a href="#topo" aria-label="Freguês, início">
        <Logo />
      </a>
      <nav className="hidden items-center gap-8 text-[15px] font-semibold text-areia md:flex">
        <a href="#video" className="hover:text-papel">Vídeo</a>
        <a href="#como" className="hover:text-papel">Como funciona</a>
        <a href="#recursos" className="hover:text-papel">Recursos</a>
        <a href="#planos" className="hover:text-papel">Planos</a>
        <a href="#duvidas" className="hover:text-papel">Dúvidas</a>
      </nav>
      <span className="flex items-center gap-2">
        <BotaoTema />
        <a href={WHATS} target="_blank" rel="noreferrer" className="rounded-full bg-papel px-4 py-2 text-[14px] font-semibold text-carvao transition hover:bg-brasa">
          Falar no WhatsApp
        </a>
      </span>
    </header>
  );
}

// Cada setor da gastronomia passa no destaque do topo, com a comanda e o cliente do mesmo tipo de casa.
const SETORES: { setor: string; foto: string; numero: string; cliente: string; itens: [string, number][]; quem: string; pedia: string; dias: number }[] = [
  { setor: "Pizzaria", foto: "pizza", numero: "#2318", cliente: "Larissa G. — primeira compra", itens: [["1x Pizza grande calabresa", 62.9], ["1x Borda de catupiry", 9.9], ["1x Refrigerante 2 L", 14]], quem: "Carlos", pedia: "Pedia Pizza calabresa a cada 7 dias", dias: 23 },
  { setor: "Hamburgueria", foto: "smashbacon", numero: "#1047", cliente: "Bruno M. — cliente da casa", itens: [["2x Smash da Penha", 55.8], ["1x Batata rústica", 18.9], ["2x Refrigerante lata", 13]], quem: "Juliana", pedia: "Pedia X-Bacon duplo a cada 9 dias", dias: 31 },
  { setor: "Japonês", foto: "sushi", numero: "#0874", cliente: "Renata S. — 5º pedido", itens: [["1x Combinado 30 peças", 89.9], ["1x Temaki salmão", 26], ["1x Chá gelado", 9]], quem: "Felipe", pedia: "Pedia Combinado 30 peças a cada 14 dias", dias: 38 },
  { setor: "Bar e boteco", foto: "chopp", numero: "Mesa 6", cliente: "Comanda aberta às 19:12", itens: [["6x Chopp 300 ml", 59.4], ["1x Porção de aipim", 32], ["1x Bolinho de bacalhau", 38]], quem: "Marcos", pedia: "Vinha toda sexta-feira", dias: 21 },
  { setor: "Restaurante", foto: "prato", numero: "#3120", cliente: "Patrícia L. — almoço", itens: [["2x Prato executivo", 59.8], ["1x Suco natural", 9.9], ["1x Pudim", 12]], quem: "Ana", pedia: "Almoçava 3 vezes por semana", dias: 12 },
  { setor: "Açaí e café", foto: "acai", numero: "#0559", cliente: "Diego R. — retirada", itens: [["1x Açaí 500 ml", 24.9], ["2x Adicional", 6], ["1x Água de coco", 7]], quem: "Camila", pedia: "Pedia Açaí 500 ml a cada 5 dias", dias: 19 },
];

function useGiro(total: number, ms = 3800) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setI((v) => (v + 1) % total), ms);
    return () => window.clearInterval(t);
  }, [total, ms]);
  return [i, setI] as const;
}

function Hero() {
  const [i, setI] = useGiro(SETORES.length);
  const atual = SETORES[i];
  return (
    <section id="topo" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-[1240px] items-center gap-6 px-5 pb-16 pt-6 md:grid-cols-[1.05fr_1fr] md:px-8 md:pb-24 md:pt-10">
        <div className="relative z-10">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-linha px-3 py-1 text-[13px] text-areia">
            <span className="h-2 w-2 rounded-full bg-manjericao" />
            Vagas abertas para casas fundadoras no Rio de Janeiro
          </p>
          <h1 className="font-display text-[clamp(3rem,7.6vw,6.4rem)] font-extrabold leading-[0.95] tracking-[-0.015em] text-papel">Cliente vira freguês.</h1>
          <p className="mt-6 max-w-[34rem] text-[clamp(1.05rem,1.6vw,1.3rem)] leading-relaxed text-areia">
            O sistema para toda a gastronomia: pedidos, salão, caixa e relacionamento num lugar só. Conheça o ritmo de cada cliente, facilite o próximo pedido e veja onde a sua casa pode crescer.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href={WHATS} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full bg-brasa px-6 py-3.5 text-[16px] font-bold text-carvao transition hover:bg-mostarda">
              Veja o Freguês na sua casa <ArrowUpRight className="h-5 w-5" />
            </a>
            <a href="#video" className="flex items-center gap-2 rounded-full border border-linha px-6 py-3.5 text-[16px] font-semibold text-papel transition hover:border-areia">
              Assistir em 20 segundos <Play className="h-5 w-5" />
            </a>
          </div>
          <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Tipos de casa">
            {SETORES.map((s, k) => (
              <button
                key={s.setor}
                role="tab"
                aria-selected={k === i}
                onClick={() => setI(k)}
                className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${k === i ? "bg-papel text-carvao" : "border border-linha text-areia hover:text-papel"}`}
              >
                {s.setor}
              </button>
            ))}
          </div>
        </div>
        <div className="relative h-[460px] md:h-[600px]" aria-hidden="true">
          <div className="absolute inset-y-0 left-6 right-0 overflow-hidden rounded-[36px] bg-[#2B211D] md:left-16">
            {SETORES.map((s, k) => (
              <div key={s.setor} className={`absolute inset-0 transition-opacity duration-700 ${k === i ? "opacity-100" : "opacity-0"}`}>
                <Foto chave={s.foto} eager={k < 2} alt="" className="h-full w-full scale-[1.02]" />
              </div>
            ))}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/55 via-transparent to-transparent" />
            <span className="absolute bottom-5 right-5 rounded-full bg-black/55 px-3 py-1.5 text-[13px] font-semibold text-[#FFF6EB] backdrop-blur">{atual.setor}</span>
          </div>
          <div key={atual.numero} className="comanda-sai absolute -bottom-6 left-0 md:-bottom-4 md:-left-6">
            <Comanda itens={atual.itens} numero={atual.numero} cliente={atual.cliente} />
          </div>
          <div className="absolute right-0 top-4 w-[230px] rounded-2xl border border-linha bg-forno/95 p-4 text-[13px] shadow-2xl backdrop-blur md:right-2 md:top-10">
            <div className="flex items-center gap-2">
              <span className="pulso h-2.5 w-2.5 rounded-full bg-tomate" />
              <span className="text-areia">Saiu do ritmo há {atual.dias} dias</span>
            </div>
            <p className="mt-1.5 font-display text-[18px] font-bold leading-tight">{atual.quem}</p>
            <p className="text-areia">{atual.pedia}</p>
            <span className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-brasa py-2 font-semibold text-carvao">
              <MessageCircle className="h-4 w-4" /> Revisar mensagem
            </span>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1240px] px-5 md:px-8">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-linha pt-5 text-[15px] text-areia">
          {["Sem comissão por pedido", "Pix que confirma sozinho", "Entrega por bairro em todo o RJ", "Delivery, salão e balcão juntos", "Sem app para o cliente"].map((t) => (
            <span key={t} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-brasa" /> {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Video() {
  const ref = useRef<HTMLVideoElement>(null);
  const [mudo, setMudo] = useState(true);
  useEffect(() => {
    const v = ref.current;
    if (!v || !("IntersectionObserver" in window)) return;
    const o = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.35 });
    o.observe(v);
    return () => o.disconnect();
  }, []);
  return (
    <section id="video" className="mx-auto max-w-[1240px] px-5 py-24 md:px-8">
      <div className="grid items-center gap-12 md:grid-cols-[1fr_auto] md:gap-20">
        <div>
          <p className="text-[15px] font-semibold text-brasa">Em 20 segundos</p>
          <h2 className="mt-2 max-w-[36rem] font-display text-[clamp(2rem,4.4vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.015em]">Seu cliente sumiu. E você nem percebeu.</h2>
          <p className="mt-5 max-w-[32rem] text-[18px] leading-relaxed text-areia">
            Pizzaria, bar, restaurante, hamburgueria, japonês ou açaí: toda casa tem cliente que some sem avisar. O Freguês mostra quem é, o que costumava pedir e ajuda a chamar de volta, do jeito da sua casa.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={WHATS} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full bg-brasa px-6 py-3.5 text-[16px] font-bold text-carvao transition hover:bg-mostarda">
              Quero ver na minha casa <ArrowUpRight className="h-5 w-5" />
            </a>
            <a href={DEMO} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full border border-linha px-6 py-3.5 text-[16px] font-semibold text-papel transition hover:border-areia">
              Ver loja de demonstração <Store className="h-5 w-5" />
            </a>
          </div>
        </div>
        <div className="relative mx-auto w-[min(78vw,330px)]">
          <div className="absolute -inset-6 -z-10 rounded-[48px] bg-brasa/25 blur-2xl" aria-hidden="true" />
          <div className="overflow-hidden rounded-[36px] border-[8px] border-[#0c0907] bg-[#2B211D] shadow-[0_30px_80px_rgba(0,0,0,.45)]">
            <video
              ref={ref}
              src="/video/fregues-manifesto.mp4"
              poster="/video/fregues-manifesto.webp"
              muted={mudo}
              loop
              playsInline
              preload="metadata"
              className="block aspect-[9/16] w-full object-cover"
              aria-label="Vídeo de apresentação do Freguês"
            />
          </div>
          <button
            onClick={() => {
              const v = ref.current;
              setMudo((m) => !m);
              v?.play().catch(() => {});
            }}
            className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
            aria-label={mudo ? "Ligar o som" : "Desligar o som"}
          >
            {mudo ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </section>
  );
}

function MiniLoja() {
  const itens: [string, string, number][] = [
    ["Pizza grande margherita", "pizza", 58.9],
    ["Prato executivo do dia", "prato", 29.9],
    ["Combinado 20 peças", "sushi", 64.9],
  ];
  return (
    <div className="mx-auto w-[290px] rounded-[38px] border-[10px] border-[#0c0907] bg-[#FFF6EB] p-3 text-[#2B211D] shadow-[0_30px_80px_rgba(0,0,0,.5)]">
      <div className="rounded-2xl bg-[#B73D14] p-4 text-white">
        <p className="font-display text-[22px] font-extrabold leading-none">Sua Casa</p>
        <p className="mt-1 text-[12px]">Aberto · entrega em 25–35 min</p>
      </div>
      <div className="mt-3 space-y-2">
        {itens.map(([nome, foto, preco]) => (
          <div key={nome} className="flex items-center gap-3 rounded-xl bg-white p-2">
            <Foto chave={foto} alt="" className="h-14 w-14 shrink-0 rounded-lg" />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-[#2B211D]">{nome}</p>
              <p className="text-[13px] font-semibold text-[#B73D14]">{brl(preco)}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-[#2B211D] px-4 py-3 text-center text-[14px] font-semibold text-white">Ver sacola · {brl(153.7)}</div>
    </div>
  );
}

function Pilar({
  n,
  titulo,
  texto,
  pontos,
  visual,
  inverter,
  icone,
}: {
  n: string;
  titulo: string;
  texto: string;
  pontos: string[];
  visual: React.ReactNode;
  inverter?: boolean;
  icone: React.ReactNode;
}) {
  return (
    <div className={`grid grid-cols-1 items-center gap-10 [&>*]:min-w-0 py-16 md:grid-cols-2 md:gap-16 md:py-24 ${inverter ? "md:[&>*:first-child]:order-2" : ""}`}>
      <div>
        <div className="flex items-center gap-3 text-brasa">
          {icone}
          <span className="font-display text-[15px] font-bold">{n}</span>
        </div>
        <h3
          className="mt-4 font-display text-[clamp(2rem,4vw,3.3rem)] font-extrabold leading-[0.98] tracking-[-0.015em]"
          style={{ fontVariationSettings: '"wdth" 82' }}
        >
          {titulo}
        </h3>
        <p className="mt-5 max-w-[32rem] text-[18px] leading-relaxed text-areia">{texto}</p>
        <ul className="mt-6 space-y-2.5">
          {pontos.map((p) => (
            <li key={p} className="flex gap-3 text-[16px] text-papel">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-manjericao" /> {p}
            </li>
          ))}
        </ul>
      </div>
      <div>{visual}</div>
    </div>
  );
}

function MiniMapaRegras() {
  return (
    <div className="rounded-3xl border border-linha bg-forno p-5">
      <div className="-mx-2 -mt-2 mb-4 h-[300px] overflow-hidden rounded-2xl bg-[#140f0c]">
        <HeroMapa />
      </div>
      <div className="flex items-center justify-between">
        <p className="font-display text-[20px] font-bold">Território</p>
        <span className="rounded-full bg-grafite px-3 py-1 text-[13px] text-areia">22 bairros ativos</span>
      </div>
      <div className="mt-4 space-y-2">
        {ZONAS.map((z) => (
          <div key={z.id} className="flex items-center gap-3 rounded-xl bg-grafite p-3">
            <span className="h-9 w-9 shrink-0 rounded-lg" style={{ background: z.cor }} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{z.nome}</p>
              <p className="truncate text-[13px] text-areia">{z.bairros.slice(0, 4).map(nomeBairro).join(", ")}…</p>
            </div>
            <div className="text-right text-[13px]">
              <p className="tabular font-semibold">{brl(z.taxa)}</p>
              <p className="text-areia">{z.tempo[0]}–{z.tempo[1]} min</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-dashed border-mostarda/50 p-3 text-[14px] text-areia">
        <span className="font-semibold text-mostarda">31 pessoas de Bonsucesso</span> tentaram pedir este mês. Veja a demanda antes de abrir um novo bairro.
      </div>
    </div>
  );
}

function MiniSalao() {
  const mesas = [
    [1, "livre"], [2, "ocupada", "R$ 104"], [3, "livre"], [4, "conta", "R$ 138"],
    [5, "reservada"], [6, "ocupada", "R$ 203"], [7, "livre"], [8, "ocupada", "R$ 65"],
  ] as const;
  const cor = { livre: "border-dashed border-linha", ocupada: "border-brasa bg-[#fde9df]", conta: "border-mostarda bg-[#fcefd9]", reservada: "border-azulejo bg-[#dff1ee]" } as const;
  return (
    <div className="rounded-3xl border border-linha bg-forno p-5">
      <div className="flex items-center justify-between">
        <p className="font-display text-[20px] font-bold">Salão</p>
        <span className="rounded-full bg-grafite px-3 py-1 text-[13px] text-areia">4 de 8 mesas ocupadas</span>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2.5">
        {mesas.map(([n, st, v]) => (
          <div key={n} className={`flex aspect-square flex-col justify-between rounded-2xl border-2 p-2.5 ${cor[st]}`}>
            <span className="font-display text-[22px] font-extrabold leading-none">{n}</span>
            <span className="text-[12px] font-semibold text-areia">{st === "livre" ? "Livre" : st === "reservada" ? "Reserva" : st === "conta" ? `Conta · ${v}` : v}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[13px]">
        {[["Pix", "R$ 430"], ["Cartão", "R$ 274"], ["Dinheiro", "R$ 146"]].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-grafite p-2.5">
            <p className="text-areia">{k}</p>
            <p className="tabular font-bold">{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-areia">Caixa do dia: delivery, mesas e balcão somados num lugar só.</p>
    </div>
  );
}

function MiniCRM() {
  return (
    <div className="rounded-3xl border border-linha bg-forno p-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#fde9df] p-4">
          <p className="text-[13px] text-[#9a3412]">Em risco esta semana</p>
          <p className="tabular font-display text-[30px] font-extrabold text-brasa">R$ 4.380</p>
        </div>
        <div className="rounded-2xl bg-[#e4f3ea] p-4">
          <p className="text-[13px] text-[#1b6149]">Voltou no mês</p>
          <p className="tabular font-display text-[30px] font-extrabold text-manjericao">R$ 2.910</p>
        </div>
      </div>
      <p className="mt-5 text-[14px] text-areia">Quem merece atenção hoje</p>
      <div className="mt-2 divide-y divide-linha">
        {chamarHoje.slice(0, 3).map((f) => (
          <div key={f.id} className="flex items-center justify-between py-2.5">
            <div>
              <p className="font-semibold">{f.nome}</p>
              <p className="text-[13px] text-areia">{f.favorito}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${f.status === "sumindo" ? "bg-[#fbe4e0] text-[#9b3530]" : "bg-[#fcefd9] text-[#7a4600]"}`}>
              {f.status === "sumindo" ? "Sumindo" : "Fora do ritmo"} · {f.diasDesde} dias
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PILARES: [string, string, string][] = [
  ["Ritmo", "Perceba quem está saindo do próprio ritmo de compra.", "O Freguês avisa quem está sumindo."],
  ["Pulso", "Veja valores estimados em risco e pedidos recuperados.", "Entenda o que merece atenção no caixa."],
  ["O de sempre", "Facilite a recompra com o favorito no momento habitual.", "O favorito dele, na hora dele."],
  ["Território", "Organize entregas e descubra demanda fora da área.", "Veja onde há gente querendo pedir."],
  ["Atendimento", "Responda com contexto e encaminhe conflitos à equipe.", "A casa atende. A equipe assume quando precisa."],
];

const GRUPOS: { titulo: string; itens: [React.ReactNode, string, string][] }[] = [
  {
    titulo: "Vender",
    itens: [
      [<Store key="a" className="h-5 w-5" />, "Loja própria", "Cardápio com a cor da sua marca e link só seu, sem comissão."],
      [<CreditCard key="b" className="h-5 w-5" />, "Pix automático", "O cliente paga e o pedido se confirma sozinho. O dinheiro cai na sua conta."],
      [<Gift key="c" className="h-5 w-5" />, "Cupons e cashback", "Primeira compra, frete grátis, desconto: você escolhe as regras."],
      [<Clock key="d" className="h-5 w-5" />, "Abre e fecha sozinha", "Horários, pausa rápida, pedido mínimo e taxa de embalagem."],
    ],
  },
  {
    titulo: "Operar",
    itens: [
      [<ChefHat key="a" className="h-5 w-5" />, "Tela da cozinha", "Pedido novo com som e aviso no celular, do preparo à entrega."],
      [<Printer key="b" className="h-5 w-5" />, "Impressão automática", "A comanda sai na impressora térmica assim que o pedido chega."],
      [<QrCode key="c" className="h-5 w-5" />, "Salão e QR Code", "Mesas, comandas, conta dividida, serviço e couvert."],
      [<Calculator key="d" className="h-5 w-5" />, "Caixa e balcão", "Venda no balcão, retiradas e fechamento conferido."],
      [<Users key="e" className="h-5 w-5" />, "Equipe por função", "Caixa, cozinha, garçom e entregador veem só a parte deles."],
      [<Smartphone key="f" className="h-5 w-5" />, "App no celular", "O painel vira app, com aviso de cada pedido novo."],
    ],
  },
  {
    titulo: "Trazer de volta",
    itens: [
      [<Sparkles key="a" className="h-5 w-5" />, "Ritmo e Pulso", "Quem está sumindo, o que costuma pedir e quanto está em jogo."],
      [<MessagesSquare key="b" className="h-5 w-5" />, "Atendimento com IA", "Responde dúvidas na hora e passa para a equipe quando precisa."],
      [<Bell key="c" className="h-5 w-5" />, "Pedido acompanhado", "O cliente vê cada etapa, fala com a loja e recebe aviso no celular."],
      [<Workflow key="d" className="h-5 w-5" />, "Automações", "Aniversário, cliente sumido, pós-venda: mensagens prontas para enviar."],
      [<Link2 key="e" className="h-5 w-5" />, "Links da bio e formulários", "Página de links para o Instagram e pesquisas de satisfação."],
      [<Map key="f" className="h-5 w-5" />, "Território", "Bairros por km, taxa por bairro e demanda fora da área."],
    ],
  },
];
const OPCIONAIS: [React.ReactNode, string, string][] = [
  [<BarChart3 key="a" className="h-5 w-5" />, "Relatórios e contador", "Vendas por período e planilha pronta para o contador."],
  [<FileText key="b" className="h-5 w-5" />, "Nota fiscal (NFC-e)", "Emissão pelo sistema, se a sua casa quiser."],
  [<MessageCircle key="c" className="h-5 w-5" />, "WhatsApp oficial", "Avisos do pedido no WhatsApp, pelo número da casa."],
  [<Palette key="d" className="h-5 w-5" />, "Sua cara", "Logo, capa e cor da marca na loja."],
];

function Recursos() {
  return (
    <section id="recursos" className="mx-auto max-w-[1240px] px-5 py-24 md:px-8">
      <p className="text-[15px] font-semibold text-brasa">Recursos</p>
      <h2 className="mt-2 max-w-[48rem] font-display text-[clamp(2rem,4.4vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.015em]">Tudo o que a sua casa precisa, num lugar só.</h2>
      <div className="mt-10 space-y-10">
        {GRUPOS.map((g) => (
          <div key={g.titulo}>
            <p className="font-display text-[22px] font-extrabold">{g.titulo}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.itens.map(([ic, t, d]) => (
                <div key={t} className="rounded-2xl border border-linha bg-forno p-5">
                  <span className="text-brasa">{ic}</span>
                  <p className="mt-2 font-display text-[19px] font-bold">{t}</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-areia">{d}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="rounded-3xl border border-dashed border-linha p-6">
          <p className="font-display text-[22px] font-extrabold">Opcionais</p>
          <p className="mt-1 text-[15px] text-areia">Vêm desligados. A casa liga só o que fizer sentido.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {OPCIONAIS.map(([ic, t, d]) => (
              <div key={t} className="rounded-2xl bg-grafite p-4">
                <span className="text-brasa">{ic}</span>
                <p className="mt-2 font-semibold">{t}</p>
                <p className="mt-1 text-[14px] text-areia">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ComoComecar() {
  const passos: [string, string][] = [
    ["Chame no WhatsApp", "Conte como funciona a sua casa. Mostramos o Freguês com o seu cardápio em 20 minutos."],
    ["A gente configura", "Cardápio, fotos, bairros e taxas de entrega, horários, Pix e a cor da sua marca."],
    ["Divulgue o seu link", "Coloque na bio, no Google e no WhatsApp. Os pedidos chegam na tela da cozinha."],
  ];
  return (
    <section className="bg-[#2B211D] text-[#FFF6EB]">
      <div className="mx-auto max-w-[1240px] px-5 py-20 md:px-8">
        <h2 className="font-display text-[clamp(2rem,4.4vw,3.4rem)] font-extrabold leading-[0.98]">Comece em 3 passos.</h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {passos.map(([t, d], i) => (
            <li key={t} className="rounded-3xl bg-[#34291f] p-6">
              <span className="font-display text-[40px] font-extrabold leading-none text-[#f45b26]">{i + 1}</span>
              <p className="mt-3 font-display text-[22px] font-extrabold">{t}</p>
              <p className="mt-2 text-[16px] text-[#dccdc0]">{d}</p>
            </li>
          ))}
        </ol>
        <a href={WHATS} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#f45b26] px-6 py-3.5 text-[16px] font-bold text-[#2B211D] transition hover:bg-[#f2a93b]">
          Começar pelo WhatsApp <ArrowUpRight className="h-5 w-5" />
        </a>
      </div>
    </section>
  );
}

// os mesmos planos e recursos cadastrados no Admin (aba Planos)
// os mesmos planos e recursos cadastrados no Admin (aba Planos)
const PLANOS: { nome: string; frase: string; itens: string[]; destaque?: boolean }[] = [
  { nome: "Essencial", frase: "Loja própria e CRM para começar.", itens: ["Loja e cardápio digital", "Mapa de atuação", "Fregueses e Pulso", "3 usuários"] },
  { nome: "Completo", frase: "Tudo para vender mais sem marketplace.", itens: ["Tudo do Essencial", "Atendimento com IA", "Automações", "Formulários e links da bio", "5 usuários"], destaque: true },
  { nome: "Rede", frase: "Para quem tem mais de uma loja.", itens: ["Tudo do Completo", "Até 5 lojas", "Usuários ilimitados", "Suporte prioritário"] },
];

function Planos() {
  return (
    <section id="planos" className="mx-auto max-w-[1240px] px-5 py-24 md:px-8">
      <p className="text-[15px] font-semibold text-brasa">Planos</p>
      <h2 className="mt-2 max-w-[44rem] font-display text-[clamp(2rem,4.4vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.015em]">Mensalidade fixa. Zero comissão por pedido.</h2>
      <p className="mt-4 max-w-[40rem] text-[18px] text-areia">Em todos os planos: loja própria, Pix, tela da cozinha, salão e caixa, sem comissão. Valores e condição de casa fundadora pelo WhatsApp, com teste grátis antes de pagar.</p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {PLANOS.map((p) => (
          <div key={p.nome} className={`flex flex-col rounded-3xl p-6 ${p.destaque ? "tema-escuro bg-carvao text-papel ring-2 ring-brasa" : "border border-linha bg-forno"}`}>
            {p.destaque && <span className="mb-2 w-fit rounded-full bg-brasa px-3 py-1 text-[12px] font-bold text-carvao">Mais escolhido</span>}
            <p className="font-display text-[28px] font-extrabold">{p.nome}</p>
            <p className="text-[15px] text-areia">{p.frase}</p>
            <ul className="mt-5 flex-1 space-y-2 text-[15px]">
              {p.itens.map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-manjericao" /> {t}
                </li>
              ))}
            </ul>
            <a href={wa(`Olá! Quero saber o valor do plano ${p.nome} do Freguês para a minha casa.`)} target="_blank" rel="noreferrer" className={`mt-6 flex items-center justify-center gap-2 rounded-full py-3.5 font-bold transition ${p.destaque ? "bg-brasa text-carvao hover:bg-mostarda" : "border-2 border-papel text-papel hover:bg-papel hover:text-carvao"}`}>
              Quero o {p.nome} <ArrowUpRight className="h-5 w-5" />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

const PERGUNTAS: [string, string][] = [
  ["O Freguês cobra comissão por pedido?", "Não. É uma mensalidade fixa. Tudo o que a sua loja vende é seu."],
  ["O meu cliente precisa baixar aplicativo?", "Não. Ele pede pelo link da sua loja, no navegador do celular, e acompanha o pedido pela mesma tela."],
  ["Como recebo o Pix?", "Direto na sua conta. Com o Pix automático, o pedido se confirma sozinho quando o cliente paga. Também dá para usar a sua chave Pix de sempre."],
  ["Funciona para mesa e balcão também?", "Sim. Salão com mesas e QR Code, balcão e delivery entram no mesmo caixa."],
  ["Preciso de nota fiscal?", "É opcional. Se a sua casa quiser emitir NFC-e pelo sistema, é só ligar. Se não, tudo funciona normalmente sem nota."],
  ["Quem configura tudo?", "A nossa equipe: cardápio, fotos, bairros e taxas, horários e Pix. Você recebe a loja pronta para divulgar."],
  ["Tem fidelidade ou multa?", "Fale com a gente no WhatsApp para ver as condições de casa fundadora."],
];

function Duvidas() {
  const [aberta, setAberta] = useState<number | null>(0);
  return (
    <section id="duvidas" className="mx-auto max-w-[900px] px-5 pb-24 md:px-8">
      <h2 className="font-display text-[clamp(2rem,4.4vw,3.2rem)] font-extrabold leading-[0.98] tracking-[-0.015em]">Dúvidas</h2>
      <div className="mt-8 divide-y divide-linha rounded-3xl border border-linha bg-forno">
        {PERGUNTAS.map(([q, r], i) => (
          <div key={q}>
            <button onClick={() => setAberta(aberta === i ? null : i)} aria-expanded={aberta === i} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[17px] font-semibold">
              {q}
              <ChevronDown className={`h-5 w-5 shrink-0 transition ${aberta === i ? "rotate-180" : ""}`} />
            </button>
            {aberta === i && <p className="px-5 pb-5 text-[16px] leading-relaxed text-areia">{r}</p>}
          </div>
        ))}
      </div>
      <a href={wa("Olá! Tenho uma dúvida sobre o Freguês.")} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 font-semibold text-brasa">
        Outra dúvida? Pergunte no WhatsApp <ArrowUpRight className="h-4 w-4" />
      </a>
    </section>
  );
}

export function Site() {
  return (
    <div className="tema-claro relative min-h-screen bg-carvao text-papel">
      <MarcaDagua />
      <div className="relative z-[1]">
      <Nav />
      <Hero />

      <section className="bg-[#2B211D] text-[#FFF6EB]">
        <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-16 md:grid-cols-3 md:px-8 md:py-20">
          {[
            ["Sua cozinha lembra do prato.", "O Freguês ajuda a lembrar de quem pede."],
            ["Cada cliente tem um ritmo.", "Perceba quem está sumindo e escolha como chamar."],
            ["Tem gente com fome do outro lado.", "Veja a demanda antes de abrir um novo bairro."],
          ].map(([a, b]) => (
            <div key={a}>
              <p className="font-display text-[clamp(1.5rem,2.6vw,2.1rem)] font-extrabold leading-tight">{a}</p>
              <p className="mt-2 text-[17px] text-[#dccdc0]">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <Video />

      <section id="como" className="mx-auto max-w-[1240px] px-5 md:px-8">
        <div className="max-w-[46rem] pt-24">
          <p className="text-[15px] font-semibold text-brasa">Como funciona</p>
          <h2 className="mt-2 font-display text-[clamp(2.2rem,5vw,4rem)] font-extrabold leading-[0.98] tracking-[-0.015em]">O pedido é o começo. A volta é o valor.</h2>
          <p className="mt-5 text-[19px] leading-relaxed text-areia">
            O Freguês conecta pedidos, relacionamento e atendimento num lugar só. Cada venda, seja no delivery, na mesa ou no balcão, vira histórico do cliente. E o histórico vira motivo para ele voltar.
          </p>
        </div>

        <Pilar
          n="Loja e pedidos"
          icone={<Store className="h-5 w-5" />}
          titulo="Sua loja, seu cliente, sem comissão."
          texto="Cardápio digital com a cor da sua marca e um link só seu. O cliente pede pelo link, pelo QR Code da mesa ou no balcão, paga no Pix e acompanha o pedido pela própria tela, sem baixar nada."
          pontos={["Cardápio com fotos, complementos e combos", "Pix com confirmação automática", "Cliente acompanha o pedido e fala com a loja pelo site", "Cupons e cashback para quem volta"]}
          visual={<MiniLoja />}
        />
        <Pilar
          n="Território"
          inverter
          icone={<Map className="h-5 w-5" />}
          titulo="Onde sua casa pode chegar."
          texto="Escolha no mapa os municípios e bairros do Rio de Janeiro que você atende e defina taxa, tempo e pedido mínimo por zona. O endereço do cliente é conferido no mapa."
          pontos={["Limites oficiais de bairros e municípios do RJ", "Taxa, tempo e pedido mínimo por zona", "Lista de quem tentou pedir de fora da área"]}
          visual={<MiniMapaRegras />}
        />
        <Pilar
          n="Ritmo e Pulso"
          icone={<Sparkles className="h-5 w-5" />}
          titulo="Saiba quem está sumindo antes que suma."
          texto="Cada cliente tem seu tempo. Quando alguém sai do próprio ritmo, o painel mostra quem é, o que costuma pedir e quanto está em jogo, em reais."
          pontos={["Estimativa em risco e pedidos recuperados", "“O de sempre” com o favorito separado", "Quem merece atenção hoje, em uma lista"]}
          visual={<MiniCRM />}
        />
        <Pilar
          n="Salão e caixa"
          inverter
          icone={<Bike className="h-5 w-5" />}
          titulo="Delivery, mesa e balcão no mesmo caixa."
          texto="Mapa de mesas, comanda com conta dividida, pedido pelo QR Code da mesa, comanda impressa na cozinha e um caixa que soma tudo e confere a gaveta no fechamento."
          pontos={["Mesas, comandas, serviço e couvert", "Cliente pede pelo QR Code da mesa", "Impressão automática da comanda na cozinha", "Abertura, retiradas e fechamento do caixa"]}
          visual={<MiniSalao />}
        />
        <p className="pb-6 text-[14px] text-fumo">Imagens ilustrativas com dados fictícios.</p>
      </section>

      <section id="pilares" className="bg-brasa text-carvao">
        <div className="mx-auto max-w-[1240px] px-5 py-20 md:px-8 md:py-24">
          <p className="text-[17px] font-semibold">Os cinco pilares</p>
          <h2 className="mt-2 max-w-[44rem] font-display text-[clamp(2rem,4.4vw,3.4rem)] font-extrabold leading-[1.02]">O diferencial cabe numa conversa.</h2>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {PILARES.map(([t, d, f], i) => (
              <div key={t} className="rounded-2xl bg-carvao/95 p-5 text-papel">
                <p className="tabular text-[13px] font-semibold text-brasa">0{i + 1}</p>
                <p className="mt-1 font-display text-[22px] font-extrabold">{t}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-areia">{d}</p>
                <p className="mt-3 text-[14px] font-semibold">“{f}”</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-24 md:px-8">
        <h2 className="font-display text-[clamp(2rem,4.4vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.015em]">Do boteco à pizzaria.</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Hamburgueria", "Combos, smash e “o de sempre” de sexta à noite.", "xbacon"],
            ["Pizzaria", "Meio a meio, borda de presente, sexta e sábado no foco.", "pizza"],
            ["Bar e boteco", "Mesas, comanda e o cliente da sexta-feira.", "chopp"],
            ["Restaurante", "Executivo no almoço, marmita no dia útil.", "prato"],
            ["Japonês", "Combinados, rodízio e datas especiais.", "sushi"],
            ["Açaí e café", "Dias quentes, manhãs e lanche da tarde.", "acai"],
          ].map(([t, d, k]) => (
            <article key={t} className="group relative aspect-[4/3] overflow-hidden rounded-3xl">
              <Foto chave={k} alt={t} className="absolute inset-0 h-full w-full transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-[#FFF6EB]">
                <p className="font-display text-[26px] font-extrabold leading-tight">{t}</p>
                <p className="mt-1 max-w-[22rem] text-[15px] leading-relaxed opacity-90">{d}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Recursos />
      <ComoComecar />
      <Planos />

      <section id="fundador" className="mx-auto max-w-[1240px] px-5 py-24 md:px-8">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="font-display text-[clamp(2.2rem,5vw,4.2rem)] font-extrabold leading-[0.98] tracking-[-0.015em]">Seja uma casa fundadora.</h2>
            <p className="mt-5 max-w-[34rem] text-[19px] leading-relaxed text-areia">
              Estamos abrindo as primeiras vagas no Rio de Janeiro. Quem entra agora usa antes, paga preço de fundador e ajuda a decidir os próximos recursos.
            </p>
            <ul className="mt-8 space-y-3 text-[17px]">
              {["Preço de fundador garantido enquanto for cliente", "Implantação feita pela nossa equipe", "Cardápio e áreas de entrega configurados para você", "Canal direto para pedir recursos"].map((t) => (
                <li key={t} className="flex gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-brasa" /> {t}
                </li>
              ))}
            </ul>
            <blockquote className="mt-10 border-l-4 border-brasa pl-5 text-[17px] leading-relaxed">
              “Eu vejo o quanto cada casa se dedica para fazer um bom pedido sair. O Freguês nasce para ajudar a cuidar também do que acontece depois: lembrar de quem comprou, perceber quando a pessoa sai do ritmo e facilitar a próxima escolha. Porque uma venda pode começar uma relação.”
              <footer className="mt-3 text-[15px] font-semibold text-areia">Renan Mattos / Freguês</footer>
            </blockquote>
          </div>
          <div className="tema-escuro self-start rounded-3xl bg-carvao p-8 text-papel">
            <p className="font-display text-[26px] font-extrabold leading-tight">Veja o Freguês na sua casa</p>
            <p className="mt-2 text-[16px] text-areia">Mostramos o sistema com o cardápio e os bairros da sua casa em 20 minutos.</p>
            <a href={WHATS} target="_blank" rel="noreferrer" className="mt-6 flex items-center justify-center gap-2 rounded-full bg-brasa py-4 text-[17px] font-bold text-carvao transition hover:bg-mostarda">
              Chamar no WhatsApp <ArrowUpRight className="h-5 w-5" />
            </a>
            <p className="tabular mt-6 flex items-center gap-2 text-[18px] font-semibold">
              <MessageCircle className="h-5 w-5 text-brasa" /> (21) 96764-0607
            </p>
          </div>
        </div>
      </section>

      <Duvidas />

      <a href={WHATS} target="_blank" rel="noreferrer" aria-label="Falar no WhatsApp" className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#25d366] px-5 py-3.5 font-bold text-[#0b2e17] shadow-2xl transition hover:brightness-95">
        <MessageCircle className="h-5 w-5" /> <span className="hidden sm:inline">Falar no WhatsApp</span>
      </a>

      <footer className="border-t border-linha">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-8 text-[14px] text-fumo md:flex-row md:items-center md:justify-between md:px-8">
          <Logo tamanho="sm" />
          <p>
            Uma solução MMATTOS ·{" "}
            <a href={WHATS} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
              WhatsApp (21) 96764-0607
            </a>{" "}
            · Imagens do sistema são ilustrativas, com dados fictícios.
          </p>
        </div>
      </footer>
      </div>
    </div>
  );
}
