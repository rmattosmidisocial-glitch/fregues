-- Pedidos de verdade: entregadores da casa, horários de cada etapa (tempo real de preparo),
-- marcar como pago (entra no caixa) e cancelar com motivo.

create table if not exists public.couriers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  nome text not null,
  telefone text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists couriers_store_idx on public.couriers(store_id);
alter table public.couriers enable row level security;
drop policy if exists entregador_membro on public.couriers;
create policy entregador_membro on public.couriers for all to authenticated
  using (public.is_member(public.store_org(store_id))) with check (public.is_member(public.store_org(store_id)));
grant select, insert, update, delete on public.couriers to authenticated;

alter table public.orders add column if not exists aceito_em timestamptz;
alter table public.orders add column if not exists pronto_em timestamptz;
alter table public.orders add column if not exists saiu_em timestamptz;
alter table public.orders add column if not exists entregue_em timestamptz;
alter table public.orders add column if not exists cancelado_motivo text;

-- grava a hora de cada etapa quando o status muda
create or replace function public._pedido_etapas() returns trigger
language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'preparo' and new.aceito_em is null then new.aceito_em := now(); end if;
    if new.status = 'pronto' and new.pronto_em is null then new.pronto_em := now(); end if;
    if new.status = 'rota' and new.saiu_em is null then new.saiu_em := now(); end if;
    if new.status = 'entregue' and new.entregue_em is null then new.entregue_em := now(); end if;
  end if;
  return new;
end $$;
drop trigger if exists orders_etapas on public.orders;
create trigger orders_etapas before update of status on public.orders for each row execute function public._pedido_etapas();

-- tempo médio de preparo de hoje (da chegada até ficar pronto), em minutos
create or replace function public.pedidos_tempo_medio(p_store uuid) returns int
language sql stable security definer set search_path = public as $$
  select case when public.is_member(public.store_org(p_store)) then
    (select round(avg(extract(epoch from pronto_em - created_at) / 60))::int from public.orders
      where store_id = p_store and pronto_em is not null
        and (created_at at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date)
  end;
$$;

-- recebeu o pagamento (na entrega, no balcão): marca pago e entra no caixa aberto
create or replace function public.pedido_pagar(p_pedido uuid, p_forma text) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_pedido;
  if o.id is null or not public.is_member(public.store_org(o.store_id)) then raise exception 'Sem permissão'; end if;
  if p_forma not in ('pix','cartao','dinheiro','maquininha') then raise exception 'Forma de pagamento inválida'; end if;
  update public.orders set pago = true, pagamento = p_forma,
    pagamentos = jsonb_build_array(jsonb_build_object('forma', p_forma, 'valor', o.total)),
    caixa_id = coalesce(o.caixa_id, public._caixa_aberto(o.store_id))
  where id = p_pedido;
end $$;

create or replace function public.pedido_cancelar(p_pedido uuid, p_motivo text) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_pedido;
  if o.id is null or not public.is_member(public.store_org(o.store_id)) then raise exception 'Sem permissão'; end if;
  if o.status = 'entregue' then raise exception 'Pedido já entregue não pode ser cancelado'; end if;
  update public.orders set status = 'cancelado', cancelado_motivo = nullif(trim(p_motivo), '') where id = p_pedido;
end $$;

revoke execute on function public.pedidos_tempo_medio(uuid), public.pedido_pagar(uuid, text), public.pedido_cancelar(uuid, text) from public, anon;
grant execute on function public.pedidos_tempo_medio(uuid), public.pedido_pagar(uuid, text), public.pedido_cancelar(uuid, text) to authenticated;

-- entregadores de exemplo na loja demo
insert into public.couriers (store_id, nome, telefone)
select s.id, x.nome, x.tel from public.stores s,
  (values ('Marquinhos', '(21) 97000-1111'), ('Dudu', '(21) 97000-2222')) as x(nome, tel)
where s.slug = 'brasa-burger' and not exists (select 1 from public.couriers c where c.store_id = s.id);
