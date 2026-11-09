-- Recria a loja de demonstração todo dia às 4h (horário de Brasília), se o pg_cron estiver ativo.
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('fregues-resetar-demo', '0 7 * * *', 'select public.resetar_demo()');
  end if;
end $$;
