-- 064: preço de entrada no primeiro mês e planos novos (Completo e Rede; Essencial sai para novos clientes).

alter table public.plans add column if not exists preco_primeiro_mes numeric(10,2) check (preco_primeiro_mes is null or preco_primeiro_mes >= 0);

create or replace function public.admin_plano_primeiro_mes(p_id text, p_valor numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  if p_valor is not null and p_valor < 0 then raise exception 'Valor inválido'; end if;
  update public.plans set preco_primeiro_mes = round(p_valor, 2) where id = p_id;
end $$;
revoke all on function public.admin_plano_primeiro_mes(text, numeric) from public, anon;
grant execute on function public.admin_plano_primeiro_mes(text, numeric) to authenticated;

-- primeira fatura do cliente sai com o preço de entrada do plano (se houver)
create or replace function public.admin_gerar_fatura(p_org uuid, p_competencia date default date_trunc('month', current_date)::date)
returns uuid language plpgsql security definer set search_path = public as $$
declare s public.subscriptions; v_id uuid; v_valor numeric; v_entrada numeric;
begin
  perform public.exigir_admin();
  select * into s from public.subscriptions where org_id = p_org;
  if s.org_id is null then raise exception 'Cliente sem assinatura'; end if;
  v_valor := s.valor;
  if not exists (select 1 from public.invoices where org_id = p_org) then
    select preco_primeiro_mes into v_entrada from public.plans where id = s.plan_id;
    if v_entrada is not null then v_valor := v_entrada; end if;
  end if;
  insert into public.invoices (org_id, competencia, vencimento, valor)
  values (p_org, p_competencia, make_date(extract(year from p_competencia)::int, extract(month from p_competencia)::int, s.dia_vencimento), v_valor)
  on conflict (org_id, competencia) do nothing returning id into v_id;
  return v_id;
end $$;

-- planos novos
update public.plans set ativo = false where id = 'essencial';
update public.plans set nome = 'Completo', preco = 189, preco_primeiro_mes = 60, usuarios = 4, lojas = 1, ordem = 1,
  descricao = 'Tudo para vender mais sem marketplace.',
  recursos = '["Loja própria e cardápio digital","Pix automático, cupons e cashback","Pedidos, salão, caixa e balcão","Ficha técnica, CMV, estoque e prejuízos","Fregueses, Pulso e automações","Atendimento com IA","Até 4 usuários"]'::jsonb
  where id = 'completo';
update public.plans set preco = 599, ordem = 2,
  descricao = 'Para quem tem mais de uma loja.',
  recursos = '["Tudo do Completo","Até 5 lojas","Usuários ilimitados","Suporte prioritário"]'::jsonb
  where id = 'rede';
