-- 020: Território de verdade — quem pediu de fora da área deixa o WhatsApp e o dono avisa quando liberar o bairro.

alter table public.out_of_area_leads add column if not exists nome text;
alter table public.out_of_area_leads add column if not exists avisado_em timestamptz;

-- Cliente na loja (sem login) pede para ser avisado quando entregarem no endereço dele.
create or replace function public.interesse_fora(p_slug text, p_lon double precision, p_lat double precision, p_telefone text, p_nome text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_store stores;
  v_tel text := public.so_digitos(p_telefone);
  v_ent jsonb;
  v_bairro text;
begin
  select * into v_store from stores where slug = p_slug;
  if v_store.id is null then raise exception 'Loja não encontrada'; end if;
  if length(v_tel) not between 10 and 11 then raise exception 'Informe um WhatsApp com DDD'; end if;
  v_ent := resolve_delivery(v_store.id, p_lon, p_lat);
  if coalesce((v_ent->>'atende')::boolean, false) then
    return jsonb_build_object('ok', true, 'ja_atende', true);
  end if;
  v_bairro := v_ent->>'bairro_id';
  -- não duplica: mesmo telefone e mesmo bairro nos últimos 30 dias
  if exists (select 1 from out_of_area_leads where store_id = v_store.id and telefone = v_tel
             and coalesce(bairro_id, '') = coalesce(v_bairro, '') and created_at > now() - interval '30 days') then
    update out_of_area_leads set aceita_aviso = true, nome = coalesce(nullif(btrim(p_nome), ''), nome)
     where store_id = v_store.id and telefone = v_tel and coalesce(bairro_id, '') = coalesce(v_bairro, '');
  else
    insert into out_of_area_leads (store_id, bairro_id, telefone, nome, aceita_aviso, ponto)
    values (v_store.id, v_bairro, v_tel, nullif(left(btrim(coalesce(p_nome, '')), 60), ''), true, st_setsrid(st_makepoint(p_lon, p_lat), 4326));
  end if;
  return jsonb_build_object('ok', true, 'bairro', v_ent->>'bairro');
end $$;

-- Painel: quem pediu um bairro (para avisar no WhatsApp)
create or replace function public.leads_bairro(p_store uuid, p_bairro text)
returns table (id uuid, telefone text, nome text, quando timestamptz, avisado_em timestamptz)
language sql stable security definer set search_path = public as $$
  select distinct on (l.telefone) l.id, l.telefone, l.nome, l.created_at, l.avisado_em
  from out_of_area_leads l
  where l.store_id = p_store and l.bairro_id = p_bairro and l.aceita_aviso and l.telefone is not null
    and public.is_member(public.store_org(p_store))
  order by l.telefone, l.created_at desc;
$$;

create or replace function public.lead_avisado(p_store uuid, p_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member(public.store_org(p_store)) then raise exception 'Sem permissão'; end if;
  update out_of_area_leads set avisado_em = now() where store_id = p_store and id = any(p_ids);
end $$;

revoke all on function public.interesse_fora(text, double precision, double precision, text, text) from public;
revoke all on function public.leads_bairro(uuid, text) from public, anon;
revoke all on function public.lead_avisado(uuid, uuid[]) from public, anon;
grant execute on function public.interesse_fora(text, double precision, double precision, text, text) to anon, authenticated;
grant execute on function public.leads_bairro(uuid, text) to authenticated;
grant execute on function public.lead_avisado(uuid, uuid[]) to authenticated;
