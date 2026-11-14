-- 035: zona por distância. "Até 5 km" = entrega em tudo até 5 km (linha reta) do restaurante,
-- e nenhum ponto além disso entra nessa zona, mesmo que o bairro esteja pintado.
alter table public.delivery_zones add column if not exists raio_km numeric(6,2) check (raio_km is null or raio_km > 0);

-- zonas que já se chamam "Até N km" ganham o raio
update public.delivery_zones set raio_km = replace(substring(nome from '(\d+(?:[.,]\d+)?)\s*[kK][mM]'), ',', '.')::numeric
 where raio_km is null and nome ~* '\d+([.,]\d+)?\s*km';

create or replace function public.resolve_delivery(p_store uuid, p_lon double precision, p_lat double precision)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_pt geometry := st_setsrid(st_makepoint(p_lon, p_lat), 4326);
  v_loja geometry;
  v_dist numeric;
  v_bairro record;
  v_mun record;
  v_zona record;
begin
  select z.* into v_zona from delivery_zones z where false;  -- começa sem zona (registro com campos nulos)
  select localizacao into v_loja from stores where id = p_store;
  if v_loja is not null then
    v_dist := round((st_distance(v_loja::geography, v_pt::geography) / 1000)::numeric, 2);
  end if;
  select b.id, b.nome, b.municipio_nome into v_bairro from geo_bairros b where st_contains(b.geom, v_pt) limit 1;
  select m.cod_ibge, m.nome into v_mun from geo_municipios m where st_contains(m.geom, v_pt) limit 1;

  -- 1) bairro pintado numa zona
  if v_bairro.id is not null then
    select z.* into v_zona from zone_bairros zb join delivery_zones z on z.id = zb.zone_id
    where zb.store_id = p_store and zb.bairro_id = v_bairro.id;
  end if;
  -- 2) município inteiro numa zona
  if v_zona.id is null and v_mun.cod_ibge is not null then
    select z.* into v_zona from zone_municipios zm join delivery_zones z on z.id = zm.zone_id
    where zm.store_id = p_store and zm.municipio_cod = v_mun.cod_ibge;
  end if;
  -- a zona achada tem limite de km e o ponto passa dele: não vale
  if v_zona.id is not null and v_zona.raio_km is not null and v_dist is not null and v_dist > v_zona.raio_km then
    select z.* into v_zona from delivery_zones z where false;
  end if;
  -- 3) zona por distância (a menor que alcança o ponto)
  if v_zona.id is null and v_dist is not null then
    select z.* into v_zona from delivery_zones z
    where z.store_id = p_store and z.raio_km is not null and v_dist <= z.raio_km
    order by z.raio_km limit 1;
  end if;

  return jsonb_build_object(
    'atende', v_zona.id is not null,
    'bairro_id', v_bairro.id,
    'bairro', coalesce(v_bairro.nome, v_mun.nome),
    'municipio', coalesce(v_bairro.municipio_nome, v_mun.nome),
    'distancia_km', v_dist,
    'zona_id', v_zona.id,
    'zona', v_zona.nome,
    'taxa', v_zona.taxa,
    'tempo_min', v_zona.tempo_min,
    'tempo_max', v_zona.tempo_max,
    'pedido_minimo', v_zona.pedido_minimo,
    'gratis_acima', v_zona.gratis_acima
  );
end $$;
