-- 032: configurações da plataforma (dados do dono do Freguês): empresa, contato e assinatura das mensagens.
create table if not exists public.platform_config (
  id int primary key default 1 check (id = 1),
  empresa text not null default '',
  responsavel text not null default '',
  email text not null default '',
  whatsapp text not null default '',
  assinatura text not null default '',
  atualizado_em timestamptz not null default now()
);
alter table public.platform_config enable row level security;
drop policy if exists config_admin_ler on public.platform_config;
drop policy if exists config_admin_editar on public.platform_config;
create policy config_admin_ler on public.platform_config for select to authenticated using (public.is_platform_admin());
create policy config_admin_editar on public.platform_config for update to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
insert into public.platform_config (id, empresa, whatsapp) values (1, 'MMATTOS Assessoria de MKT', '21967640607') on conflict (id) do nothing;

-- O que o painel dos restaurantes pode ver: nome e WhatsApp de atendimento.
create or replace function public.config_publica()
returns table (empresa text, whatsapp text) language sql stable security definer set search_path = public as $$
  select empresa, whatsapp from public.platform_config where id = 1;
$$;
grant execute on function public.config_publica() to anon, authenticated;
