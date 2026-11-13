-- Mensagens automáticas e respostas rápidas editáveis pelo dono.
alter table public.ai_settings add column if not exists respostas jsonb not null default '{}'::jsonb;
alter table public.ai_settings add column if not exists atalhos jsonb not null default '[]'::jsonb;

create or replace function public.chat_config(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('nome', coalesce(a.nome_atendente, 'Bia'), 'tom', coalesce(a.tom, 'amigavel'), 'emojis', coalesce(a.emojis, true),
    'recomendar', coalesce(a.recomendar, true), 'passar_reclamacao', coalesce(a.passar_reclamacao, true), 'respostas', coalesce(a.respostas, '{}'::jsonb))
  from public.stores s left join public.ai_settings a on a.store_id = s.id where s.slug = p_slug and s.publicada;
$$;
