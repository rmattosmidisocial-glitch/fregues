-- Cobrança automática pela Asaas.
-- O servidor (funções em /api na Vercel) cria o cliente e a assinatura na Asaas
-- e recebe os avisos de pagamento. Só ele chama cobranca_salvar e cobranca_evento.

alter table public.subscriptions add column if not exists documento text;
alter table public.subscriptions add column if not exists asaas_customer_id text;
alter table public.subscriptions add column if not exists asaas_subscription_id text unique;
alter table public.subscriptions add column if not exists link_pagamento text;
alter table public.subscriptions add column if not exists cobranca_auto boolean not null default false;

alter table public.invoices add column if not exists asaas_payment_id text unique;
alter table public.invoices add column if not exists link text;

-- O que o admin vê na ficha do cliente
create or replace function public.admin_cobranca(p_org uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.subscriptions;
begin
  perform public.exigir_admin();
  select * into s from public.subscriptions where org_id = p_org;
  return jsonb_build_object('ativa', coalesce(s.cobranca_auto, false), 'link', s.link_pagamento,
    'documento', s.documento, 'assinatura', s.asaas_subscription_id);
end $$;

-- Chamado pelo servidor depois de criar a assinatura na Asaas
create or replace function public.cobranca_salvar(p_org uuid, p_documento text, p_customer text, p_assinatura text, p_link text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.subscriptions set documento = p_documento, asaas_customer_id = p_customer, asaas_subscription_id = p_assinatura,
    link_pagamento = p_link, cobranca_auto = true, atualizado_em = now() where org_id = p_org;
  perform public.registrar_auditoria(p_org, 'ativou cobrança automática', jsonb_build_object('assinatura', p_assinatura));
end $$;

-- Cada aviso da Asaas sobre uma cobrança (criada, paga, vencida, estornada)
create or replace function public.cobranca_evento(
  p_assinatura text, p_pagamento text, p_valor numeric, p_vencimento date, p_situacao text, p_forma text, p_link text
) returns text language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_status text; v_comp date; f public.invoices;
begin
  select org_id into v_org from public.subscriptions where asaas_subscription_id = p_assinatura;
  if v_org is null then return 'assinatura desconhecida'; end if;

  v_status := case
    when p_situacao in ('RECEIVED','CONFIRMED','RECEIVED_IN_CASH') then 'paga'
    when p_situacao = 'OVERDUE' then 'atrasada'
    when p_situacao in ('REFUNDED','DELETED','REFUND_REQUESTED','CHARGEBACK_REQUESTED') then 'cancelada'
    else 'aberta' end;
  v_comp := date_trunc('month', p_vencimento)::date;

  -- a fatura daquele mês: a da Asaas, ou a manual do mesmo mês, que passa a ser dela
  select * into f from public.invoices where asaas_payment_id = p_pagamento;
  if f.id is null then
    select * into f from public.invoices where org_id = v_org and competencia = v_comp;
  end if;
  if f.id is null then
    insert into public.invoices (org_id, competencia, vencimento, valor, status, asaas_payment_id, link)
    values (v_org, v_comp, p_vencimento, p_valor, 'aberta', p_pagamento, p_link) returning * into f;
  else
    update public.invoices set asaas_payment_id = p_pagamento, link = coalesce(p_link, link), valor = p_valor, vencimento = p_vencimento
    where id = f.id returning * into f;
  end if;

  if v_status = 'paga' and f.status <> 'paga' then
    update public.invoices set status = 'paga', pago_em = now(), forma = case p_forma when 'PIX' then 'Pix' when 'CREDIT_CARD' then 'Cartão' when 'BOLETO' then 'Boleto' else p_forma end
    where id = f.id;
    update public.subscriptions set status = 'ativa', proximo_vencimento = (p_vencimento + interval '1 month')::date, atualizado_em = now()
    where org_id = v_org and status in ('teste','atrasada','ativa','suspensa');
    update public.stores set publicada = true where org_id = v_org;
    perform public.registrar_auditoria(v_org, 'pagamento confirmado pela Asaas', jsonb_build_object('valor', p_valor, 'forma', p_forma));
  elsif v_status = 'atrasada' and f.status = 'aberta' then
    update public.invoices set status = 'atrasada' where id = f.id;
    update public.subscriptions set status = 'atrasada', atualizado_em = now() where org_id = v_org and status in ('ativa','teste');
    perform public.registrar_auditoria(v_org, 'mensalidade venceu sem pagamento', jsonb_build_object('valor', p_valor));
  elsif v_status = 'cancelada' and f.status <> 'cancelada' then
    update public.invoices set status = 'cancelada' where id = f.id;
  end if;
  return v_status;
end $$;

revoke execute on function public.admin_cobranca(uuid) from public, anon;
grant execute on function public.admin_cobranca(uuid) to authenticated;
revoke execute on function public.cobranca_salvar(uuid, text, text, text, text), public.cobranca_evento(text, text, numeric, date, text, text, text) from public, anon, authenticated;
grant execute on function public.cobranca_salvar(uuid, text, text, text, text), public.cobranca_evento(text, text, numeric, date, text, text, text) to service_role;
