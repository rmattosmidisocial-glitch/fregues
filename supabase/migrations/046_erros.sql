-- 046 · Monitor de erros: o que quebra no navegador (painel, loja, admin) ou no servidor fica registrado
-- para o administrador ver agrupado. Sem dado pessoal: mensagem, tela, loja e navegador.

create table if not exists public.erros (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  origem text not null,
  mensagem text not null,
  pilha text,
  rota text,
  loja text,
  navegador text,
  versao text,
  user_id uuid,
  resolvido_em timestamptz
);
create index if not exists erros_recentes on public.erros (criado_em desc);
alter table public.erros enable row level security;
revoke all on public.erros from anon, authenticated;

-- qualquer tela pode registrar (inclusive a loja, sem login), com limite para não lotar
create or replace function public.registrar_erro(p_origem text, p_mensagem text, p_pilha text default null, p_rota text default null,
  p_loja text default null, p_navegador text default null, p_versao text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_mensagem), '') = '' then return; end if;
  if (select count(*) from public.erros where criado_em > now() - interval '1 minute') >= 120 then return; end if;
  insert into public.erros (origem, mensagem, pilha, rota, loja, navegador, versao, user_id)
  values (left(coalesce(p_origem, 'navegador'), 30), left(p_mensagem, 500), left(p_pilha, 2000), left(p_rota, 60),
          left(p_loja, 80), left(p_navegador, 200), left(p_versao, 40), auth.uid());
  -- limpeza: guarda 60 dias
  if random() < 0.02 then delete from public.erros where criado_em < now() - interval '60 days'; end if;
end $$;
revoke all on function public.registrar_erro(text, text, text, text, text, text, text) from public;
grant execute on function public.registrar_erro(text, text, text, text, text, text, text) to anon, authenticated, service_role;

-- O administrador vê os erros agrupados pela mensagem
create or replace function public.admin_erros(p_dias int default 7, p_resolvidos boolean default false)
returns table (origem text, mensagem text, vezes int, pessoas int, primeira timestamptz, ultima timestamptz,
  rotas text[], lojas text[], exemplo_pilha text, exemplo_navegador text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  return query
  select e.origem, e.mensagem, count(*)::int, count(distinct e.user_id)::int, min(e.criado_em), max(e.criado_em),
    (array_agg(distinct e.rota) filter (where e.rota is not null))[1:5],
    (array_agg(distinct e.loja) filter (where e.loja is not null))[1:5],
    (array_agg(e.pilha order by e.criado_em desc))[1],
    (array_agg(e.navegador order by e.criado_em desc))[1]
  from public.erros e
  where e.criado_em > now() - make_interval(days => greatest(1, least(coalesce(p_dias, 7), 60)))
    and (p_resolvidos or e.resolvido_em is null)
  group by e.origem, e.mensagem
  order by max(e.criado_em) desc
  limit 100;
end $$;

create or replace function public.admin_erro_resolver(p_origem text, p_mensagem text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform public.exigir_admin();
  update public.erros set resolvido_em = now() where origem = p_origem and mensagem = p_mensagem and resolvido_em is null;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.admin_erros(int, boolean), public.admin_erro_resolver(text, text) from public, anon;
grant execute on function public.admin_erros(int, boolean), public.admin_erro_resolver(text, text) to authenticated;
