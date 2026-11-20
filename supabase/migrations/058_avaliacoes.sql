-- 058: avaliação depois da entrega. O cliente dá de 1 a 5 estrelas (e um comentário) no próprio
-- acompanhamento do pedido ou pelo link que a loja manda no WhatsApp. A nota da loja passa a
-- ser a média dessas avaliações.

create table if not exists public.order_reviews (
  order_id uuid primary key references public.orders(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  nota smallint not null check (nota between 1 and 5),
  comentario text check (comentario is null or char_length(comentario) <= 500),
  criado_em timestamptz not null default now()
);
create index if not exists order_reviews_loja on public.order_reviews (store_id, criado_em desc);

alter table public.order_reviews enable row level security;
drop policy if exists avaliacoes_loja_ler on public.order_reviews;
create policy avaliacoes_loja_ler on public.order_reviews for select to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and public.is_member(s.org_id)));

-- O cliente não tem login: quem tem o código do pedido (o mesmo do acompanhamento) pode avaliar uma vez.
create or replace function public.avaliar_pedido(p_id uuid, p_nota int, p_comentario text default null)
returns text language plpgsql security definer set search_path = public as $$
declare o record;
begin
  if p_nota is null or p_nota < 1 or p_nota > 5 then return 'nota_invalida'; end if;
  select id, store_id, status, created_at into o from orders where id = p_id;
  if o.id is null then return 'nao_encontrado'; end if;
  if o.status <> 'entregue' then return 'ainda_nao_entregue'; end if;
  if o.created_at < now() - interval '15 days' then return 'prazo_encerrado'; end if;
  insert into order_reviews (order_id, store_id, nota, comentario)
  values (o.id, o.store_id, p_nota, nullif(left(trim(coalesce(p_comentario, '')), 500), ''))
  on conflict (order_id) do nothing;
  if not found then return 'ja_avaliado'; end if;
  -- a nota pública da loja vira a média real (a loja de demonstração mantém os números de exemplo)
  update stores s set nota = r.media, avaliacoes = r.qtd
  from (select round(avg(nota)::numeric, 1) as media, count(*)::int as qtd from order_reviews where store_id = o.store_id) r
  where s.id = o.store_id and not coalesce(s.demonstracao, false);
  return 'ok';
end $$;

-- Para o acompanhamento saber se já avaliou (devolve a nota dada ou nulo).
create or replace function public.avaliacao_do_pedido(p_id uuid)
returns int language sql stable security definer set search_path = public as $$
  select nota::int from order_reviews where order_id = p_id
$$;

grant execute on function public.avaliar_pedido(uuid, int, text) to anon, authenticated;
grant execute on function public.avaliacao_do_pedido(uuid) to anon, authenticated;
