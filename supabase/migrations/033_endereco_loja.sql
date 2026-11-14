-- 033: endereço do restaurante (cidade, bairro, rua, número, CEP) e o ponto no mapa.
alter table public.stores add column if not exists rua text;
alter table public.stores add column if not exists numero text;
alter table public.stores add column if not exists cep text;
alter table public.stores add column if not exists lon double precision;
alter table public.stores add column if not exists lat double precision;

-- quem já tinha localização (loja de demonstração) ganha lon/lat
update public.stores set lon = extensions.st_x(localizacao), lat = extensions.st_y(localizacao)
 where localizacao is not null and lon is null;

-- mantém a coluna de geometria em dia com lon/lat
create or replace function public.stores_ponto() returns trigger language plpgsql set search_path = public, extensions as $$
begin
  if new.lon is not null and new.lat is not null then
    new.localizacao := extensions.st_setsrid(extensions.st_makepoint(new.lon, new.lat), 4326);
  end if;
  return new;
end $$;
drop trigger if exists stores_ponto on public.stores;
create trigger stores_ponto before insert or update of lon, lat on public.stores for each row execute function public.stores_ponto();

-- Admin grava o endereço do cliente
create or replace function public.admin_endereco_salvar(
  p_org uuid, p_cidade text, p_bairro text, p_rua text, p_numero text, p_cep text, p_lon double precision, p_lat double precision
) returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  update public.stores set cidade = nullif(trim(p_cidade), ''), bairro = nullif(trim(p_bairro), ''), rua = nullif(trim(p_rua), ''),
    numero = nullif(trim(p_numero), ''), cep = nullif(regexp_replace(coalesce(p_cep, ''), '\D', '', 'g'), ''),
    lon = coalesce(p_lon, lon), lat = coalesce(p_lat, lat)
  where org_id = p_org;
end $$;

create or replace function public.admin_endereco_ler(p_org uuid)
returns table (cidade text, bairro text, rua text, numero text, cep text, lon double precision, lat double precision)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  return query select s.cidade, s.bairro, s.rua, s.numero, s.cep, s.lon, s.lat from public.stores s where s.org_id = p_org limit 1;
end $$;

revoke all on function public.admin_endereco_salvar(uuid, text, text, text, text, text, double precision, double precision), public.admin_endereco_ler(uuid) from public, anon;
grant execute on function public.admin_endereco_salvar(uuid, text, text, text, text, text, double precision, double precision), public.admin_endereco_ler(uuid) to authenticated;
