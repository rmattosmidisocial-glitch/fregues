-- 026: loja de demonstração fora do financeiro do Admin (continua no ar para mostrar a quem vai comprar).

alter table public.organizations add column if not exists demo boolean not null default false;
update public.organizations set demo = true where id in (select org_id from public.stores where slug = 'brasa-burger');

create or replace function public.org_real(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select not coalesce((select demo from public.organizations where id = p_org), false);
$$;

create or replace function public.admin_visao_geral() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  perform public.exigir_admin();
  select jsonb_build_object(
    'mrr', coalesce((select sum(valor) from public.subscriptions where status in ('ativa','atrasada') and public.org_real(org_id)), 0),
    'clientes_ativos', (select count(*) from public.subscriptions where status = 'ativa' and public.org_real(org_id)),
    'em_teste', (select count(*) from public.subscriptions where status = 'teste' and public.org_real(org_id)),
    'atrasados', (select count(*) from public.subscriptions where status = 'atrasada' and public.org_real(org_id)),
    'suspensos', (select count(*) from public.subscriptions where status = 'suspensa' and public.org_real(org_id)),
    'cancelados_30d', (select count(*) from public.subscriptions where status = 'cancelada' and atualizado_em > now() - interval '30 days' and public.org_real(org_id)),
    'a_receber', coalesce((select sum(valor) from public.invoices where status in ('aberta','atrasada') and public.org_real(org_id)), 0),
    'recebido_mes', coalesce((select sum(valor) from public.invoices where status = 'paga' and pago_em >= date_trunc('month', now()) and public.org_real(org_id)), 0),
    'pedidos_30d', (select count(*) from public.orders o join public.stores s on s.id = o.store_id where o.created_at > now() - interval '30 days' and o.status <> 'cancelado' and public.org_real(s.org_id)),
    'vendas_30d', coalesce((select sum(o.total) from public.orders o join public.stores s on s.id = o.store_id where o.created_at > now() - interval '30 days' and o.status <> 'cancelado' and public.org_real(s.org_id)), 0),
    'fregueses', (select count(*) from public.customers where public.org_real(org_id))
  ) into r;
  return r;
end $$;

create or replace function public.admin_faturas(p_org uuid default null)
returns setof public.invoices language plpgsql stable security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  return query select * from public.invoices
   where (p_org is not null and org_id = p_org) or (p_org is null and public.org_real(org_id))
   order by vencimento desc limit 500;
end $$;

drop function if exists public.admin_clientes();
create function public.admin_clientes()
returns table (
  org_id uuid, empresa text, loja text, slug text, bairro text, publicada boolean,
  plano text, status text, valor numeric, proximo_vencimento date, teste_ate date,
  responsavel text, telefone text, email text, observacao text, criado_em timestamptz,
  pedidos_30d bigint, vendas_30d numeric, fregueses bigint, ultimo_pedido timestamptz, usuarios bigint, convites_pendentes bigint,
  demo boolean
) language plpgsql stable security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  return query
  select o.id, o.nome, s.nome, s.slug, s.bairro, s.publicada,
         sub.plan_id, coalesce(sub.status, 'teste'), sub.valor, sub.proximo_vencimento, sub.teste_ate,
         sub.responsavel, sub.telefone, sub.email, sub.observacao, o.created_at,
         (select count(*) from public.orders x where x.store_id = s.id and x.created_at > now() - interval '30 days' and x.status <> 'cancelado'),
         coalesce((select sum(x.total) from public.orders x where x.store_id = s.id and x.created_at > now() - interval '30 days' and x.status <> 'cancelado'), 0),
         (select count(*) from public.customers c where c.org_id = o.id),
         (select max(x.created_at) from public.orders x where x.store_id = s.id),
         (select count(*) from public.memberships m where m.org_id = o.id),
         (select count(*) from public.invites i where i.org_id = o.id and i.aceito_em is null),
         o.demo
  from public.organizations o
  left join lateral (select * from public.stores st where st.org_id = o.id order by st.created_at limit 1) s on true
  left join public.subscriptions sub on sub.org_id = o.id
  order by o.demo, o.created_at desc;
end $$;
revoke all on function public.admin_clientes() from public, anon;
grant execute on function public.admin_clientes() to authenticated;

-- A rotina de cobrança nunca suspende nem tira do ar a loja de demonstração
create or replace function public.rotina_cobranca() returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.invoices set status = 'atrasada' where status = 'aberta' and vencimento < current_date - 3 and public.org_real(org_id);
  update public.subscriptions s set status = 'atrasada', atualizado_em = now()
   where status = 'ativa' and public.org_real(s.org_id) and exists (select 1 from public.invoices i where i.org_id = s.org_id and i.status = 'atrasada');
  update public.subscriptions s set status = 'suspensa', atualizado_em = now()
   where status = 'atrasada' and public.org_real(s.org_id) and exists (select 1 from public.invoices i where i.org_id = s.org_id and i.status = 'atrasada' and i.vencimento < current_date - 15);
  update public.stores st set publicada = false where public.org_real(st.org_id) and exists (select 1 from public.subscriptions s where s.org_id = st.org_id and s.status in ('suspensa','cancelada'));
  update public.subscriptions set status = 'atrasada', atualizado_em = now() where status = 'teste' and teste_ate < current_date and public.org_real(org_id);
end $$;
