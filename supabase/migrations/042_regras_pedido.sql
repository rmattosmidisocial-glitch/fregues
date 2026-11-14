-- 042: o dono escolhe formas de pagamento, entrega/retirada, pedido mínimo da loja e taxa de embalagem.
alter table public.stores add column if not exists aceita_pix boolean not null default true;
alter table public.stores add column if not exists aceita_cartao boolean not null default true;
alter table public.stores add column if not exists aceita_dinheiro boolean not null default true;
alter table public.stores add column if not exists entrega_ativa boolean not null default true;
alter table public.stores add column if not exists retirada_ativa boolean not null default true;
alter table public.stores add column if not exists pedido_minimo_geral numeric(10,2) not null default 0 check (pedido_minimo_geral >= 0);
alter table public.stores add column if not exists taxa_embalagem numeric(10,2) not null default 0 check (taxa_embalagem >= 0);
alter table public.orders add column if not exists taxa_embalagem numeric(10,2) not null default 0;

create or replace function public.place_order(p_slug text, p jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_store stores;
  v_modo text := p->>'modo';
  v_tel text := so_digitos(p->'cliente'->>'telefone');
  v_nome text := left(trim(coalesce(p->'cliente'->>'nome', '')), 80);
  v_pag text := p->>'pagamento';
  v_cli uuid;
  v_item jsonb;
  v_prod products;
  v_grupo option_groups;
  v_esc uuid[];
  v_qtd int;
  v_unit numeric;
  v_sub numeric := 0;
  v_taxa numeric := 0;
  v_desc numeric := 0;
  v_entrega jsonb;
  v_ponto geometry;
  v_order orders;
  v_linhas jsonb := '[]';
  v_nomes_esc jsonb;
  v_cnt int;
  v_emb numeric := 0;
begin
  select * into v_store from stores where slug = p_slug and publicada;
  if v_store.id is null then raise exception 'Loja não encontrada'; end if;
  if not v_store.aberta then raise exception 'A loja está fechada agora'; end if;
  if v_modo not in ('entrega', 'retirada', 'mesa') then raise exception 'Modo de pedido inválido'; end if;
  if v_pag not in ('pix', 'cartao', 'dinheiro', 'maquininha') then raise exception 'Forma de pagamento inválida'; end if;
  -- o que a loja aceita (Configurações do dono)
  if v_modo = 'entrega' and not v_store.entrega_ativa then raise exception 'Esta loja não está fazendo entregas agora'; end if;
  if v_modo = 'retirada' and not v_store.retirada_ativa then raise exception 'Esta loja não está aceitando retirada agora'; end if;
  if v_modo in ('entrega', 'retirada') then
    if v_pag = 'pix' and (not v_store.aceita_pix or (coalesce(v_store.pix_chave, '') = '' and not v_store.demonstracao)) then raise exception 'Esta loja não aceita Pix pelo site'; end if;
    if v_pag in ('cartao', 'maquininha') and not v_store.aceita_cartao then raise exception 'Esta loja não aceita cartão'; end if;
    if v_pag = 'dinheiro' and not v_store.aceita_dinheiro then raise exception 'Esta loja não aceita dinheiro'; end if;
  end if;
  if length(v_tel) not between 10 and 11 then raise exception 'Informe um telefone com DDD'; end if;
  if length(v_nome) < 2 then raise exception 'Informe seu nome'; end if;
  if jsonb_typeof(p->'itens') <> 'array' or jsonb_array_length(p->'itens') = 0 then raise exception 'A sacola está vazia'; end if;
  if jsonb_array_length(p->'itens') > 30 then raise exception 'Itens demais em um pedido'; end if;

  -- Itens: preço sempre recalculado aqui, nunca confiamos no navegador
  for v_item in select * from jsonb_array_elements(p->'itens') loop
    select * into v_prod from products where id = (v_item->>'product_id')::uuid and store_id = v_store.id;
    if v_prod.id is null then raise exception 'Produto não encontrado'; end if;
    if v_prod.esgotado then raise exception '% esgotou agora há pouco', v_prod.nome; end if;
    v_qtd := coalesce((v_item->>'qtd')::int, 1);
    if v_qtd not between 1 and 50 then raise exception 'Quantidade inválida'; end if;
    v_esc := coalesce(array(select jsonb_array_elements_text(coalesce(v_item->'escolhas', '[]'))::uuid), '{}');

    -- toda escolha precisa ser deste produto
    if exists (select 1 from unnest(v_esc) e where not exists (
      select 1 from options o join option_groups g on g.id = o.group_id where o.id = e and g.product_id = v_prod.id)) then
      raise exception 'Opção inválida em %', v_prod.nome;
    end if;
    for v_grupo in select * from option_groups where product_id = v_prod.id loop
      select count(*) into v_cnt from options o where o.group_id = v_grupo.id and o.id = any(v_esc);
      if v_cnt < v_grupo.min then raise exception 'Escolha “%” em %', v_grupo.nome, v_prod.nome; end if;
      if v_cnt > v_grupo.max then raise exception 'Escolhas demais em “%”', v_grupo.nome; end if;
    end loop;

    v_unit := coalesce(v_prod.preco_promo, v_prod.preco) + coalesce((select sum(o.preco) from options o where o.id = any(v_esc)), 0);
    select coalesce(jsonb_agg(o.nome order by g.ordem, o.ordem), '[]') into v_nomes_esc
      from options o join option_groups g on g.id = o.group_id where o.id = any(v_esc);
    v_sub := v_sub + v_unit * v_qtd;
    v_linhas := v_linhas || jsonb_build_object('product_id', v_prod.id, 'nome', v_prod.nome, 'qtd', v_qtd, 'unit', v_unit,
                                              'escolhas', v_nomes_esc, 'obs', left(v_item->>'obs', 200));
  end loop;

  -- Entrega: o ponto no mapa decide bairro, zona e taxa
  if v_modo = 'entrega' then
    if p->'ponto' is null then raise exception 'Marque o endereço no mapa'; end if;
    v_ponto := st_setsrid(st_makepoint((p->'ponto'->>'lon')::float8, (p->'ponto'->>'lat')::float8), 4326);
    v_entrega := resolve_delivery(v_store.id, st_x(v_ponto), st_y(v_ponto));
    if not (v_entrega->>'atende')::boolean then
      insert into out_of_area_leads (store_id, bairro_id, telefone, aceita_aviso, ponto)
      values (v_store.id, v_entrega->>'bairro_id', v_tel, coalesce((p->>'avisar_quando_atender')::boolean, false), v_ponto);
      -- não usamos exceção aqui para o registro da procura não ser desfeito
      return jsonb_build_object('erro', 'Ainda não entregamos em ' || coalesce(v_entrega->>'bairro', 'esse endereço'),
                                'fora_da_area', true, 'bairro', v_entrega->>'bairro');
    end if;
    if v_sub < (v_entrega->>'pedido_minimo')::numeric then
      raise exception 'Pedido mínimo para % é R$ %', v_entrega->>'bairro', to_char((v_entrega->>'pedido_minimo')::numeric, 'FM999G990D00');
    end if;
    v_taxa := case when (v_entrega->>'gratis_acima') is not null and v_sub >= (v_entrega->>'gratis_acima')::numeric then 0
                   else (v_entrega->>'taxa')::numeric end;
    if coalesce(trim(p->'endereco'->>'numero'), '') = '' then raise exception 'Informe o número do endereço'; end if;
  end if;

  -- pedido mínimo da loja e embalagem
  if v_modo in ('entrega', 'retirada') then
    if v_sub < coalesce(v_store.pedido_minimo_geral, 0) then
      raise exception 'O pedido mínimo da loja é R$ %', to_char(v_store.pedido_minimo_geral, 'FM999G990D00');
    end if;
    v_emb := coalesce(v_store.taxa_embalagem, 0);
  end if;

  -- Cliente: cria ou atualiza pelo telefone
  insert into customers (org_id, nome, telefone, bairro_id, aceita_marketing, aceita_marketing_em, canal_origem)
  values (v_store.org_id, v_nome, v_tel, v_entrega->>'bairro_id', coalesce((p->'cliente'->>'aceita_marketing')::boolean, false),
          case when coalesce((p->'cliente'->>'aceita_marketing')::boolean, false) then now() end, 'Loja própria')
  on conflict (org_id, telefone) do update set
    nome = excluded.nome,
    bairro_id = coalesce(excluded.bairro_id, customers.bairro_id),
    aceita_marketing = customers.aceita_marketing or excluded.aceita_marketing,
    aceita_marketing_em = coalesce(customers.aceita_marketing_em, excluded.aceita_marketing_em)
  returning id into v_cli;

  if coalesce((p->>'usar_cashback')::boolean, false) then
    v_desc := least(cashback_saldo_interno(v_store.org_id, v_store.id, v_cli), v_sub);
  end if;

  insert into orders (store_id, customer_id, modo, mesa, bairro_id, zone_id, endereco, ponto, subtotal, taxa_entrega, taxa_embalagem, desconto, total,
                      pagamento, pago, troco_para, observacao, utm)
  values (v_store.id, v_cli, v_modo, p->>'mesa', v_entrega->>'bairro_id', (v_entrega->>'zona_id')::uuid,
          case when v_modo = 'entrega' then jsonb_build_object(
            'rua', left(p->'endereco'->>'rua', 120), 'numero', left(p->'endereco'->>'numero', 20),
            'complemento', left(p->'endereco'->>'complemento', 160), 'bairro', v_entrega->>'bairro') end,
          v_ponto, round(v_sub, 2), v_taxa, v_emb, round(v_desc, 2), round(v_sub + v_taxa + v_emb - v_desc, 2),
          v_pag, false, nullif(p->>'troco_para', '')::numeric, left(p->>'observacao', 300), p->'utm')
  returning * into v_order;

  insert into order_items (order_id, product_id, nome, qtd, unit, escolhas, obs)
  select v_order.id, (l->>'product_id')::uuid, l->>'nome', (l->>'qtd')::int, (l->>'unit')::numeric, l->'escolhas', l->>'obs'
  from jsonb_array_elements(v_linhas) l;

  return jsonb_build_object('id', v_order.id, 'numero', v_order.numero, 'total', v_order.total, 'desconto', v_order.desconto,
                            'taxa', v_order.taxa_entrega, 'embalagem', v_order.taxa_embalagem, 'status', v_order.status,
                            'tempo_min', coalesce((v_entrega->>'tempo_min')::int, 15), 'tempo_max', coalesce((v_entrega->>'tempo_max')::int, 25));
end $$;
