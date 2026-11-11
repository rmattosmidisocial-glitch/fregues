-- 009 · Caixa e venda no balcão.
-- Cada pedido guarda como foi pago (pode ser dividido). O caixa soma tudo o que entrou entre a abertura e o fechamento.

alter table public.orders add column if not exists pagamentos jsonb;      -- [{forma, valor}] já sem o troco
alter table public.orders add column if not exists caixa_id uuid;
alter table public.orders drop constraint if exists orders_modo_check;
alter table public.orders add constraint orders_modo_check check (modo in ('entrega','retirada','mesa','balcao'));

create table public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  status text not null default 'aberto' check (status in ('aberto','fechado')),
  operador text not null,
  valor_inicial numeric(10,2) not null default 0 check (valor_inicial >= 0),
  aberto_em timestamptz not null default now(),
  fechado_em timestamptz,
  dinheiro_contado numeric(10,2),
  resumo jsonb,
  observacao text
);
create unique index caixa_um_aberto_por_loja on public.cash_sessions(store_id) where status = 'aberto';

create table public.cash_moves (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.cash_sessions(id) on delete cascade,
  tipo text not null check (tipo in ('retirada','reforco')),
  valor numeric(10,2) not null check (valor > 0),
  motivo text,
  criado_em timestamptz not null default now()
);

alter table public.orders add constraint orders_caixa_fk foreign key (caixa_id) references public.cash_sessions(id) on delete set null;

alter table public.cash_sessions enable row level security;
alter table public.cash_moves enable row level security;
create policy caixa_membro on public.cash_sessions for select to authenticated using (public.is_member(public.store_org(store_id)));
create policy mov_membro on public.cash_moves for select to authenticated using (exists (select 1 from public.cash_sessions c where c.id = session_id and public.is_member(public.store_org(c.store_id))));
grant select on public.cash_sessions, public.cash_moves to authenticated;

-- Normaliza pagamentos: formas válidas, valores positivos e troco descontado do dinheiro
create or replace function public._normalizar_pagamentos(p jsonb, p_total numeric)
returns jsonb language plpgsql immutable as $$
declare v_pago numeric; v_troco numeric; r jsonb := '[]'::jsonb; x jsonb; v numeric;
begin
  if jsonb_typeof(p) <> 'array' or jsonb_array_length(p) = 0 then raise exception 'Informe como foi pago'; end if;
  select coalesce(sum((e->>'valor')::numeric), 0) into v_pago from jsonb_array_elements(p) e;
  if v_pago + 0.009 < p_total then raise exception 'Falta receber R$ %', replace(to_char(p_total - v_pago, 'FM999990.00'), '.', ','); end if;
  v_troco := v_pago - p_total;
  for x in select * from jsonb_array_elements(p) loop
    if x->>'forma' not in ('pix','cartao','dinheiro','maquininha') then raise exception 'Forma de pagamento inválida'; end if;
    v := (x->>'valor')::numeric;
    if v < 0 then raise exception 'Valor inválido'; end if;
    if x->>'forma' = 'dinheiro' and v_troco > 0 then
      v := v - least(v, v_troco);
      v_troco := v_troco - least((x->>'valor')::numeric, v_troco);
    end if;
    if v > 0 then r := r || jsonb_build_array(jsonb_build_object('forma', x->>'forma', 'valor', round(v, 2))); end if;
  end loop;
  if v_troco > 0.009 then raise exception 'Troco só pode sair de pagamento em dinheiro'; end if;
  return r;
end $$;

create or replace function public._caixa_aberto(p_store uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.cash_sessions where store_id = p_store and status = 'aberto';
$$;

-- ---------- Caixa ----------
create or replace function public.caixa_abrir(p_store uuid, p_valor_inicial numeric, p_operador text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if not public.is_member(public.store_org(p_store)) then raise exception 'Sem permissão'; end if;
  if public._caixa_aberto(p_store) is not null then raise exception 'Já existe um caixa aberto'; end if;
  insert into public.cash_sessions (store_id, valor_inicial, operador) values (p_store, coalesce(p_valor_inicial, 0), coalesce(nullif(trim(p_operador), ''), 'Caixa')) returning id into v;
  return v;
end $$;

create or replace function public.caixa_movimento(p_caixa uuid, p_tipo text, p_valor numeric, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare c public.cash_sessions;
begin
  select * into c from public.cash_sessions where id = p_caixa and status = 'aberto';
  if c.id is null or not public.is_member(public.store_org(c.store_id)) then raise exception 'Caixa fechado ou sem permissão'; end if;
  insert into public.cash_moves (session_id, tipo, valor, motivo) values (p_caixa, p_tipo, p_valor, left(p_motivo, 120));
end $$;

-- Quanto entrou, por forma e por canal, entre a abertura e agora (ou o fechamento)
create or replace function public.caixa_resumo(p_caixa uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c public.cash_sessions; r jsonb;
begin
  select * into c from public.cash_sessions where id = p_caixa;
  if c.id is null or not public.is_member(public.store_org(c.store_id)) then raise exception 'Sem permissão'; end if;
  with ped as (
    select o.* from public.orders o
    where o.store_id = c.store_id and o.pago and o.status <> 'cancelado'
      and o.created_at >= c.aberto_em and o.created_at <= coalesce(c.fechado_em, now())
  ), pg as (
    select x->>'forma' as forma, (x->>'valor')::numeric as valor from ped p, jsonb_array_elements(p.pagamentos) x where p.pagamentos is not null
    union all
    select pagamento, total from ped where pagamentos is null
  ), mv as (select tipo, sum(valor) v from public.cash_moves where session_id = c.id group by tipo)
  select jsonb_build_object(
    'vendas', (select count(*) from ped),
    'total', coalesce((select sum(total) from ped), 0),
    'por_forma', coalesce((select jsonb_object_agg(forma, v) from (select forma, sum(valor) v from pg group by forma) a), '{}'::jsonb),
    'por_canal', coalesce((select jsonb_object_agg(canal, v) from (select case modo when 'mesa' then 'Salão' when 'balcao' then 'Balcão' else 'Delivery' end canal, sum(total) v from ped group by 1) b), '{}'::jsonb),
    'retiradas', coalesce((select v from mv where tipo = 'retirada'), 0),
    'reforcos', coalesce((select v from mv where tipo = 'reforco'), 0),
    'valor_inicial', c.valor_inicial
  ) into r;
  return r || jsonb_build_object('dinheiro_esperado',
    c.valor_inicial + coalesce((r->'por_forma'->>'dinheiro')::numeric, 0) + (r->>'reforcos')::numeric - (r->>'retiradas')::numeric);
end $$;

create or replace function public.caixa_fechar(p_caixa uuid, p_dinheiro_contado numeric, p_obs text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.cash_sessions; r jsonb;
begin
  select * into c from public.cash_sessions where id = p_caixa and status = 'aberto' for update;
  if c.id is null or not public.is_member(public.store_org(c.store_id)) then raise exception 'Caixa já fechado ou sem permissão'; end if;
  update public.cash_sessions set fechado_em = now() where id = c.id;
  r := public.caixa_resumo(c.id);
  r := r || jsonb_build_object('dinheiro_contado', p_dinheiro_contado, 'diferenca', p_dinheiro_contado - (r->>'dinheiro_esperado')::numeric);
  update public.cash_sessions set status = 'fechado', dinheiro_contado = p_dinheiro_contado, resumo = r, observacao = p_obs where id = c.id;
  return r;
end $$;

-- ---------- Venda no balcão ----------
create or replace function public.venda_balcao(p_store uuid, p_itens jsonb, p_pagamentos jsonb, p_telefone text default null, p_nome text default null, p_desconto numeric default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := public.store_org(p_store); v_caixa uuid; i jsonb; pr public.products; v_sub numeric := 0; v_total numeric;
  v_tel text := public.so_digitos(p_telefone); v_cli uuid; v_ped uuid; v_num int; v_pags jsonb; v_forma text;
begin
  if not public.is_member(v_org) then raise exception 'Sem permissão'; end if;
  v_caixa := public._caixa_aberto(p_store);
  if v_caixa is null then raise exception 'Abra o caixa antes de vender'; end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then raise exception 'Venda sem itens'; end if;
  for i in select * from jsonb_array_elements(p_itens) loop
    select * into pr from public.products where id = (i->>'produto')::uuid and store_id = p_store;
    if pr.id is null then raise exception 'Produto não está no cardápio'; end if;
    if pr.esgotado then raise exception '% acabou hoje', pr.nome; end if;
    v_sub := v_sub + coalesce(pr.preco_promo, pr.preco) * least(50, greatest(1, coalesce((i->>'qtd')::int, 1)));
  end loop;
  v_total := greatest(0, v_sub - coalesce(p_desconto, 0));
  v_pags := public._normalizar_pagamentos(p_pagamentos, v_total);
  select e->>'forma' into v_forma from jsonb_array_elements(v_pags) e order by (e->>'valor')::numeric desc limit 1;

  if v_tel is not null and length(v_tel) >= 10 then
    insert into public.customers (org_id, nome, telefone) values (v_org, coalesce(nullif(trim(p_nome), ''), 'Cliente do balcão'), v_tel)
    on conflict (org_id, telefone) do update set nome = coalesce(nullif(nullif(trim(excluded.nome), ''), 'Cliente do balcão'), public.customers.nome)
    returning id into v_cli;
  end if;

  insert into public.orders (store_id, customer_id, status, modo, subtotal, desconto, total, pagamento, pago, canal, pagamentos, caixa_id, observacao)
  values (p_store, v_cli, 'novo', 'balcao', v_sub, coalesce(p_desconto, 0), v_total, coalesce(v_forma, 'dinheiro'), true, 'Balcão', v_pags, v_caixa, nullif(trim(p_nome), ''))
  returning id, numero into v_ped, v_num;
  insert into public.order_items (order_id, product_id, nome, qtd, unit, obs)
  select v_ped, p.id, p.nome, least(50, greatest(1, coalesce((x->>'qtd')::int, 1))), coalesce(p.preco_promo, p.preco), left(nullif(trim(x->>'obs'), ''), 200)
  from jsonb_array_elements(p_itens) x join public.products p on p.id = (x->>'produto')::uuid;
  return jsonb_build_object('id', v_ped, 'numero', v_num, 'total', v_total, 'troco',
    round((select coalesce(sum((e->>'valor')::numeric), 0) from jsonb_array_elements(p_pagamentos) e) - v_total, 2));
end $$;

-- A conta da mesa passa a gravar como foi paga e em qual caixa
create or replace function public.fechar_comanda(p_comanda uuid, p_pagamentos jsonb, p_telefone text default null, p_nome text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  t public.tabs; v_org uuid; v_sub numeric; v_serv numeric; v_total numeric; v_pags jsonb;
  v_tel text := public.so_digitos(p_telefone); v_cli uuid; v_ped uuid; v_forma text; v_mesa int;
begin
  select * into t from public.tabs where id = p_comanda and status in ('aberta','conta') for update;
  if t.id is null then raise exception 'Comanda já fechada'; end if;
  v_org := public.store_org(t.store_id);
  if not public.is_member(v_org) then raise exception 'Sem permissão'; end if;
  select coalesce(sum(qtd * unit), 0) into v_sub from public.tab_items where tab_id = t.id and status <> 'cancelado';
  if v_sub <= 0 then raise exception 'Comanda sem itens. Para liberar a mesa, cancele a comanda.'; end if;
  v_serv := round(v_sub * t.taxa_servico / 100, 2);
  v_total := v_sub + v_serv - t.desconto;
  v_pags := public._normalizar_pagamentos(p_pagamentos, v_total);
  select e->>'forma' into v_forma from jsonb_array_elements(v_pags) e order by (e->>'valor')::numeric desc limit 1;

  if v_tel is not null and length(v_tel) >= 10 then
    insert into public.customers (org_id, nome, telefone) values (v_org, coalesce(nullif(trim(p_nome), ''), 'Cliente do salão'), v_tel)
    on conflict (org_id, telefone) do update set nome = coalesce(nullif(nullif(trim(excluded.nome), ''), 'Cliente do salão'), public.customers.nome)
    returning id into v_cli;
  end if;

  select numero into v_mesa from public.dining_tables where id = t.table_id;
  insert into public.orders (store_id, customer_id, status, modo, mesa, subtotal, desconto, total, pagamento, pago, canal, pagamentos, caixa_id, observacao)
  values (t.store_id, coalesce(v_cli, t.customer_id), 'entregue', 'mesa', v_mesa::text, v_sub, t.desconto, v_total, coalesce(v_forma, 'maquininha'), true, 'Salão', v_pags,
          public._caixa_aberto(t.store_id), case when v_serv > 0 then 'Serviço ' || t.taxa_servico || '%: ' || v_serv end)
  returning id into v_ped;
  insert into public.order_items (order_id, product_id, nome, qtd, unit, obs)
  select v_ped, product_id, nome, qtd, unit, obs from public.tab_items where tab_id = t.id and status <> 'cancelado';
  update public.tabs set status = 'fechada', fechada_em = now(), pagamentos = v_pags, order_id = v_ped,
    customer_id = coalesce(v_cli, customer_id), telefone = coalesce(v_tel, telefone), cliente_nome = coalesce(nullif(trim(p_nome), ''), cliente_nome)
  where id = t.id;
  update public.table_calls set atendido_em = now() where table_id = t.table_id and atendido_em is null;
  return v_ped;
end $$;

revoke execute on function public._normalizar_pagamentos(jsonb, numeric), public._caixa_aberto(uuid), public.caixa_abrir(uuid, numeric, text),
  public.caixa_movimento(uuid, text, numeric, text), public.caixa_resumo(uuid), public.caixa_fechar(uuid, numeric, text),
  public.venda_balcao(uuid, jsonb, jsonb, text, text, numeric), public.fechar_comanda(uuid, jsonb, text, text) from public, anon;
grant execute on function public.caixa_abrir(uuid, numeric, text), public.caixa_movimento(uuid, text, numeric, text), public.caixa_resumo(uuid),
  public.caixa_fechar(uuid, numeric, text), public.venda_balcao(uuid, jsonb, jsonb, text, text, numeric), public.fechar_comanda(uuid, jsonb, text, text) to authenticated;
revoke execute on function public._normalizar_pagamentos(jsonb, numeric), public._caixa_aberto(uuid) from authenticated;
