-- 047 · Fase 4: relatórios por período (opcional), pagamento online automático, WhatsApp oficial,
-- nota fiscal NFC-e (opcional) e endereço curto por restaurante.

-- ---------- Opções da loja (todas desligadas: o dono liga o que quiser) ----------
alter table public.stores add column if not exists relatorios_ativo boolean not null default false;
alter table public.stores add column if not exists pagamento_online boolean not null default false;
alter table public.stores add column if not exists pagamento_online_ok boolean not null default false; -- chave conferida
alter table public.stores add column if not exists whatsapp_ativo boolean not null default false;
alter table public.stores add column if not exists whatsapp_ok boolean not null default false;
alter table public.stores add column if not exists whatsapp_eventos jsonb not null default '{"recebido": true, "preparo": false, "rota": true, "pronto": true}'::jsonb;
alter table public.stores add column if not exists nfce_ativo boolean not null default false;
alter table public.stores add column if not exists nfce_ok boolean not null default false;
alter table public.stores add column if not exists nfce_automatica boolean not null default false;
alter table public.stores add column if not exists nfce_cnpj text;
alter table public.stores add column if not exists nfce_producao boolean not null default false;
alter table public.stores add column if not exists nfce_ncm text not null default '21069090';

-- Chaves secretas de cada loja (Mercado Pago, WhatsApp, Focus NFe): ninguém lê pelo navegador, nem o dono.
-- Só o servidor (api/loja) grava e usa.
create table if not exists public.store_secrets (
  store_id uuid primary key references public.stores(id) on delete cascade,
  mp_token text,
  wa_phone_id text,
  wa_token text,
  wa_modelos jsonb not null default '{}'::jsonb,
  focus_token text,
  atualizado_em timestamptz not null default now()
);
alter table public.store_secrets enable row level security;
revoke all on public.store_secrets from anon, authenticated;

-- ---------- 29. Pagamento online ----------
alter table public.orders add column if not exists pagamento_ref text;
alter table public.orders add column if not exists pago_em timestamptz;
alter table public.orders add column if not exists pix_online jsonb; -- {qr, copia_cola, expira_em}

-- o servidor marca pago depois de conferir com o Mercado Pago
create or replace function public.pedido_pago_srv(p_order uuid, p_ref text) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.orders set pago = true, pago_em = coalesce(pago_em, now()), pagamento_ref = p_ref, updated_at = now()
   where id = p_order and not pago and status <> 'cancelado';
  get diagnostics n = row_count;
  return n > 0;
end $$;
revoke all on function public.pedido_pago_srv(uuid, text) from public, anon, authenticated;

-- ---------- 28. WhatsApp: registro de envios (não manda o mesmo aviso duas vezes) ----------
create table if not exists public.whatsapp_envios (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  evento text not null,
  ok boolean not null,
  detalhe text,
  criado_em timestamptz not null default now(),
  unique (order_id, evento)
);
alter table public.whatsapp_envios enable row level security;
revoke all on public.whatsapp_envios from anon, authenticated;

-- ---------- 31. Notas fiscais ----------
create table if not exists public.notas (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  ref text not null unique,
  status text not null default 'processando' check (status in ('processando','autorizada','erro','cancelada')),
  numero text,
  chave text,
  url_danfe text,
  url_qr text,
  mensagem text,
  producao boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index if not exists notas_uma_por_pedido on public.notas(order_id) where status in ('processando','autorizada');
alter table public.notas enable row level security;
drop policy if exists notas_ler on public.notas;
create policy notas_ler on public.notas for select to authenticated using (public.is_member(public.store_org(store_id)));
grant select on public.notas to authenticated;

-- ---------- O que o painel pode saber das integrações (sem nunca devolver a chave) ----------
create or replace function public.loja_integracoes(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.store_secrets;
begin
  if public.meu_papel(public.store_org(p_store)) not in ('dono', 'gerente') then raise exception 'Só o dono ou o gerente'; end if;
  select * into s from public.store_secrets where store_id = p_store;
  return jsonb_build_object(
    'mp', s.mp_token is not null,
    'mp_final', case when s.mp_token is not null then right(s.mp_token, 4) end,
    'wa', s.wa_token is not null and s.wa_phone_id is not null,
    'wa_phone_id', s.wa_phone_id,
    'wa_modelos', coalesce(s.wa_modelos, '{}'::jsonb),
    'focus', s.focus_token is not null,
    'focus_final', case when s.focus_token is not null then right(s.focus_token, 4) end);
end $$;
grant execute on function public.loja_integracoes(uuid) to authenticated;

-- ---------- 30. Relatórios por período (só dono e gerente, e só com a opção ligada) ----------
create or replace function public._pode_relatorio(p_store uuid) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if public.meu_papel(public.store_org(p_store)) not in ('dono', 'gerente') then raise exception 'Só o dono ou o gerente veem os relatórios'; end if;
end $$;

create or replace function public.relatorio_periodo(p_store uuid, p_de date, p_ate date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb; v_ini timestamptz; v_fim timestamptz;
begin
  perform public._pode_relatorio(p_store);
  if p_ate < p_de then raise exception 'A data final é antes da inicial'; end if;
  if p_ate - p_de > 400 then raise exception 'Escolha um período de até 13 meses'; end if;
  v_ini := (p_de::timestamp at time zone 'America/Sao_Paulo');
  v_fim := ((p_ate + 1)::timestamp at time zone 'America/Sao_Paulo');
  with ped as (
    select o.*, (o.created_at at time zone 'America/Sao_Paulo')::date as dia,
      case o.modo when 'mesa' then 'Salão' when 'balcao' then 'Balcão' when 'retirada' then 'Retirada' else 'Entrega' end as canal_nome
    from public.orders o where o.store_id = p_store and o.created_at >= v_ini and o.created_at < v_fim
  ), val as (select * from ped where status <> 'cancelado'),
  pg as (
    select x->>'forma' as forma, (x->>'valor')::numeric as valor from val p, jsonb_array_elements(p.pagamentos) x where p.pagamentos is not null
    union all select pagamento, total from val where pagamentos is null
  )
  select jsonb_build_object(
    'pedidos', (select count(*) from val),
    'cancelados', (select count(*) from ped where status = 'cancelado'),
    'valor_cancelado', coalesce((select sum(total) from ped where status = 'cancelado'), 0),
    'bruto', coalesce((select sum(subtotal) from val), 0),
    'descontos', coalesce((select sum(desconto) from val), 0),
    'taxas_entrega', coalesce((select sum(taxa_entrega) from val), 0),
    'embalagens', coalesce((select sum(coalesce(taxa_embalagem, 0)) from val), 0),
    'total', coalesce((select sum(total) from val), 0),
    'recebido', coalesce((select sum(total) from val where pago), 0),
    'a_receber', coalesce((select sum(total) from val where not pago), 0),
    'clientes', (select count(distinct customer_id) from val where customer_id is not null),
    'por_forma', coalesce((select jsonb_object_agg(forma, v) from (select forma, round(sum(valor), 2) v from pg group by forma) a), '{}'::jsonb),
    'por_canal', coalesce((select jsonb_object_agg(canal_nome, jsonb_build_object('pedidos', n, 'total', v)) from (select canal_nome, count(*) n, round(sum(total), 2) v from val group by canal_nome) b), '{}'::jsonb),
    'por_dia', coalesce((select jsonb_agg(jsonb_build_object('dia', dia, 'pedidos', n, 'total', v) order by dia) from (select dia, count(*) n, round(sum(total), 2) v from val group by dia) c), '[]'::jsonb),
    'produtos', coalesce((select jsonb_agg(jsonb_build_object('nome', nome, 'qtd', q, 'total', v) order by v desc) from (
        select i.nome, sum(i.qtd)::int q, round(sum(i.qtd * i.unit), 2) v from public.order_items i join val on val.id = i.order_id group by i.nome order by 3 desc limit 30) d), '[]'::jsonb),
    'notas', (select count(*) from public.notas n join val on val.id = n.order_id where n.status = 'autorizada')
  ) into r;
  return r;
end $$;

create or replace function public.relatorio_pedidos(p_store uuid, p_de date, p_ate date)
returns table (data timestamptz, numero int, canal text, status text, forma text, pago boolean, subtotal numeric, desconto numeric,
  taxa_entrega numeric, embalagem numeric, total numeric, cliente text, bairro text, nota text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public._pode_relatorio(p_store);
  if p_ate - p_de > 400 then raise exception 'Escolha um período de até 13 meses'; end if;
  return query
  select o.created_at, o.numero,
    case o.modo when 'mesa' then 'Salão' when 'balcao' then 'Balcão' when 'retirada' then 'Retirada' else 'Entrega' end,
    o.status,
    coalesce((select string_agg(x->>'forma', '+') from jsonb_array_elements(o.pagamentos) x), o.pagamento),
    o.pago, o.subtotal, o.desconto, o.taxa_entrega, coalesce(o.taxa_embalagem, 0), o.total,
    c.nome, o.endereco->>'bairro',
    (select n.numero from public.notas n where n.order_id = o.id and n.status = 'autorizada' limit 1)
  from public.orders o left join public.customers c on c.id = o.customer_id
  where o.store_id = p_store
    and o.created_at >= (p_de::timestamp at time zone 'America/Sao_Paulo')
    and o.created_at < ((p_ate + 1)::timestamp at time zone 'America/Sao_Paulo')
  order by o.created_at
  limit 50000;
end $$;

revoke all on function public._pode_relatorio(uuid), public.relatorio_periodo(uuid, date, date), public.relatorio_pedidos(uuid, date, date) from public, anon;
grant execute on function public.relatorio_periodo(uuid, date, date), public.relatorio_pedidos(uuid, date, date) to authenticated;
