-- ============================================================
--  Coroa de Cinzas — banco de dados (Supabase / Postgres)
--  Cole este arquivo inteiro no SQL Editor do Supabase e clique
--  em "Run". Ele pode ser executado de novo sem perder dados.
--
--  Regras gerais de segurança:
--   * Toda tabela tem RLS ligada. O navegador só LÊ o que é seu
--     (ou público) e nunca escreve direto nas tabelas.
--   * Toda escrita passa por funções (RPC) que conferem quem é
--     o jogador (auth.uid()) e validam os dados.
--   * A troca entre jogadores é feita por inteiro aqui no banco,
--     numa única transação: o item sai de um personagem e entra
--     no outro ao mesmo tempo, sem chance de duplicar.
-- ============================================================


-- ------------------------------------------------------------
-- Servidores (mundos). Por enquanto, apenas um.
-- ------------------------------------------------------------
create table if not exists public.servidores (
  id text primary key,
  nome text not null,
  regiao text not null default '',
  aberto boolean not null default true,
  ordem int not null default 0
);
insert into public.servidores (id, nome, regiao, ordem)
values ('brasil-1', 'Brasil · Alfa', 'América do Sul', 1)
on conflict (id) do nothing;

alter table public.servidores enable row level security;
drop policy if exists servidores_ler on public.servidores;
create policy servidores_ler on public.servidores for select to anon, authenticated using (true);

-- ------------------------------------------------------------
-- Perfis (uma linha por conta). O apelido é público e único.
-- ------------------------------------------------------------
create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  apelido text not null check (apelido ~ '^[A-Za-z0-9_]{3,16}$'),
  criado_em timestamptz not null default now()
);
create unique index if not exists perfis_apelido on public.perfis (lower(apelido));
alter table public.perfis enable row level security;
drop policy if exists perfis_ler on public.perfis;
create policy perfis_ler on public.perfis for select to authenticated using (true);

create or replace function public.ao_criar_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare ap text := coalesce(new.raw_user_meta_data ->> 'apelido', '');
begin
  if ap !~ '^[A-Za-z0-9_]{3,16}$' or exists (select 1 from perfis where lower(apelido) = lower(ap)) then
    ap := 'jogador_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  insert into perfis (id, apelido) values (new.id, ap);
  return new;
end $$;
drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users for each row execute function public.ao_criar_usuario();

create or replace function public.apelido_livre(p text) returns boolean
language sql security definer set search_path = public stable as $$
  select p ~ '^[A-Za-z0-9_]{3,16}$' and not exists (select 1 from perfis where lower(apelido) = lower(p))
$$;

-- ------------------------------------------------------------
-- Personagens (até 4 por conta em cada servidor)
-- ------------------------------------------------------------
create table if not exists public.personagens (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null references public.perfis (id) on delete cascade,
  servidor text not null references public.servidores (id),
  nome text not null check (char_length(nome) between 1 and 18),
  classe text not null check (classe in ('guerreiro', 'cacadora', 'feiticeira')),
  nivel int not null default 1,
  dados jsonb not null,
  versao bigint not null default 1,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists personagens_dono on public.personagens (dono, servidor);
alter table public.personagens enable row level security;
drop policy if exists personagens_ler on public.personagens;
create policy personagens_ler on public.personagens for select to authenticated using (dono = auth.uid());

create or replace function public.criar_personagem(p_servidor text, p_nome text, p_classe text, p_dados jsonb)
returns table (id uuid, versao bigint)
language plpgsql security definer set search_path = public as $$
declare novo uuid;
begin
  if auth.uid() is null then raise exception 'SEM_SESSAO'; end if;
  if not exists (select 1 from servidores s where s.id = p_servidor and s.aberto) then raise exception 'SERVIDOR_FECHADO'; end if;
  if (select count(*) from personagens p where p.dono = auth.uid() and p.servidor = p_servidor) >= 4 then raise exception 'LIMITE_PERSONAGENS'; end if;
  if octet_length(p_dados::text) > 400000 then raise exception 'SAVE_GRANDE'; end if;
  insert into personagens (dono, servidor, nome, classe, nivel, dados)
  values (auth.uid(), p_servidor, left(btrim(p_nome), 18), p_classe, 1, p_dados)
  returning personagens.id into novo;
  return query select novo, 1::bigint;
end $$;

-- Salva com controle de versão: se o banco tiver uma versão mais nova
-- (por exemplo, depois de uma troca), o salvamento é recusado e o jogo
-- recarrega o personagem do banco.
create or replace function public.salvar_personagem(p_id uuid, p_dados jsonb, p_versao bigint)
returns bigint
language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  if octet_length(p_dados::text) > 400000 then raise exception 'SAVE_GRANDE'; end if;
  if jsonb_typeof(p_dados -> 'inv') is distinct from 'array' then raise exception 'SAVE_INVALIDO'; end if;
  update personagens p
     set dados = p_dados, versao = p.versao + 1, atualizado_em = now(),
         nivel = greatest(1, least(100, coalesce((p_dados ->> 'nivel')::int, p.nivel)))
   where p.id = p_id and p.dono = auth.uid() and p.versao = p_versao
  returning p.versao into v;
  if v is null then
    if exists (select 1 from personagens p where p.id = p_id and p.dono = auth.uid()) then raise exception 'VERSAO'; end if;
    raise exception 'NAO_ENCONTRADO';
  end if;
  return v;
end $$;

create or replace function public.excluir_personagem(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from personagens p where p.id = p_id and p.dono = auth.uid();
end $$;

-- ------------------------------------------------------------
-- Amizades
-- ------------------------------------------------------------
create table if not exists public.amizades (
  de uuid not null references public.perfis (id) on delete cascade,
  para uuid not null references public.perfis (id) on delete cascade,
  aceita boolean not null default false,
  criado_em timestamptz not null default now(),
  primary key (de, para),
  check (de <> para)
);
alter table public.amizades enable row level security;
drop policy if exists amizades_ler on public.amizades;
create policy amizades_ler on public.amizades for select to authenticated using (auth.uid() in (de, para));

create or replace function public.pedir_amizade(p_apelido text) returns text
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); outro uuid;
begin
  if eu is null then raise exception 'SEM_SESSAO'; end if;
  select id into outro from perfis where lower(apelido) = lower(btrim(p_apelido));
  if outro is null then raise exception 'JOGADOR_NAO_EXISTE'; end if;
  if outro = eu then raise exception 'VOCE_MESMO'; end if;
  if exists (select 1 from amizades where (de = eu and para = outro) or (de = outro and para = eu and aceita)) then return 'ja'; end if;
  if (select count(*) from amizades where eu in (de, para)) >= 150 then raise exception 'LIMITE_AMIGOS'; end if;
  -- se o outro já tinha pedido, aceita direto
  update amizades set aceita = true where de = outro and para = eu;
  if found then return 'aceita'; end if;
  insert into amizades (de, para) values (eu, outro);
  return 'pedido';
end $$;

create or replace function public.responder_amizade(p_de uuid, p_aceitar boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_aceitar then update amizades set aceita = true where de = p_de and para = auth.uid();
  else delete from amizades where de = p_de and para = auth.uid(); end if;
end $$;

create or replace function public.remover_amizade(p_outro uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from amizades where (de = auth.uid() and para = p_outro) or (de = p_outro and para = auth.uid());
end $$;

-- ------------------------------------------------------------
-- Clãs
-- ------------------------------------------------------------
create table if not exists public.clas (
  id uuid primary key default gen_random_uuid(),
  servidor text not null references public.servidores (id),
  nome text not null check (char_length(nome) between 3 and 24),
  tag text not null check (tag ~ '^[A-Za-z0-9]{2,5}$'),
  lider uuid not null references public.perfis (id),
  descricao text not null default '' check (char_length(descricao) <= 300),
  criado_em timestamptz not null default now()
);
create unique index if not exists clas_nome on public.clas (servidor, lower(nome));
create unique index if not exists clas_tag on public.clas (servidor, upper(tag));

create table if not exists public.membros_cla (
  cla uuid not null references public.clas (id) on delete cascade,
  usuario uuid not null references public.perfis (id) on delete cascade,
  servidor text not null,
  cargo text not null default 'membro' check (cargo in ('lider', 'oficial', 'membro')),
  entrou_em timestamptz not null default now(),
  primary key (usuario, servidor)
);
create index if not exists membros_cla_cla on public.membros_cla (cla);

create table if not exists public.convites_cla (
  cla uuid not null references public.clas (id) on delete cascade,
  usuario uuid not null references public.perfis (id) on delete cascade,
  de uuid not null references public.perfis (id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (cla, usuario)
);

create table if not exists public.msgs_cla (
  id bigserial primary key,
  cla uuid not null references public.clas (id) on delete cascade,
  autor uuid not null references public.perfis (id) on delete cascade,
  apelido text not null,
  texto text not null check (char_length(texto) between 1 and 200),
  criado_em timestamptz not null default now()
);
create index if not exists msgs_cla_cla on public.msgs_cla (cla, id desc);

create or replace function public.cargo_em(p_cla uuid) returns text
language sql security definer set search_path = public stable as $$
  select cargo from membros_cla where cla = p_cla and usuario = auth.uid()
$$;

alter table public.clas enable row level security;
alter table public.membros_cla enable row level security;
alter table public.convites_cla enable row level security;
alter table public.msgs_cla enable row level security;
drop policy if exists clas_ler on public.clas;
create policy clas_ler on public.clas for select to authenticated using (true);
drop policy if exists membros_ler on public.membros_cla;
create policy membros_ler on public.membros_cla for select to authenticated using (true);
drop policy if exists convites_ler on public.convites_cla;
create policy convites_ler on public.convites_cla for select to authenticated
  using (usuario = auth.uid() or public.cargo_em(cla) in ('lider', 'oficial'));
drop policy if exists msgs_ler on public.msgs_cla;
create policy msgs_ler on public.msgs_cla for select to authenticated using (public.cargo_em(cla) is not null);

create or replace function public.criar_cla(p_servidor text, p_nome text, p_tag text) returns uuid
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); novo uuid;
begin
  if eu is null then raise exception 'SEM_SESSAO'; end if;
  if exists (select 1 from membros_cla where usuario = eu and servidor = p_servidor) then raise exception 'JA_EM_CLA'; end if;
  if exists (select 1 from clas where servidor = p_servidor and lower(nome) = lower(btrim(p_nome))) then raise exception 'NOME_EM_USO'; end if;
  if exists (select 1 from clas where servidor = p_servidor and upper(tag) = upper(btrim(p_tag))) then raise exception 'TAG_EM_USO'; end if;
  insert into clas (servidor, nome, tag, lider) values (p_servidor, btrim(p_nome), upper(btrim(p_tag)), eu) returning id into novo;
  insert into membros_cla (cla, usuario, servidor, cargo) values (novo, eu, p_servidor, 'lider');
  delete from convites_cla where usuario = eu and cla in (select id from clas where servidor = p_servidor);
  return novo;
end $$;

create or replace function public.convidar_cla(p_cla uuid, p_apelido text) returns void
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); outro uuid; srv text;
begin
  if public.cargo_em(p_cla) not in ('lider', 'oficial') or public.cargo_em(p_cla) is null then raise exception 'SEM_PERMISSAO'; end if;
  select servidor into srv from clas where id = p_cla;
  select id into outro from perfis where lower(apelido) = lower(btrim(p_apelido));
  if outro is null then raise exception 'JOGADOR_NAO_EXISTE'; end if;
  if exists (select 1 from membros_cla where usuario = outro and servidor = srv) then raise exception 'JOGADOR_JA_EM_CLA'; end if;
  if (select count(*) from membros_cla where cla = p_cla) >= 30 then raise exception 'CLA_CHEIO'; end if;
  insert into convites_cla (cla, usuario, de) values (p_cla, outro, eu) on conflict do nothing;
end $$;

create or replace function public.responder_convite_cla(p_cla uuid, p_aceitar boolean) returns void
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); srv text;
begin
  if not exists (select 1 from convites_cla where cla = p_cla and usuario = eu) then raise exception 'SEM_CONVITE'; end if;
  delete from convites_cla where cla = p_cla and usuario = eu;
  if not p_aceitar then return; end if;
  select servidor into srv from clas where id = p_cla;
  if srv is null then raise exception 'CLA_NAO_EXISTE'; end if;
  if exists (select 1 from membros_cla where usuario = eu and servidor = srv) then raise exception 'JA_EM_CLA'; end if;
  if (select count(*) from membros_cla where cla = p_cla) >= 30 then raise exception 'CLA_CHEIO'; end if;
  insert into membros_cla (cla, usuario, servidor, cargo) values (p_cla, eu, srv, 'membro');
  delete from convites_cla where usuario = eu and cla in (select id from clas where servidor = srv);
end $$;

create or replace function public.sair_cla(p_cla uuid) returns void
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); meu text := public.cargo_em(p_cla); herdeiro uuid;
begin
  if meu is null then return; end if;
  delete from membros_cla where cla = p_cla and usuario = eu;
  if meu = 'lider' then
    select usuario into herdeiro from membros_cla where cla = p_cla
      order by (cargo = 'oficial') desc, entrou_em asc limit 1;
    if herdeiro is null then delete from clas where id = p_cla;
    else
      update membros_cla set cargo = 'lider' where cla = p_cla and usuario = herdeiro;
      update clas set lider = herdeiro where id = p_cla;
    end if;
  end if;
end $$;

create or replace function public.expulsar_cla(p_cla uuid, p_usuario uuid) returns void
language plpgsql security definer set search_path = public as $$
declare meu text := public.cargo_em(p_cla); dele text;
begin
  select cargo into dele from membros_cla where cla = p_cla and usuario = p_usuario;
  if dele is null then return; end if;
  if not (meu = 'lider' and dele <> 'lider') and not (meu = 'oficial' and dele = 'membro') then raise exception 'SEM_PERMISSAO'; end if;
  delete from membros_cla where cla = p_cla and usuario = p_usuario;
end $$;

create or replace function public.definir_cargo_cla(p_cla uuid, p_usuario uuid, p_cargo text) returns void
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid();
begin
  if public.cargo_em(p_cla) is distinct from 'lider' then raise exception 'SEM_PERMISSAO'; end if;
  if p_usuario = eu or p_cargo not in ('lider', 'oficial', 'membro') then raise exception 'INVALIDO'; end if;
  if not exists (select 1 from membros_cla where cla = p_cla and usuario = p_usuario) then raise exception 'NAO_MEMBRO'; end if;
  if p_cargo = 'lider' then
    update membros_cla set cargo = 'oficial' where cla = p_cla and usuario = eu;
    update clas set lider = p_usuario where id = p_cla;
  end if;
  update membros_cla set cargo = p_cargo where cla = p_cla and usuario = p_usuario;
end $$;

create or replace function public.descricao_cla(p_cla uuid, p_texto text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.cargo_em(p_cla) not in ('lider', 'oficial') or public.cargo_em(p_cla) is null then raise exception 'SEM_PERMISSAO'; end if;
  update clas set descricao = left(coalesce(p_texto, ''), 300) where id = p_cla;
end $$;

create or replace function public.enviar_msg_cla(p_cla uuid, p_texto text) returns void
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); ap text; t text := left(btrim(coalesce(p_texto, '')), 200);
begin
  if public.cargo_em(p_cla) is null then raise exception 'NAO_MEMBRO'; end if;
  if t = '' then return; end if;
  if (select count(*) from msgs_cla where autor = eu and criado_em > now() - interval '10 seconds') >= 6 then raise exception 'DEVAGAR'; end if;
  select apelido into ap from perfis where id = eu;
  insert into msgs_cla (cla, autor, apelido, texto) values (p_cla, eu, ap, t);
  delete from msgs_cla where cla = p_cla and id < (select id from msgs_cla where cla = p_cla order by id desc offset 300 limit 1);
end $$;

-- ------------------------------------------------------------
-- Trocas entre jogadores
--  convite -> aberta -> (as duas partes confirmam) -> concluida
--  Qualquer mudança de oferta desfaz as confirmações.
-- ------------------------------------------------------------
create table if not exists public.trocas (
  id uuid primary key default gen_random_uuid(),
  servidor text not null references public.servidores (id),
  a uuid not null references public.perfis (id) on delete cascade,
  b uuid not null references public.perfis (id) on delete cascade,
  pers_a uuid not null references public.personagens (id) on delete cascade,
  pers_b uuid references public.personagens (id) on delete cascade,
  nome_a text not null default '',
  nome_b text not null default '',
  estado text not null default 'convite' check (estado in ('convite', 'aberta', 'concluida', 'cancelada')),
  oferta_a jsonb not null default '[]',
  oferta_b jsonb not null default '[]',
  ouro_a bigint not null default 0 check (ouro_a >= 0),
  ouro_b bigint not null default 0 check (ouro_b >= 0),
  ok_a boolean not null default false,
  ok_b boolean not null default false,
  motivo text not null default '',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (a <> b)
);
create index if not exists trocas_a on public.trocas (a, estado);
create index if not exists trocas_b on public.trocas (b, estado);
alter table public.trocas enable row level security;
drop policy if exists trocas_ler on public.trocas;
create policy trocas_ler on public.trocas for select to authenticated using (auth.uid() in (a, b));

create or replace function public.abrir_troca(p_pers uuid, p_apelido text) returns uuid
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); outro uuid; srv text; nm text; novo uuid;
begin
  select servidor, nome into srv, nm from personagens where id = p_pers and dono = eu;
  if srv is null then raise exception 'NAO_ENCONTRADO'; end if;
  select id into outro from perfis where lower(apelido) = lower(btrim(p_apelido));
  if outro is null then raise exception 'JOGADOR_NAO_EXISTE'; end if;
  if outro = eu then raise exception 'VOCE_MESMO'; end if;
  -- uma troca por vez: encerra as anteriores
  update trocas set estado = 'cancelada', motivo = 'substituida', atualizado_em = now()
   where estado in ('convite', 'aberta') and eu in (a, b);
  insert into trocas (servidor, a, b, pers_a, nome_a) values (srv, eu, outro, p_pers, nm) returning id into novo;
  return novo;
end $$;

create or replace function public.aceitar_troca(p_id uuid, p_pers uuid) returns void
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); t trocas; srv text; nm text;
begin
  select * into t from trocas where id = p_id for update;
  if t.id is null or t.b <> eu or t.estado <> 'convite' then raise exception 'TROCA_INVALIDA'; end if;
  if t.criado_em < now() - interval '3 minutes' then
    update trocas set estado = 'cancelada', motivo = 'expirou', atualizado_em = now() where id = p_id;
    raise exception 'TROCA_EXPIROU';
  end if;
  select servidor, nome into srv, nm from personagens where id = p_pers and dono = eu;
  if srv is null or srv <> t.servidor then raise exception 'NAO_ENCONTRADO'; end if;
  update trocas set estado = 'cancelada', motivo = 'substituida', atualizado_em = now()
   where estado in ('convite', 'aberta') and eu in (a, b) and id <> p_id;
  update trocas set estado = 'aberta', pers_b = p_pers, nome_b = nm, atualizado_em = now() where id = p_id;
end $$;

-- A oferta é montada aqui a partir do personagem salvo no banco: o
-- outro jogador vê exatamente o item que será entregue.
create or replace function public.ofertar_troca(p_id uuid, p_slots int[], p_ouro bigint) returns void
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); t trocas; d jsonb; oferta jsonb := '[]'; s int; it jsonb; sou_a boolean;
begin
  select * into t from trocas where id = p_id for update;
  if t.id is null or t.estado <> 'aberta' or eu not in (t.a, t.b) then raise exception 'TROCA_INVALIDA'; end if;
  sou_a := (eu = t.a);
  select dados into d from personagens where id = case when sou_a then t.pers_a else t.pers_b end and dono = eu;
  if d is null then raise exception 'NAO_ENCONTRADO'; end if;
  if coalesce(array_length(p_slots, 1), 0) > 12 then raise exception 'MUITOS_ITENS'; end if;
  if p_ouro < 0 or p_ouro > coalesce((d ->> 'ouro')::numeric, 0) then raise exception 'OURO_INSUFICIENTE'; end if;
  for s in select distinct x from unnest(coalesce(p_slots, '{}')) x loop
    it := d -> 'inv' -> s;
    if it is null or jsonb_typeof(it) <> 'object' then raise exception 'ITEM_NAO_EXISTE'; end if;
    oferta := oferta || jsonb_build_array(jsonb_build_object('i', s, 'item', it));
  end loop;
  if sou_a then update trocas set oferta_a = oferta, ouro_a = p_ouro, ok_a = false, ok_b = false, atualizado_em = now() where id = p_id;
  else update trocas set oferta_b = oferta, ouro_b = p_ouro, ok_a = false, ok_b = false, atualizado_em = now() where id = p_id; end if;
end $$;

create or replace function public._inv_tirar(d jsonb, oferta jsonb) returns jsonb
language plpgsql immutable as $$
declare o jsonb;
begin
  for o in select value from jsonb_array_elements(oferta) loop
    if (d -> 'inv' -> ((o ->> 'i')::int)) is distinct from (o -> 'item') then raise exception 'OFERTA_MUDOU'; end if;
    d := jsonb_set(d, array['inv', o ->> 'i'], 'null'::jsonb);
  end loop;
  return d;
end $$;

create or replace function public._inv_por(d jsonb, oferta jsonb) returns jsonb
language plpgsql immutable as $$
declare o jsonb; n int; k int;
begin
  n := jsonb_array_length(d -> 'inv');
  for o in select value from jsonb_array_elements(oferta) loop
    k := null;
    for j in 0 .. n - 1 loop
      if jsonb_typeof(d -> 'inv' -> j) = 'null' then k := j; exit; end if;
    end loop;
    if k is null then raise exception 'INVENTARIO_CHEIO'; end if;
    d := jsonb_set(d, array['inv', k::text], o -> 'item');
  end loop;
  return d;
end $$;

create or replace function public.confirmar_troca(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); t trocas; da jsonb; db jsonb; oa numeric; ob numeric; erro text;
begin
  select * into t from trocas where id = p_id for update;
  if t.id is null or t.estado <> 'aberta' or eu not in (t.a, t.b) then raise exception 'TROCA_INVALIDA'; end if;
  if eu = t.a then t.ok_a := true; else t.ok_b := true; end if;
  if not (t.ok_a and t.ok_b) then
    update trocas set ok_a = t.ok_a, ok_b = t.ok_b, atualizado_em = now() where id = p_id;
    return 'aguardando';
  end if;
  begin
    -- trava os dois personagens sempre na mesma ordem (evita impasse)
    perform 1 from personagens where id in (t.pers_a, t.pers_b) order by id for update;
    select dados into da from personagens where id = t.pers_a and dono = t.a;
    select dados into db from personagens where id = t.pers_b and dono = t.b;
    if da is null or db is null then raise exception 'NAO_ENCONTRADO'; end if;
    oa := coalesce((da ->> 'ouro')::numeric, 0); ob := coalesce((db ->> 'ouro')::numeric, 0);
    if oa < t.ouro_a or ob < t.ouro_b then raise exception 'OURO_INSUFICIENTE'; end if;
    da := public._inv_tirar(da, t.oferta_a);
    db := public._inv_tirar(db, t.oferta_b);
    da := public._inv_por(da, t.oferta_b);
    db := public._inv_por(db, t.oferta_a);
    da := jsonb_set(da, '{ouro}', to_jsonb(oa - t.ouro_a + t.ouro_b));
    db := jsonb_set(db, '{ouro}', to_jsonb(ob - t.ouro_b + t.ouro_a));
    update personagens set dados = da, versao = versao + 1, atualizado_em = now() where id = t.pers_a;
    update personagens set dados = db, versao = versao + 1, atualizado_em = now() where id = t.pers_b;
    update trocas set estado = 'concluida', ok_a = true, ok_b = true, atualizado_em = now() where id = p_id;
    return 'concluida';
  exception when others then
    erro := sqlerrm;
  end;
  update trocas set estado = 'cancelada', motivo = left(erro, 80), atualizado_em = now() where id = p_id;
  return 'falhou:' || erro;
end $$;

create or replace function public.cancelar_troca(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update trocas set estado = 'cancelada', motivo = 'cancelada', atualizado_em = now()
   where id = p_id and auth.uid() in (a, b) and estado in ('convite', 'aberta');
end $$;

-- ------------------------------------------------------------
-- Permissões das funções: só usuários logados (exceto apelido_livre)
-- ------------------------------------------------------------
do $$
declare f regprocedure; nm text;
begin
  for f, nm in select p.oid::regprocedure, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = any (array['ao_criar_usuario', 'apelido_livre', 'criar_personagem',
             'salvar_personagem', 'excluir_personagem', 'pedir_amizade', 'responder_amizade', 'remover_amizade', 'cargo_em',
             'criar_cla', 'convidar_cla', 'responder_convite_cla', 'sair_cla', 'expulsar_cla', 'definir_cargo_cla',
             'descricao_cla', 'enviar_msg_cla', 'abrir_troca', 'aceitar_troca', 'ofertar_troca', '_inv_tirar', '_inv_por',
             'confirmar_troca', 'cancelar_troca']) loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    if nm not in ('ao_criar_usuario', '_inv_tirar', '_inv_por') then
      execute format('grant execute on function %s to authenticated', f);
    end if;
  end loop;
end $$;
grant execute on function public.apelido_livre(text) to anon;

-- nenhuma escrita direta pelas tabelas
revoke insert, update, delete on public.servidores, public.perfis, public.personagens, public.amizades,
  public.clas, public.membros_cla, public.convites_cla, public.msgs_cla, public.trocas from anon, authenticated;

-- ------------------------------------------------------------
-- Tempo real: avisos de mudanças (respeitam a RLS acima)
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['amizades', 'membros_cla', 'convites_cla', 'msgs_cla', 'trocas'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
