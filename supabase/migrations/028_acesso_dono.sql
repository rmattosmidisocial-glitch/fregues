-- 028: o administrador cria o login e a senha do dono do restaurante (pela rota /api/admin/acesso).
-- Só o servidor (service_role) usa estas funções.
create or replace function public.usuario_por_email(p_email text)
returns table (id uuid, admin boolean)
language sql stable security definer set search_path = public, auth as $$
  select u.id, exists (select 1 from public.platform_admins a where a.user_id = u.id)
  from auth.users u where lower(u.email) = lower(trim(p_email)) limit 1;
$$;

create or replace function public.dono_vincular(p_org uuid, p_user uuid, p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.organizations where id = p_org) then raise exception 'Cliente não encontrado'; end if;
  insert into public.memberships (org_id, user_id, role) values (p_org, p_user, 'dono') on conflict (org_id, user_id) do nothing;
  update public.invites set aceito_em = now() where org_id = p_org and lower(email) = lower(trim(p_email)) and aceito_em is null;
end $$;

revoke all on function public.usuario_por_email(text), public.dono_vincular(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.usuario_por_email(text), public.dono_vincular(uuid, uuid, text) to service_role;
