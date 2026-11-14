-- 044: salão (serviço e couvert padrão), equipe com papéis, minha assinatura, cancelamento, troca de senha por link.

-- ---------- 13. Salão: valores padrão da casa ----------
alter table public.stores add column if not exists servico_padrao numeric(4,1) not null default 10 check (servico_padrao between 0 and 30);
alter table public.stores add column if not exists couvert_padrao numeric(10,2) not null default 0 check (couvert_padrao >= 0);
create or replace function public.comanda_padroes() returns trigger language plpgsql security definer set search_path = public as $$
begin
  select servico_padrao, couvert_padrao into new.taxa_servico, new.couvert from stores where id = new.store_id;
  new.taxa_servico := coalesce(new.taxa_servico, 10);
  new.couvert := coalesce(new.couvert, 0);
  return new;
end $$;
drop trigger if exists comanda_padroes on public.tabs;
create trigger comanda_padroes before insert on public.tabs for each row execute function public.comanda_padroes();

-- ---------- 14. Equipe: papel de cada login na loja ----------
create or replace function public.meu_papel(p_org uuid) returns text
language sql stable security definer set search_path = public as $$
  select role from memberships where org_id = p_org and user_id = auth.uid();
$$;
grant execute on function public.meu_papel(uuid) to authenticated;

-- só dono e gerente mudam as configurações da loja
drop policy if exists store_editar on public.stores;
create policy store_editar on public.stores for update to authenticated
  using (public.meu_papel(org_id) in ('dono', 'gerente')) with check (public.meu_papel(org_id) in ('dono', 'gerente'));

-- abrir/fechar a loja também vale para o caixa
create or replace function public.loja_ligar(p_store uuid, p_ligada boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.meu_papel(public.store_org(p_store)), '') not in ('dono', 'gerente', 'caixa') then raise exception 'Sem permissão'; end if;
  update stores set aberta = p_ligada where id = p_store;
end $$;
grant execute on function public.loja_ligar(uuid, boolean) to authenticated;

create or replace function public.equipe_listar(p_store uuid)
returns table (user_id uuid, email text, papel text, ultimo_login timestamptz, provisoria boolean)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if coalesce(public.meu_papel(public.store_org(p_store)), '') not in ('dono', 'gerente') then raise exception 'Só o dono vê a equipe'; end if;
  return query select u.id, u.email::text, m.role, u.last_sign_in_at, coalesce((u.raw_user_meta_data->>'trocar_senha')::boolean, false)
    from memberships m join auth.users u on u.id = m.user_id where m.org_id = public.store_org(p_store)
    order by m.role = 'dono' desc, u.email;
end $$;
grant execute on function public.equipe_listar(uuid) to authenticated;

create or replace function public.equipe_mudar(p_store uuid, p_user uuid, p_papel text) returns void
language plpgsql security definer set search_path = public as $$
declare v_org uuid := public.store_org(p_store);
begin
  if public.meu_papel(v_org) is distinct from 'dono' then raise exception 'Só o dono muda a equipe'; end if;
  if p_user = auth.uid() then raise exception 'Você não pode mudar o seu próprio acesso'; end if;
  if p_papel is null then
    delete from memberships where org_id = v_org and user_id = p_user;
  else
    if p_papel not in ('gerente', 'caixa', 'cozinha', 'garcom', 'entregador') then raise exception 'Função inválida'; end if;
    update memberships set role = p_papel where org_id = v_org and user_id = p_user;
  end if;
end $$;
grant execute on function public.equipe_mudar(uuid, uuid, text) to authenticated;

-- vínculo de um login novo à loja (chamado pelo servidor, que confere se quem pediu é o dono)
create or replace function public.equipe_vincular_srv(p_org uuid, p_user uuid, p_papel text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into memberships (org_id, user_id, role) values (p_org, p_user, p_papel)
  on conflict (org_id, user_id) do update set role = excluded.role where memberships.role <> 'dono';
end $$;
revoke all on function public.equipe_vincular_srv(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.equipe_vincular_srv(uuid, uuid, text) to service_role;

-- ---------- 15. Minha assinatura: faturas do restaurante ----------
create or replace function public.minhas_faturas()
returns table (id uuid, competencia date, vencimento date, valor numeric, status text, pago_em timestamptz, link text)
language sql stable security definer set search_path = public as $$
  select i.id, i.competencia, i.vencimento, i.valor, i.status, i.pago_em, i.link
  from invoices i where public.meu_papel(i.org_id) = 'dono' order by i.competencia desc limit 24;
$$;
grant execute on function public.minhas_faturas() to authenticated;

-- ---------- 17. Encerrar conta: pedido de cancelamento ----------
alter table public.subscriptions add column if not exists cancelamento_pedido_em timestamptz;
alter table public.subscriptions add column if not exists cancelamento_motivo text;
create or replace function public.pedir_cancelamento(p_motivo text) returns void
language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select org_id into v_org from memberships where user_id = auth.uid() and role = 'dono' limit 1;
  if v_org is null then raise exception 'Só o dono pode pedir o cancelamento'; end if;
  update subscriptions set cancelamento_pedido_em = now(), cancelamento_motivo = left(p_motivo, 500) where org_id = v_org;
  insert into admin_audit (admin_id, org_id, acao, detalhe) values (auth.uid(), v_org, 'dono pediu cancelamento', jsonb_build_object('motivo', left(p_motivo, 500)));
end $$;
grant execute on function public.pedir_cancelamento(text) to authenticated;

-- ---------- 18. Esqueci minha senha: link de uso único ----------
create table if not exists public.senha_links (
  token_hash text primary key,
  user_id uuid not null,
  expira_em timestamptz not null,
  usado_em timestamptz
);
alter table public.senha_links enable row level security;
revoke all on public.senha_links from anon, authenticated;
