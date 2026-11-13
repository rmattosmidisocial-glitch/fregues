-- 021: Fregueses de verdade — cadastro manual, importação, etapa do quadro salva e observações.

alter table public.customers add column if not exists etapa text
  check (etapa is null or etapa in ('novo', 'voltando', 'fiel', 'esfriando', 'sumindo'));
alter table public.customers add column if not exists obs text;

-- Lista completa (inclui quem ainda não pediu pela loja). O customer_pulse continua igual para o Pulso.
create or replace view public.customer_lista with (security_invoker = true) as
select c.id, c.org_id, c.nome, c.telefone, b.nome as bairro, c.bairro_id, c.aniversario, c.tags, c.aceita_marketing,
       coalesce(p.canal, c.canal_origem, 'Loja própria') as canal,
       coalesce(p.pedidos, 0) as pedidos,
       coalesce(p.ticket, 0) as ticket,
       coalesce(p.gasto, 0) as gasto,
       coalesce(p.intervalo, 14) as intervalo,
       p.ultimo,
       coalesce(p.dias_desde, greatest(0, floor(extract(epoch from now() - c.created_at) / 86400))::int) as dias_desde,
       coalesce(p.status, 'ritmo') as status,
       coalesce(p.nivel, 'Visitante') as nivel,
       p.favorito, p.dow, p.hora,
       c.etapa, c.obs, c.created_at
from public.customers c
left join public.customer_pulse p on p.id = c.id
left join public.geo_bairros b on b.id = c.bairro_id;

grant select on public.customer_lista to authenticated;

-- Cadastra ou atualiza vários fregueses de uma vez (por telefone). Usado no "Novo freguês" e na importação.
-- p_lista = [{ nome, telefone, aniversario?, tags?, obs?, aceita_marketing?, canal? }]
create or replace function public.fregueses_salvar(p_store uuid, p_lista jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.store_org(p_store);
  v jsonb;
  v_tel text;
  v_n int := 0;
  v_aniv date;
begin
  if v_org is null or not public.is_member(v_org) then raise exception 'Sem permissão para esta loja'; end if;
  if jsonb_typeof(p_lista) <> 'array' then raise exception 'Lista inválida'; end if;
  if jsonb_array_length(p_lista) > 5000 then raise exception 'Importe no máximo 5.000 por vez'; end if;
  for v in select * from jsonb_array_elements(p_lista) loop
    v_tel := public.so_digitos(v->>'telefone');
    if length(v_tel) = 13 and left(v_tel, 2) = '55' then v_tel := substr(v_tel, 3); end if;
    if length(v_tel) not between 10 and 11 or length(btrim(coalesce(v->>'nome', ''))) < 1 then continue; end if;
    begin
      v_aniv := nullif(v->>'aniversario', '')::date;
    exception when others then
      v_aniv := null;
    end;
    insert into customers (org_id, nome, telefone, aniversario, tags, obs, aceita_marketing, aceita_marketing_em, canal_origem)
    values (v_org, left(btrim(v->>'nome'), 80), v_tel, v_aniv,
            coalesce(array(select jsonb_array_elements_text(coalesce(v->'tags', '[]'::jsonb))), '{}'),
            nullif(btrim(coalesce(v->>'obs', '')), ''),
            coalesce((v->>'aceita_marketing')::boolean, false),
            case when coalesce((v->>'aceita_marketing')::boolean, false) then now() end,
            coalesce(nullif(v->>'canal', ''), 'Salão'))
    on conflict (org_id, telefone) do update set
      nome = excluded.nome,
      aniversario = coalesce(excluded.aniversario, customers.aniversario),
      tags = case when cardinality(excluded.tags) > 0 then excluded.tags else customers.tags end,
      obs = coalesce(excluded.obs, customers.obs),
      aceita_marketing = customers.aceita_marketing or excluded.aceita_marketing,
      aceita_marketing_em = coalesce(customers.aceita_marketing_em, excluded.aceita_marketing_em);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

revoke all on function public.fregueses_salvar(uuid, jsonb) from public, anon;
grant execute on function public.fregueses_salvar(uuid, jsonb) to authenticated;
