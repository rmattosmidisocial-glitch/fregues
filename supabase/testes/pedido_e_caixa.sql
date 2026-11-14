-- Teste automático do pedido e do caixa, no banco de verdade, SEM deixar rastro:
-- tudo roda dentro de um bloco que termina com erro de propósito, e o banco desfaz tudo.
-- Rode no Supabase (SQL Editor). Resultado esperado: "TESTES_OK ...". Qualquer outra mensagem = algo quebrou.
do $$
declare
  v_store stores;
  v_prod products;
  v_membro uuid;
  v_preco numeric;
  r jsonb;
  v_caixa uuid;
  v_falhou text;
  n int := 0;
begin
  -- loja de demonstração, aberta, sem horário, aceitando retirada e dinheiro, embalagem R$ 2
  select * into v_store from stores where slug = 'brasa-burger';
  if v_store.id is null then raise exception 'FALHOU: loja de demonstração não existe'; end if;
  update stores set publicada = true, aberta = true, horarios = null, pausa_ate = null, retirada_ativa = true, entrega_ativa = true,
    aceita_dinheiro = true, aceita_cartao = true, aceita_pix = true, taxa_embalagem = 2, pedido_minimo_geral = 0, cashback_ativo = false
  where id = v_store.id;

  -- um produto sem escolha obrigatória
  select p.* into v_prod from products p where p.store_id = v_store.id and not p.esgotado
    and not exists (select 1 from option_groups g where g.product_id = p.id and g.min > 0) order by p.preco limit 1;
  if v_prod.id is null then raise exception 'FALHOU: nenhum produto simples na demonstração'; end if;
  v_preco := coalesce(v_prod.preco_promo, v_prod.preco);

  -- 1. pedido de retirada: total = preço × 2 + embalagem
  r := place_order('brasa-burger', jsonb_build_object('modo', 'retirada', 'pagamento', 'dinheiro', 'troco_para', 100,
    'cliente', jsonb_build_object('nome', 'Teste Automático', 'telefone', '21900000001'),
    'itens', jsonb_build_array(jsonb_build_object('product_id', v_prod.id, 'qtd', 2))));
  if (r->>'total')::numeric <> v_preco * 2 + 2 then raise exception 'FALHOU 1: total % (esperado %)', r->>'total', v_preco * 2 + 2; end if;
  n := n + 1;

  -- 2. preço mandado pelo navegador é ignorado (o banco recalcula)
  r := place_order('brasa-burger', jsonb_build_object('modo', 'retirada', 'pagamento', 'dinheiro',
    'cliente', jsonb_build_object('nome', 'Teste Automático', 'telefone', '21900000001'),
    'itens', jsonb_build_array(jsonb_build_object('product_id', v_prod.id, 'qtd', 1, 'unit', 0.01, 'preco', 0.01))));
  if (r->>'total')::numeric <> v_preco + 2 then raise exception 'FALHOU 2: aceitou preço do navegador (total %)', r->>'total'; end if;
  n := n + 1;

  -- 3. forma de pagamento desligada é recusada
  update stores set aceita_dinheiro = false where id = v_store.id;
  v_falhou := null;
  begin
    perform place_order('brasa-burger', jsonb_build_object('modo', 'retirada', 'pagamento', 'dinheiro',
      'cliente', jsonb_build_object('nome', 'Teste Automático', 'telefone', '21900000001'),
      'itens', jsonb_build_array(jsonb_build_object('product_id', v_prod.id, 'qtd', 1))));
    v_falhou := 'aceitou dinheiro desligado';
  exception when others then
    if sqlerrm not like '%não aceita dinheiro%' then v_falhou := 'mensagem errada: ' || sqlerrm; end if;
  end;
  if v_falhou is not null then raise exception 'FALHOU 3: %', v_falhou; end if;
  update stores set aceita_dinheiro = true where id = v_store.id;
  n := n + 1;

  -- 4. loja fechada não recebe pedido
  update stores set aberta = false where id = v_store.id;
  v_falhou := null;
  begin
    perform place_order('brasa-burger', jsonb_build_object('modo', 'retirada', 'pagamento', 'pix',
      'cliente', jsonb_build_object('nome', 'Teste Automático', 'telefone', '21900000001'),
      'itens', jsonb_build_array(jsonb_build_object('product_id', v_prod.id, 'qtd', 1))));
    v_falhou := 'pedido entrou com a loja fechada';
  exception when others then null;
  end;
  if v_falhou is not null then raise exception 'FALHOU 4: %', v_falhou; end if;
  update stores set aberta = true where id = v_store.id;
  n := n + 1;

  -- 5. sacola vazia e telefone sem DDD são recusados
  begin
    perform place_order('brasa-burger', jsonb_build_object('modo', 'retirada', 'pagamento', 'pix',
      'cliente', jsonb_build_object('nome', 'Teste', 'telefone', '9999'), 'itens', '[]'::jsonb));
    raise exception 'FALHOU 5: aceitou pedido inválido';
  exception when others then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;
  n := n + 1;

  -- CAIXA: entra como alguém da equipe da loja
  select m.user_id into v_membro from memberships m where m.org_id = v_store.org_id limit 1;
  if v_membro is null then raise exception 'FALHOU: loja de demonstração sem equipe'; end if;
  perform set_config('request.jwt.claim.sub', v_membro::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_membro, 'role', 'authenticated')::text, true);
  update cash_sessions set status = 'fechado', fechado_em = now() where store_id = v_store.id and status = 'aberto';

  -- 6. abre com R$ 100, vende no balcão R$ (preço × 3) pagando com R$ 200 em dinheiro: troco sai do dinheiro
  v_caixa := caixa_abrir(v_store.id, 100, 'Teste');
  r := venda_balcao(v_store.id, jsonb_build_array(jsonb_build_object('produto', v_prod.id, 'qtd', 3)),
    jsonb_build_array(jsonb_build_object('forma', 'dinheiro', 'valor', 200)));
  r := caixa_resumo(v_caixa);
  if (r->>'total')::numeric <> v_preco * 3 then raise exception 'FALHOU 6: total do caixa % (esperado %)', r->>'total', v_preco * 3; end if;
  if (r->'por_forma'->>'dinheiro')::numeric <> v_preco * 3 then raise exception 'FALHOU 6: dinheiro % (troco não saiu)', r->'por_forma'->>'dinheiro'; end if;
  n := n + 1;

  -- 7. retirada de R$ 30 e reforço de R$ 10: esperado = 100 + vendas em dinheiro + 10 − 30
  perform caixa_movimento(v_caixa, 'retirada', 30, 'teste');
  perform caixa_movimento(v_caixa, 'reforco', 10, 'teste');
  r := caixa_resumo(v_caixa);
  if (r->>'dinheiro_esperado')::numeric <> 100 + v_preco * 3 + 10 - 30 then raise exception 'FALHOU 7: esperado na gaveta %', r->>'dinheiro_esperado'; end if;
  n := n + 1;

  -- 8. pagamento menor que o total é recusado
  begin
    perform venda_balcao(v_store.id, jsonb_build_array(jsonb_build_object('produto', v_prod.id, 'qtd', 1)),
      jsonb_build_array(jsonb_build_object('forma', 'pix', 'valor', 0.5)));
    raise exception 'FALHOU 8: vendeu recebendo menos';
  exception when others then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;
  n := n + 1;

  -- 9. fechar: contou R$ 5 a menos → diferença −5
  r := caixa_fechar(v_caixa, 100 + v_preco * 3 + 10 - 30 - 5);
  if (r->>'diferenca')::numeric <> -5 then raise exception 'FALHOU 9: diferença %', r->>'diferenca'; end if;
  n := n + 1;

  raise exception 'TESTES_OK: % de 9 passaram (nada foi gravado)', n;
end $$;
