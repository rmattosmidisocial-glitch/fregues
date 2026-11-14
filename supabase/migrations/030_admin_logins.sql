-- 030: o Admin vê qual é o login do dono de cada cliente e se ele já entrou (sem ver senha).
create or replace function public.admin_logins(p_org uuid)
returns table (email text, papel text, ultimo_login timestamptz, provisoria boolean, criado_em timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform public.exigir_admin();
  return query
    select u.email::text, m.role, u.last_sign_in_at, coalesce((u.raw_user_meta_data->>'trocar_senha')::boolean, false), u.created_at
    from public.memberships m join auth.users u on u.id = m.user_id
    where m.org_id = p_org order by m.role = 'dono' desc, u.created_at;
end $$;
revoke all on function public.admin_logins(uuid) from public, anon;
grant execute on function public.admin_logins(uuid) to authenticated;
