-- 065 · Pixel da Meta e API de Conversões por loja.
-- O ID do Pixel é público (vai na loja online). O token da API de Conversões fica só no servidor.

alter table public.stores add column if not exists meta_pixel_id text;
alter table public.stores drop constraint if exists stores_meta_pixel_ck;
alter table public.stores add constraint stores_meta_pixel_ck check (meta_pixel_id is null or meta_pixel_id ~ '^[0-9]{6,20}$');
alter table public.stores add column if not exists meta_capi boolean not null default false; -- token conferido

alter table public.store_secrets add column if not exists meta_token text;
alter table public.store_secrets add column if not exists meta_teste text; -- código de teste do Gerenciador de Eventos

-- de onde o cliente veio (cookies da Meta, IP e navegador) e se a compra já foi avisada à Meta
alter table public.orders add column if not exists meta_rastreio jsonb;
alter table public.orders add column if not exists meta_enviado_em timestamptz;
alter table public.orders add column if not exists meta_resultado text;

-- o painel sabe se há token da Meta (nunca o token)
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
    'focus_final', case when s.focus_token is not null then right(s.focus_token, 4) end,
    'stone', s.stone_token is not null,
    'meta', s.meta_token is not null,
    'meta_final', case when s.meta_token is not null then right(s.meta_token, 4) end,
    'meta_teste', s.meta_teste);
end $$;
grant execute on function public.loja_integracoes(uuid) to authenticated;

-- Painel: pedidos e vendas que vieram de anúncio da Meta nos últimos 30 dias
create or replace function public.meta_vendas(p_store uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.is_member(public.store_org(p_store)) then
    jsonb_build_object('pedidos', count(*), 'receita', coalesce(sum(total), 0),
      'avisadas', count(*) filter (where meta_enviado_em is not null)) end
  from public.orders
  where store_id = p_store and canal = 'Anúncio da Meta' and status <> 'cancelado' and created_at > now() - interval '30 days';
$$;
revoke all on function public.meta_vendas(uuid) from public, anon;
grant execute on function public.meta_vendas(uuid) to authenticated;
