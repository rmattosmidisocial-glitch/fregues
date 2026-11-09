-- FREGUÊS · carga da base geográfica do estado do RJ
-- Municípios: IBGE, Malha Municipal 2024
-- Bairros: IBGE, Malha de Bairros do Censo 2022 (bairros legalmente instituídos pelas prefeituras)
-- Os arquivos ficam em public/geo/ do app, já simplificados e no formato abaixo:
--   municípios: properties { id (código IBGE 7 dígitos), nome }
--   bairros:    properties { id (código IBGE do bairro), nome, municipio, mun (código do município) }

create or replace function public.importar_geo(p_municipios jsonb, p_bairros jsonb)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare n_mun int; n_bai int;
begin
  insert into geo_municipios (cod_ibge, nome, uf, geom)
  select f->'properties'->>'id', f->'properties'->>'nome', 'RJ',
         st_multi(st_collectionextract(st_makevalid(st_setsrid(st_geomfromgeojson(f->>'geometry'), 4326)), 3))
  from jsonb_array_elements(p_municipios->'features') f
  on conflict (cod_ibge) do update set nome = excluded.nome, geom = excluded.geom;
  get diagnostics n_mun = row_count;

  insert into geo_bairros (id, nome, municipio_cod, municipio_nome, regiao, fonte, fonte_data, geom)
  select f->'properties'->>'id', trim(f->'properties'->>'nome'), f->'properties'->>'mun', f->'properties'->>'municipio',
         null, 'ibge_2022', date '2024-11-08',
         st_multi(st_collectionextract(st_makevalid(st_setsrid(st_geomfromgeojson(f->>'geometry'), 4326)), 3))
  from jsonb_array_elements(p_bairros->'features') f
  where exists (select 1 from geo_municipios m where m.cod_ibge = f->'properties'->>'mun')
  on conflict (id) do update set nome = excluded.nome, municipio_cod = excluded.municipio_cod,
    municipio_nome = excluded.municipio_nome, fonte = excluded.fonte, geom = excluded.geom;
  get diagnostics n_bai = row_count;

  return format('%s municípios e %s bairros carregados', n_mun, n_bai);
end $$;
revoke execute on function public.importar_geo(jsonb, jsonb) from public, anon, authenticated;

-- No Supabase: baixa os arquivos publicados junto com o app (ex.: https://fregues.vercel.app).
-- Requer a extensão "http" (disponível no Supabase).
create or replace function public.importar_geo_da_internet(p_base_url text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare m jsonb; b jsonb;
begin
  select content::jsonb into m from extensions.http_get(p_base_url || '/geo/municipios-rj.geojson');
  select content::jsonb into b from extensions.http_get(p_base_url || '/geo/bairros-rj-ibge2022.geojson');
  return importar_geo(m, b);
end $$;
revoke execute on function public.importar_geo_da_internet(text) from public, anon, authenticated;
