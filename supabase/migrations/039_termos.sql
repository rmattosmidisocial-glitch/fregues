-- 039: aceite dos termos de uso e da política de privacidade pelo dono da loja.
create table if not exists public.termos_aceites (
  user_id uuid not null default auth.uid(),
  versao text not null,
  aceito_em timestamptz not null default now(),
  primary key (user_id, versao)
);
alter table public.termos_aceites enable row level security;
drop policy if exists termos_meus on public.termos_aceites;
create policy termos_meus on public.termos_aceites for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert on public.termos_aceites to authenticated;

-- Admin vê quem aceitou
create or replace function public.admin_termos(p_org uuid)
returns table (email text, versao text, aceito_em timestamptz) language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform public.exigir_admin();
  return query select u.email::text, t.versao, t.aceito_em from public.memberships m
    join auth.users u on u.id = m.user_id join public.termos_aceites t on t.user_id = m.user_id
    where m.org_id = p_org order by t.aceito_em desc;
end $$;
revoke all on function public.admin_termos(uuid) from public, anon;
grant execute on function public.admin_termos(uuid) to authenticated;
