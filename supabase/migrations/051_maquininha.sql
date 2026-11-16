-- 051 · Maquininha integrada (opcional por restaurante)
-- O caixa ou o garçom manda a cobrança do Freguês para a maquininha e o pagamento volta sozinho.
-- Começa com o Mercado Pago Point; a Stone fica preparada para quando a parceria for aprovada.

alter table public.stores
  add column if not exists maquininha_ativo boolean not null default false,
  add column if not exists maquininha_provedor text not null default 'mp',
  add column if not exists maquininha_aparelhos jsonb not null default '[]'::jsonb;

do $$ begin
  alter table public.stores add constraint stores_maquininha_provedor_ck check (maquininha_provedor in ('mp', 'stone'));
exception when duplicate_object then null; end $$;

-- chave da Stone (só o servidor lê, como as outras de store_secrets)
alter table public.store_secrets add column if not exists stone_token text;

-- cada cobrança enviada para uma maquininha: serve para acompanhar o pagamento e para auditoria
create table if not exists public.maquininha_cobrancas (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  provedor text not null,
  aparelho text not null,
  valor numeric(10,2) not null check (valor > 0),
  referencia text,
  externo_id text,
  status text not null default 'enviada' check (status in ('enviada', 'na_maquininha', 'aprovada', 'recusada', 'cancelada', 'expirada', 'erro')),
  detalhe text,
  pagamento_id text,
  forma text,
  criado_por uuid,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists maquininha_cobrancas_loja on public.maquininha_cobrancas(store_id, criado_em desc);
create index if not exists maquininha_cobrancas_externo on public.maquininha_cobrancas(externo_id);

alter table public.maquininha_cobrancas enable row level security;
drop policy if exists maquininha_ler on public.maquininha_cobrancas;
create policy maquininha_ler on public.maquininha_cobrancas for select to authenticated using (public.is_member(public.store_org(store_id)));
grant select on public.maquininha_cobrancas to authenticated;
-- gravar só pelo servidor (service role), que confere a chave e o papel de quem cobrou

-- o painel sabe se há chave da Stone (nunca a chave)
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
    'stone', s.stone_token is not null);
end $$;
grant execute on function public.loja_integracoes(uuid) to authenticated;
