-- 061: data de aniversário do cliente na loja online e na mesa (o garçom anota).
-- Guardamos só dia e mês (o ano fica 2000); nunca sobrescreve uma data que o cliente já tem.

alter table public.tabs add column if not exists aniversario date;

-- Mesa: quando a comanda fecha e vira cliente, a data anotada vai para o cadastro dele
create or replace function public._tab_aniversario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.aniversario is not null and new.customer_id is not null then
    update customers set aniversario = new.aniversario where id = new.customer_id and aniversario is null;
  end if;
  return new;
end $$;
drop trigger if exists tab_aniversario on public.tabs;
create trigger tab_aniversario after update of customer_id, aniversario on public.tabs
  for each row execute function public._tab_aniversario();

-- Loja online: logo depois do pedido, o cliente informa dia e mês (opcional)
create or replace function public.cliente_aniversario(p_order uuid, p_dia int, p_mes int) returns text
language plpgsql security definer set search_path = public as $$
declare v_data date;
begin
  begin
    v_data := make_date(2000, p_mes, p_dia);
  exception when others then
    return 'data_invalida';
  end;
  update customers c set aniversario = v_data
  from orders o
  where o.id = p_order and c.id = o.customer_id and c.aniversario is null and o.created_at > now() - interval '2 hours';
  return 'ok';
end $$;
grant execute on function public.cliente_aniversario(uuid, int, int) to anon, authenticated;
