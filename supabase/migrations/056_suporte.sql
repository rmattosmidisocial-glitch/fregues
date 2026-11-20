-- 056: suporte aos restaurantes. Contato de suporte separado do comercial e chamados abertos pelo painel.
alter table public.platform_config add column if not exists suporte_whatsapp text not null default '';
alter table public.platform_config add column if not exists suporte_horario text not null default 'Segunda a sábado, das 9h às 18h';

-- O painel dos restaurantes vê: empresa, WhatsApp comercial, WhatsApp e horário do suporte.
drop function if exists public.config_publica();
create function public.config_publica()
returns table (empresa text, whatsapp text, suporte_whatsapp text, suporte_horario text)
language sql stable security definer set search_path = public as $$
  select empresa, whatsapp, suporte_whatsapp, suporte_horario from public.platform_config where id = 1;
$$;
grant execute on function public.config_publica() to anon, authenticated;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid default auth.uid(),
  email text,
  assunto text not null check (length(assunto) between 2 and 80),
  mensagem text not null check (length(mensagem) between 3 and 2000),
  tela text,
  status text not null default 'aberto' check (status in ('aberto', 'andamento', 'resolvido')),
  resposta text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists support_tickets_store_idx on public.support_tickets(store_id, criado_em desc);
create index if not exists support_tickets_status_idx on public.support_tickets(status, criado_em desc);
alter table public.support_tickets enable row level security;

drop policy if exists suporte_loja_ler on public.support_tickets;
drop policy if exists suporte_loja_abrir on public.support_tickets;
drop policy if exists suporte_admin_editar on public.support_tickets;
-- a equipe da loja vê e abre chamados da própria loja; o administrador vê todos
create policy suporte_loja_ler on public.support_tickets for select to authenticated
  using (public.is_platform_admin() or exists (select 1 from public.stores s where s.id = store_id and public.is_member(s.org_id)));
create policy suporte_loja_abrir on public.support_tickets for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.stores s where s.id = store_id and public.is_member(s.org_id)));
-- só o administrador responde e muda a situação
create policy suporte_admin_editar on public.support_tickets for update to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());
