-- Equipe da casa: garçons (e quem fica no caixa), cadastrados pelo dono.
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  nome text not null,
  funcao text not null default 'garcom' check (funcao in ('garcom','caixa')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists staff_store_idx on public.staff(store_id);
alter table public.staff enable row level security;
drop policy if exists equipe_membro on public.staff;
create policy equipe_membro on public.staff for all to authenticated
  using (public.is_member(public.store_org(store_id))) with check (public.is_member(public.store_org(store_id)));
grant select, insert, update, delete on public.staff to authenticated;

-- garçons de exemplo na loja demo
insert into public.staff (store_id, nome)
select s.id, x.nome from public.stores s, (values ('Léo'), ('Bia')) as x(nome)
where s.slug = 'brasa-burger' and not exists (select 1 from public.staff t where t.store_id = s.id);
