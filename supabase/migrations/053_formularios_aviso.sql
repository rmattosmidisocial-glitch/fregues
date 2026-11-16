-- 053 · Respostas de formulário chegam na hora no painel e o cliente sabe que a loja vai confirmar

do $$ begin
  alter publication supabase_realtime add table public.form_respostas;
exception when undefined_object then null; when duplicate_object then null; end $$;

-- formulário novo já vem pedindo o ok da equipe (pode desligar em Perguntas)
alter table public.forms alter column confirmar set default true;

-- a página pública passa a saber se a loja confirma depois
create or replace function public.form_publico(p_slug text, p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', f.id, 'nome', f.nome, 'descricao', f.descricao, 'cor', f.cor, 'obrigado', f.obrigado,
                            'campos', f.campos, 'loja', s.nome, 'confirmar', f.confirmar)
  from forms f join stores s on s.id = f.store_id
  where s.slug = p_slug and f.id = p_id and f.estado = 'no ar';
$$;
revoke all on function public.form_publico(text, uuid) from public;
grant execute on function public.form_publico(text, uuid) to anon, authenticated;

-- o formulário que a Tô Brocado está usando para reservas passa a pedir o ok
update public.forms set confirmar = true where id = '86200fa4-240f-4a8a-847b-dda33dc3123d';
update public.form_respostas set situacao = 'confirmada' where form_id = '86200fa4-240f-4a8a-847b-dda33dc3123d' and situacao is null and origem = 'equipe';
update public.form_respostas set situacao = 'nova' where form_id = '86200fa4-240f-4a8a-847b-dda33dc3123d' and situacao is null;
