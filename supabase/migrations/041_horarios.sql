-- 041: horário de funcionamento automático, pausa rápida e tempo extra ("cozinha cheia").
alter table public.stores add column if not exists horarios jsonb;
alter table public.stores add column if not exists pausa_ate timestamptz;
alter table public.stores add column if not exists extra_min int not null default 0 check (extra_min between 0 and 180);
alter table public.stores add column if not exists extra_ate timestamptz;

create or replace function public.loja_aberta_agora(p_store uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  s record;
  agora timestamp := now() at time zone 'America/Sao_Paulo';
  dia int := extract(dow from agora)::int;
  hm time := agora::time;
  f jsonb; ini time; fim time;
begin
  select aberta, horarios, pausa_ate into s from stores where id = p_store;
  if not found or not s.aberta then return false; end if;
  if s.pausa_ate is not null and s.pausa_ate > now() then return false; end if;
  if s.horarios is null or not exists (select 1 from jsonb_each(s.horarios) e where jsonb_array_length(e.value) > 0) then return true; end if;
  for f in select * from jsonb_array_elements(coalesce(s.horarios -> dia::text, '[]'::jsonb)) loop
    ini := (f->>0)::time; fim := (f->>1)::time;
    if (fim > ini and hm >= ini and hm < fim) or (fim <= ini and hm >= ini) then return true; end if;
  end loop;
  for f in select * from jsonb_array_elements(coalesce(s.horarios -> ((dia + 6) % 7)::text, '[]'::jsonb)) loop
    ini := (f->>0)::time; fim := (f->>1)::time;
    if fim <= ini and hm < fim then return true; end if;
  end loop;
  return false;
end $$;
grant execute on function public.loja_aberta_agora(uuid) to anon, authenticated;

-- pedido pela loja online só entra com a loja aberta (horário, pausa e botão)
create or replace function public.pedido_loja_aberta() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.modo in ('entrega', 'retirada') and coalesce(new.canal, 'Loja própria') = 'Loja própria' and not public.loja_aberta_agora(new.store_id) then
    raise exception 'A loja está fechada agora';
  end if;
  return new;
end $$;
drop trigger if exists pedido_loja_aberta on public.orders;
create trigger pedido_loja_aberta before insert on public.orders for each row execute function public.pedido_loja_aberta();
