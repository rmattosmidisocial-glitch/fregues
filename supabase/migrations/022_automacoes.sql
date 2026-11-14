-- 022: Automações reais — regras ligadas pelo dono, fila diária de quem deve receber cada mensagem,
-- registro do envio e medição de quem voltou a pedir. (O envio é com 1 toque no WhatsApp; o 100% automático
-- depende da API oficial do WhatsApp e entra depois.)

create table if not exists public.automacoes (
  store_id uuid not null references public.stores(id) on delete cascade,
  tipo text not null check (tipo in ('sumindo', 'aniversario', 'pos_entrega', 'primeiro_pedido')),
  ligada boolean not null default false,
  texto text not null,
  dias int,                       -- aniversário: quantos dias antes
  updated_at timestamptz not null default now(),
  primary key (store_id, tipo)
);

create table if not exists public.automacao_envios (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  tipo text not null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  ref text,                       -- pedido (pós-entrega / primeiro pedido) ou ano (aniversário)
  enviado_em timestamptz not null default now(),
  pulou boolean not null default false
);
create index if not exists automacao_envios_idx on public.automacao_envios (store_id, tipo, customer_id, enviado_em desc);

alter table public.automacoes enable row level security;
alter table public.automacao_envios enable row level security;
drop policy if exists auto_membro on public.automacoes;
create policy auto_membro on public.automacoes for all to authenticated
  using (public.is_member(public.store_org(store_id))) with check (public.is_member(public.store_org(store_id)));
drop policy if exists auto_env_membro on public.automacao_envios;
create policy auto_env_membro on public.automacao_envios for all to authenticated
  using (public.is_member(public.store_org(store_id))) with check (public.is_member(public.store_org(store_id)));

-- Fila de hoje: quem deve receber cada mensagem ligada e ainda não recebeu.
create or replace function public.automacao_fila(p_store uuid)
returns table (tipo text, customer_id uuid, nome text, telefone text, favorito text, ref text, detalhe text, aceita_marketing boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_org uuid := public.store_org(p_store);
  v_dias int;
begin
  if v_org is null or not public.is_member(v_org) then raise exception 'Sem acesso'; end if;
  select coalesce(a.dias, 3) into v_dias from automacoes a where a.store_id = p_store and a.tipo = 'aniversario';

  -- Sumindo: passou do dobro do intervalo, aceita promoções, sem mensagem desta regra nos últimos 30 dias
  if exists (select 1 from automacoes a where a.store_id = p_store and a.tipo = 'sumindo' and a.ligada) then
    return query
    select 'sumindo'::text, p.id, p.nome, p.telefone, p.favorito, null::text,
           'Sem pedir há ' || p.dias_desde || ' dias (costuma a cada ' || p.intervalo || ')', p.aceita_marketing
    from customer_pulse p
    where p.org_id = v_org and p.status = 'sumindo' and p.aceita_marketing
      and not exists (select 1 from automacao_envios e where e.store_id = p_store and e.tipo = 'sumindo'
                      and e.customer_id = p.id and e.enviado_em > now() - interval '30 days')
    order by p.gasto desc
    limit 50;
  end if;

  -- Aniversário: nos próximos N dias, uma vez por ano
  if exists (select 1 from automacoes a where a.store_id = p_store and a.tipo = 'aniversario' and a.ligada) then
    return query
    select 'aniversario'::text, c.id, c.nome, c.telefone, null::text, extract(year from now())::text,
           'Aniversário ' || to_char(c.aniversario, 'DD/MM'), c.aceita_marketing
    from customers c
    where c.org_id = v_org and c.aniversario is not null and c.aceita_marketing
      and ((make_date(extract(year from now())::int, extract(month from c.aniversario)::int,
            least(extract(day from c.aniversario)::int, 28)) - current_date) between 0 and coalesce(v_dias, 3))
      and not exists (select 1 from automacao_envios e where e.store_id = p_store and e.tipo = 'aniversario'
                      and e.customer_id = c.id and e.ref = extract(year from now())::text);
  end if;

  -- Pós-entrega: pedido entregue há mais de 1h e menos de 2 dias (mensagem de serviço, não precisa de opt-in)
  if exists (select 1 from automacoes a where a.store_id = p_store and a.tipo = 'pos_entrega' and a.ligada) then
    return query
    select distinct on (o.customer_id) 'pos_entrega'::text, c.id, c.nome, c.telefone,
           (select i.nome from order_items i where i.order_id = o.id order by i.qtd desc limit 1), o.id::text,
           'Pedido #' || o.numero || ' entregue', c.aceita_marketing
    from orders o join customers c on c.id = o.customer_id
    where o.store_id = p_store and o.status = 'entregue'
      and coalesce(o.updated_at, o.created_at) between now() - interval '2 days' and now() - interval '1 hour'
      and not exists (select 1 from automacao_envios e where e.store_id = p_store and e.tipo = 'pos_entrega' and e.ref = o.id::text)
    order by o.customer_id, o.created_at desc;
  end if;

  -- Primeiro pedido: cliente com exatamente 1 pedido, feito nos últimos 3 dias
  if exists (select 1 from automacoes a where a.store_id = p_store and a.tipo = 'primeiro_pedido' and a.ligada) then
    return query
    select 'primeiro_pedido'::text, p.id, p.nome, p.telefone, p.favorito, null::text, 'Primeiro pedido na casa', p.aceita_marketing
    from customer_pulse p
    where p.org_id = v_org and p.pedidos = 1 and p.ultimo > now() - interval '3 days'
      and not exists (select 1 from automacao_envios e where e.store_id = p_store and e.tipo = 'primeiro_pedido' and e.customer_id = p.id);
  end if;
end $$;

-- Resultado de cada regra nos últimos 30 dias: enviadas, quantos pediram em até 7 dias depois, quanto venderam.
create or replace function public.automacao_resumo(p_store uuid)
returns table (tipo text, enviadas bigint, voltaram bigint, receita numeric)
language sql stable security definer set search_path = public as $$
  with env as (
    select e.* from automacao_envios e
    where e.store_id = p_store and not e.pulou and e.enviado_em > now() - interval '30 days'
      and public.is_member(public.store_org(p_store))
  ), volta as (
    select env.id, env.tipo,
           (select sum(o.total) from orders o where o.store_id = p_store and o.customer_id = env.customer_id
              and o.status <> 'cancelado' and o.created_at > env.enviado_em and o.created_at < env.enviado_em + interval '7 days') as total
    from env
  )
  select tipo, count(*), count(total), coalesce(sum(total), 0) from volta group by tipo;
$$;

revoke all on function public.automacao_fila(uuid) from public, anon;
revoke all on function public.automacao_resumo(uuid) from public, anon;
grant execute on function public.automacao_fila(uuid) to authenticated;
grant execute on function public.automacao_resumo(uuid) to authenticated;
