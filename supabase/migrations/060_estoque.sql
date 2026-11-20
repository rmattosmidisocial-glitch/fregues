-- 060: estoque simples dos insumos. Cada venda dá baixa sozinha pela ficha técnica; pedido
-- cancelado devolve. O dono lança entradas (compras), perdas e contagens. Estoque nulo = não controla.

alter table public.insumos add column if not exists estoque numeric(12,3);
alter table public.insumos add column if not exists estoque_minimo numeric(12,3) not null default 0 check (estoque_minimo >= 0);

create table if not exists public.estoque_movimentos (
  id bigint generated always as identity primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  insumo_id uuid not null references public.insumos(id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'venda', 'estorno', 'perda', 'contagem')),
  qtd numeric(12,3) not null, -- com sinal, na unidade de compra (kg, litro, unidade)
  saldo numeric(12,3), -- estoque depois do movimento
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid default auth.uid(),
  obs text check (obs is null or char_length(obs) <= 200),
  criado_em timestamptz not null default now()
);
create index if not exists estoque_mov_loja on public.estoque_movimentos (store_id, criado_em desc);
create index if not exists estoque_mov_pedido on public.estoque_movimentos (order_id) where order_id is not null;

alter table public.estoque_movimentos enable row level security;
drop policy if exists estoque_mov_gestor on public.estoque_movimentos;
create policy estoque_mov_gestor on public.estoque_movimentos for select to authenticated
  using (public.meu_papel(public.store_org(store_id)) in ('dono', 'gerente'));

-- Baixa da venda: cada item vendido tira da ficha técnica do produto
create or replace function public._estoque_baixa_item() returns trigger
language plpgsql security definer set search_path = public as $$
declare f record; v_store uuid; v_q numeric; v_saldo numeric;
begin
  if new.product_id is null then return new; end if;
  select store_id into v_store from orders where id = new.order_id;
  for f in
    select i.id, i.unidade, ft.qtd from fichas_tecnicas ft join insumos i on i.id = ft.insumo_id
    where ft.product_id = new.product_id and i.estoque is not null
  loop
    v_q := round(f.qtd * new.qtd / (case when f.unidade = 'un' then 1 else 1000 end), 3);
    update insumos set estoque = estoque - v_q where id = f.id returning estoque into v_saldo;
    insert into estoque_movimentos (store_id, insumo_id, tipo, qtd, saldo, order_id, user_id)
    values (v_store, f.id, 'venda', -v_q, v_saldo, new.order_id, null);
  end loop;
  return new;
end $$;
drop trigger if exists estoque_baixa on public.order_items;
create trigger estoque_baixa after insert on public.order_items for each row execute function public._estoque_baixa_item();

-- Pedido cancelado devolve o que tinha saído
create or replace function public._estoque_estorno() returns trigger
language plpgsql security definer set search_path = public as $$
declare m record; v_saldo numeric;
begin
  if new.status = 'cancelado' and old.status is distinct from 'cancelado' then
    for m in
      select insumo_id, sum(qtd) as q from estoque_movimentos
      where order_id = new.id and tipo in ('venda', 'estorno') group by insumo_id having sum(qtd) < 0
    loop
      update insumos set estoque = estoque - m.q where id = m.insumo_id and estoque is not null returning estoque into v_saldo;
      if found then
        insert into estoque_movimentos (store_id, insumo_id, tipo, qtd, saldo, order_id, user_id)
        values (new.store_id, m.insumo_id, 'estorno', -m.q, v_saldo, new.id, null);
      end if;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists estoque_estorno on public.orders;
create trigger estoque_estorno after update of status on public.orders for each row execute function public._estoque_estorno();

-- Lançamento manual (dono e gerente):
--   entrada: soma (e, se vier o preço, atualiza o custo do insumo)
--   perda: tira
--   contagem: o estoque passa a ser exatamente p_qtd (também liga o controle)
create or replace function public.estoque_lancar(p_insumo uuid, p_tipo text, p_qtd numeric, p_custo numeric default null, p_obs text default null, p_minimo numeric default null)
returns text language plpgsql security definer set search_path = public as $$
declare i record; v_delta numeric; v_saldo numeric;
begin
  select * into i from insumos where id = p_insumo;
  if i.id is null then return 'nao_encontrado'; end if;
  if coalesce(public.meu_papel(public.store_org(i.store_id)), '') not in ('dono', 'gerente') then return 'sem_permissao'; end if;
  if p_qtd is null or p_qtd < 0 or p_qtd > 1000000 then return 'quantidade_invalida'; end if;
  if p_tipo not in ('entrada', 'perda', 'contagem') then return 'tipo_invalido'; end if;
  if p_tipo <> 'contagem' and i.estoque is null then return 'faca_a_contagem'; end if;
  v_delta := case p_tipo when 'entrada' then p_qtd when 'perda' then -p_qtd else p_qtd - coalesce(i.estoque, 0) end;
  update insumos set estoque = coalesce(estoque, 0) + v_delta,
    estoque_minimo = coalesce(p_minimo, estoque_minimo),
    custo = case when p_tipo = 'entrada' and p_custo is not null and p_custo >= 0 then p_custo else custo end
  where id = i.id returning estoque into v_saldo;
  insert into estoque_movimentos (store_id, insumo_id, tipo, qtd, saldo, obs)
  values (i.store_id, i.id, p_tipo, v_delta, v_saldo, nullif(left(trim(coalesce(p_obs, '')), 200), ''));
  return 'ok';
end $$;
grant execute on function public.estoque_lancar(uuid, text, numeric, numeric, text, numeric) to authenticated;

-- Parar de controlar um insumo (o histórico fica)
create or replace function public.estoque_desligar(p_insumo uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_store uuid;
begin
  select store_id into v_store from insumos where id = p_insumo;
  if v_store is null then return 'nao_encontrado'; end if;
  if coalesce(public.meu_papel(public.store_org(v_store)), '') not in ('dono', 'gerente') then return 'sem_permissao'; end if;
  update insumos set estoque = null where id = p_insumo;
  return 'ok';
end $$;
grant execute on function public.estoque_desligar(uuid) to authenticated;

-- Exemplo nas lojas de demonstração
update public.insumos i set estoque = v.e, estoque_minimo = v.m
from (values ('Blend bovino', 18.0, 8.0), ('Pão brioche', 140, 60), ('Queijo prato', 3.2, 2.0), ('Cheddar fatiado', 1.1, 2.0),
             ('Bacon', 0.6, 2.0), ('Molho da casa', 6.0, 2.0), ('Batata congelada', 24.0, 10.0), ('Embalagem', 380, 150), ('Refrigerante lata', 96, 48)) as v(nome, e, m)
where i.nome = v.nome and i.estoque is null and i.store_id in (select id from public.stores where demonstracao);
