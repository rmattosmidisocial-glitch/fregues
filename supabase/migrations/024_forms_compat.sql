-- 024: a tabela forms já existia (006) com criado_em; acrescenta as colunas que o painel novo usa.
alter table public.forms add column if not exists created_at timestamptz not null default now();
alter table public.forms add column if not exists updated_at timestamptz not null default now();
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'forms' and column_name = 'criado_em') then
    execute 'update public.forms set created_at = criado_em where created_at > criado_em';
  end if;
end $$;
alter table public.forms alter column descricao set default '';
update public.forms set descricao = '' where descricao is null;
