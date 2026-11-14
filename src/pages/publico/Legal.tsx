import { useEffect, useState } from "react";
import { supabase } from "../../data/dados";

/** Versão vigente dos termos. Mudou o texto? Mude a data: os donos aceitam de novo no próximo acesso. */
export const VERSAO_TERMOS = "2026-11-14";

function useEmpresa() {
  const [e, setE] = useState({ empresa: "MMATTOS Assessoria de MKT", whatsapp: "21967640607" });
  useEffect(() => {
    supabase?.rpc("config_publica").then(({ data }) => {
      const c = (data as { empresa: string; whatsapp: string }[] | null)?.[0];
      if (c?.empresa) setE({ empresa: c.empresa, whatsapp: c.whatsapp || e.whatsapp });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return e;
}

const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-7 font-display text-[20px] font-bold">{children}</h2>;
const P = ({ children }: { children: React.ReactNode }) => <p className="mt-2 leading-relaxed">{children}</p>;

function Moldura({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fffaf2] px-5 py-10 text-[#2a1d14]">
      <article className="mx-auto max-w-[720px] text-[15px]">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#c2410c]">Freguês</p>
        <h1 className="mt-1 font-display text-[34px] font-extrabold leading-tight">{titulo}</h1>
        <p className="mt-1 text-[13px] text-[#6b5546]">Versão de {new Date(VERSAO_TERMOS + "T12:00").toLocaleDateString("pt-BR")}</p>
        {children}
        <p className="mt-10 border-t border-[#eadccb] pt-4 text-[13px] text-[#6b5546]">
          <a href="#termos" className="underline">Termos de uso</a> · <a href="#privacidade" className="underline">Política de privacidade</a>
        </p>
      </article>
    </div>
  );
}

export function Termos() {
  const e = useEmpresa();
  return (
    <Moldura titulo="Termos de uso">
      <P>Estes termos valem para o restaurante (o "Cliente") que contrata o Freguês, sistema oferecido por {e.empresa} (o "Freguês"). Ao entrar no painel e aceitar, o Cliente concorda com eles.</P>
      <H>1. O que o Freguês oferece</H>
      <P>Loja online própria, cardápio, pedidos, caixa, salão, mapa de entrega, cadastro de fregueses, automações, formulários e página de links, conforme o plano contratado. Funções podem ser melhoradas, trocadas ou retiradas com aviso.</P>
      <H>2. Conta e acesso</H>
      <P>O acesso é pessoal. O Cliente cuida do seu e-mail e da sua senha e responde pelo que for feito com eles, inclusive pela equipe que ele mesmo convidar.</P>
      <H>3. Pagamentos dos clientes do restaurante</H>
      <P>O Pix da loja usa a chave do próprio Cliente: o dinheiro cai direto na conta dele, e é ele quem confere e confirma o pagamento. O Freguês não recebe, não guarda e não responde por esses valores, nem por pagamentos em cartão ou dinheiro feitos na entrega.</P>
      <H>4. Mensalidade</H>
      <P>O Cliente paga a mensalidade do plano escolhido, na data combinada. Com atraso, o acesso pode ser limitado e a loja pode sair do ar até a regularização. O cancelamento pode ser pedido a qualquer momento e vale a partir do próximo ciclo.</P>
      <H>5. Responsabilidades do restaurante</H>
      <P>O Cliente responde pelo cardápio, preços, entregas, nota fiscal, qualidade dos produtos e atendimento aos seus clientes, e por usar os dados dos seus fregueses de acordo com a lei, só para atender e se comunicar com eles.</P>
      <H>6. Disponibilidade</H>
      <P>O Freguês trabalha para o sistema ficar no ar o tempo todo, mas pode haver paradas para manutenção ou por falhas de terceiros (internet, servidores, bancos). Nesses casos não há multa, e o Freguês atua para resolver o quanto antes.</P>
      <H>7. Dados e privacidade</H>
      <P>Os dados dos fregueses pertencem ao Cliente. O Freguês trata esses dados só para fazer o sistema funcionar, como descrito na <a href="#privacidade" className="underline">Política de privacidade</a>. Ao encerrar a conta, o Cliente pode exportar seus dados antes da exclusão.</P>
      <H>8. Mudanças nestes termos</H>
      <P>Quando os termos mudarem, o Cliente verá a nova versão no painel e precisará aceitar para continuar.</P>
      <H>9. Contato</H>
      <P>
        Dúvidas: WhatsApp{" "}
        <a href={`https://wa.me/55${e.whatsapp.replace(/\D/g, "")}`} className="underline">
          {e.whatsapp}
        </a>
        . Fica eleito o foro da comarca do Rio de Janeiro/RJ.
      </P>
    </Moldura>
  );
}

export function Privacidade() {
  const e = useEmpresa();
  return (
    <Moldura titulo="Política de privacidade">
      <P>Esta política explica como os dados são tratados no Freguês, sistema de {e.empresa} usado pelos restaurantes para vender online. Ela segue a Lei Geral de Proteção de Dados (Lei 13.709/2018).</P>
      <H>Quem é quem</H>
      <P>Quando você pede em um restaurante, ele é o <b>controlador</b> dos seus dados: decide como usá-los para atender você. O Freguês é o <b>operador</b>: guarda e processa esses dados em nome do restaurante, só para o sistema funcionar.</P>
      <H>Que dados são coletados</H>
      <P>Nome, WhatsApp, endereço de entrega e o ponto no mapa, itens pedidos, forma de pagamento, valores, data e hora dos pedidos e respostas de pesquisas. Não guardamos dados de cartão nem senhas de banco.</P>
      <H>Para que são usados</H>
      <P>Para receber, preparar e entregar o pedido; calcular a taxa de entrega; manter o histórico e o cashback; e, só se você marcar que aceita, receber novidades e cupons do restaurante pelo WhatsApp.</P>
      <H>Com quem são compartilhados</H>
      <P>Com o restaurante em que você pediu e com serviços que mantêm o sistema no ar (hospedagem e banco de dados). Não vendemos dados.</P>
      <H>Por quanto tempo</H>
      <P>Enquanto o restaurante usar o Freguês, ou até você pedir a exclusão, salvo o que a lei obrigar a guardar.</P>
      <H>Seus direitos</H>
      <P>Você pode pedir para ver, corrigir ou apagar seus dados e para parar de receber mensagens. Fale com o restaurante ou com o Freguês pelo WhatsApp {e.whatsapp}.</P>
      <H>Segurança</H>
      <P>O acesso aos dados é separado por restaurante, protegido por senha e por regras no banco de dados, e a conexão é sempre criptografada.</P>
    </Moldura>
  );
}

/** Aceite dos termos pelo dono, no primeiro acesso (e quando a versão muda). */
export function AceiteTermos({ aceitar }: { aceitar: () => Promise<string | null> }) {
  const [ok, setOk] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  return (
    <div className="grid min-h-screen place-items-center bg-carvao p-4">
      <div className="w-full max-w-[460px] rounded-3xl border border-linha bg-forno p-6">
        <h1 className="font-display text-[26px] font-extrabold leading-tight">Antes de começar</h1>
        <p className="mt-2 text-[15px] text-areia">Leia e aceite os termos de uso e a política de privacidade do Freguês.</p>
        <div className="mt-4 flex flex-col gap-2 text-[15px]">
          <a href="#termos" target="_blank" rel="noreferrer" className="rounded-xl border border-linha px-4 py-3 font-semibold hover:border-areia">
            Termos de uso ↗
          </a>
          <a href="#privacidade" target="_blank" rel="noreferrer" className="rounded-xl border border-linha px-4 py-3 font-semibold hover:border-areia">
            Política de privacidade ↗
          </a>
        </div>
        <label className="mt-4 flex items-start gap-3 text-[15px]">
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[#ff5b1f]" />
          Li e aceito os termos de uso e a política de privacidade.
        </label>
        {erro && <p className="mt-3 text-[14px] text-[#e8846f]">{erro}</p>}
        <button
          disabled={!ok || enviando}
          onClick={async () => {
            setEnviando(true);
            const r = await aceitar();
            setEnviando(false);
            if (r) setErro(r);
          }}
          className="mt-5 w-full rounded-xl bg-brasa py-3.5 text-[17px] font-bold text-carvao hover:bg-mostarda disabled:opacity-50"
        >
          {enviando ? "Salvando…" : "Aceitar e entrar"}
        </button>
      </div>
    </div>
  );
}
