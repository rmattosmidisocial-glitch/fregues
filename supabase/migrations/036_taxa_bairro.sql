-- 036: taxa de entrega própria para um bairro (vale no lugar da taxa da zona).
alter table public.zone_bairros add column if not exists taxa numeric(8,2) check (taxa is null or taxa >= 0);

create or replace function public.resolve_delivery(p_store uuid, p_lon double precision, p_lat double precision)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_pt geometry := st_setsrid(st_makepoint(p_lon, p_lat), 4326);
  v_loja geometry;
  v_dist numeric;
  v_bairro record;
  v_mun record;
  v_zona record;
  v_taxa_bairro numeric;
begin
  select z.* into v_zona from delivery_zones z where false;  -- começa sem zona
  select localizacao into v_loja from stores where id = p_store;
  if v_loja is not null then
    v_dist := round((st_distance(v_loja::geography, v_pt::geography) / 1000)::numeric, 2);
  end if;
  select b.id, b.nome, b.municipio_nome into v_bairro from geo_bairros b where st_contains(b.geom, v_pt) limit 1;
  select m.cod_ibge, m.nome into v_mun from geo_municipios m where st_contains(m.geom, v_pt) limit 1;

  -- 1) bairro marcado numa zona (pode ter taxa própria)
  if v_bairro.id is not null then
    select z.* into v_zona from zone_bairros zb join delivery_zones z on z.id = zb.zone_id
    where zb.store_id = p_store and zb.bairro_id = v_bairro.id;
    select zb.taxa into v_taxa_bairro from zone_bairros zb where zb.store_id = p_store and zb.bairro_id = v_bairro.id;
  end if;
  -- 2) município inteiro numa zona
  if v_zona.id is null and v_mun.cod_ibge is not null then
    select z.* into v_zona from zone_municipios zm join delivery_zones z on z.id = zm.zone_id
    where zm.store_id = p_store and zm.municipio_cod = v_mun.cod_ibge;
  end if;
  -- a zona tem limite de km e o ponto passa dele: não vale
  if v_zona.id is not null and v_zona.raio_km is not null and v_dist is not null and v_dist > v_zona.raio_km then
    select z.* into v_zona from delivery_zones z where false;
    v_taxa_bairro := null;
  end if;
  -- 3) zona por distância, só onde o IBGE não tem bairro (nos outros lugares vale o bairro marcado)
  if v_zona.id is null and v_dist is not null and v_bairro.id is null then
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
    'taxa', coalesce(v_taxa_bairro, v_zona.taxa),
    'tempo_min', v_zona.tempo_min,
    'tempo_max', v_zona.tempo_max,
    'pedido_minimo', v_zona.pedido_minimo,
    'gratis_acima', v_zona.gratis_acima
  );
end $$;
