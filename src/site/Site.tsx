import { useMemo } from "react";
import { ArrowUpRight, Bike, Map, MessageCircle, Sparkles, Store, Check } from "lucide-react";
import { Logo } from "../components/Logo";
import { BotaoTema } from "../tema";
import { Comanda } from "../components/Comanda";
import { GeoMap, BAIRROS, nomeBairro, vizinhos, type Layer } from "../components/GeoMap";
import { Foto } from "../components/Foto";
import { LOJA, ZONAS, CARDAPIO, brl, chamarHoje } from "../data/mock";

const WHATS = "https://wa.me/5521967640607?text=Quero%20saber%20mais%20sobre%20o%20Fregu%C3%AAs";

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
        <a href="#como" className="hover:text-papel">Como funciona</a>
        <a href="#pilares" className="hover:text-papel">O que muda na sua casa</a>
        <a href="#fundador" className="hover:text-papel">Fundadores</a>
      </nav>
      <span className="flex items-center gap-2">
        <BotaoTema />
        <a href={WHATS} target="_blank" rel="noreferrer" className="rounded-full bg-papel px-4 py-2 text-[14px] font-semibold text-carvao transition hover:bg-brasa">
          Falar com a gente
        </a>
      </span>
    </header>
  );
}

function Hero() {
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
            Quem compra hoje pode voltar amanhã. Conheça o ritmo de cada cliente, facilite o próximo pedido e enxergue oportunidades para sua casa crescer.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href={WHATS} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full bg-brasa px-6 py-3.5 text-[16px] font-bold text-carvao transition hover:bg-mostarda">
              Veja o Freguês na sua casa <ArrowUpRight className="h-5 w-5" />
            </a>
            <a href="#como" className="rounded-full border border-linha px-6 py-3.5 text-[16px] font-semibold text-papel transition hover:border-areia">
              Como funciona
            </a>
          </div>
          <p className="mt-5 text-[14px] text-fumo">Para restaurantes, hamburguerias, pizzarias, bares e muito mais.</p>
        </div>
        <div className="relative h-[460px] md:h-[600px]" aria-hidden="true">
          <div className="absolute inset-y-0 left-6 right-0 overflow-hidden rounded-[36px] md:left-16">
            <Foto chave="smashbacon" eager alt="" className="h-full w-full scale-[1.02]" />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/50 via-transparent to-transparent" />
          </div>
          <div className="comanda-sai absolute -bottom-6 left-0 md:-bottom-4 md:-left-6">
            <Comanda />
          </div>
          <div className="absolute right-0 top-4 w-[230px] rounded-2xl border border-linha bg-forno/95 p-4 text-[13px] shadow-2xl backdrop-blur md:right-2 md:top-10">
            <div className="flex items-center gap-2">
              <span className="pulso h-2.5 w-2.5 rounded-full bg-tomate" />
              <span className="text-areia">Saiu do ritmo há 34 dias</span>
            </div>
            <p className="mt-1.5 font-display text-[18px] font-bold leading-tight">Carlos</p>
            <p className="text-areia">Pedia X-Bacon Duplo a cada 9 dias</p>
            <span className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-brasa py-2 font-semibold text-carvao">
              <MessageCircle className="h-4 w-4" /> Revisar mensagem
            </span>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1240px] px-5 md:px-8">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-linha pt-5 text-[15px] text-areia">
          {["Sem comissão por pedido", "Loja própria com cardápio digital", "Entrega por bairro em todo o RJ", "Delivery, salão e balcão juntos", "Sem app para o cliente"].map((t) => (
            <span key={t} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-brasa" /> {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function MiniLoja() {
  const itens = CARDAPIO.filter((p) => ["p1", "p4", "p11"].includes(p.id));
  return (
    <div className="mx-auto w-[290px] rounded-[38px] border-[10px] border-[#0c0907] bg-[#FFF6EB] p-3 text-[#2B211D] shadow-[0_30px_80px_rgba(0,0,0,.5)]">
      <div className="rounded-2xl bg-[#B73D14] p-4 text-white">
        <p className="font-display text-[22px] font-extrabold leading-none">Brasa Burger</p>
        <p className="mt-1 text-[12px]">Aberto · entrega em 25–35 min</p>
      </div>
      <div className="mt-3 space-y-2">
        {itens.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl bg-white p-2">
            <Foto nome={p.nome} arte={p.arte} className="h-14 w-14 shrink-0 rounded-lg" />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-[#2B211D]">{p.nome}</p>
              <p className="text-[13px] font-semibold text-[#B73D14]">{brl(p.preco)}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-[#2B211D] px-4 py-3 text-center text-[14px] font-semibold text-white">Ver sacola · {brl(84.6)}</div>
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

export function Site() {
  return (
    <div className="tema-claro min-h-screen bg-carvao text-papel">
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
          texto="Cardápio digital com a cara da casa. O cliente pede pelo link, pelo QR Code da mesa ou no balcão, e o pedido aparece na hora na tela da cozinha."
          pontos={["Cardápio com fotos, complementos e combos", "Pedido pelo link, pela mesa ou no balcão", "Tela de pedidos para a cozinha", "Cashback para quem volta"]}
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
          texto="Mapa de mesas, comanda com conta dividida, pedido pelo QR Code da mesa e um caixa que soma tudo e confere a gaveta no fechamento."
          pontos={["Mesas, comandas e conta dividida", "Cliente pede pelo QR Code da mesa", "Abertura, retiradas e fechamento do caixa"]}
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

      <section className="border-y border-linha bg-forno">
        <div className="mx-auto grid max-w-[1240px] gap-6 px-5 py-14 md:grid-cols-[1fr_1.4fr] md:px-8">
          <div>
            <p className="font-display text-[24px] font-extrabold">Em desenvolvimento</p>
            <p className="mt-1 text-[15px] text-areia">Com transparência: o que ainda está chegando para as casas fundadoras.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["WhatsApp oficial", "Pix com confirmação automática", "Atendimento com IA", "Automações de mensagens", "Nota fiscal (NFC-e)", "Impressão na cozinha"].map((t) => (
              <span key={t} className="rounded-full border border-linha px-4 py-2 text-[14px] font-semibold">
                {t} <span className="text-fumo">· em breve</span>
              </span>
            ))}
          </div>
        </div>
      </section>

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
            <div className="mt-6 space-y-1 text-[16px]">
              <p className="tabular font-semibold">(21) 96764-0607</p>
              <p className="tabular font-semibold">(21) 99496-9943</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-linha">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-8 text-[14px] text-fumo md:flex-row md:items-center md:justify-between md:px-8">
          <Logo tamanho="sm" />
          <p>Uma solução MMATTOS · Imagens do sistema são ilustrativas, com dados fictícios.</p>
        </div>
      </footer>
    </div>
  );
}
