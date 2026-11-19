-- Fase 10: ahorro.
-- Cómo aplicarlo: Supabase → SQL Editor → pegar todo este archivo → Run.
-- Es seguro correrlo más de una vez.

-- ── 1. Categorías que representan ahorro ─────────────────────────
-- Pasar dinero a mi cuenta de ahorro no es un gasto: el dinero sigue siendo
-- mío. Se registra como un movimiento en una categoría marcada con es_ahorro,
-- y la app lo resta del dinero disponible pero no lo suma al gasto del mes.
alter table public.categorias
  add column if not exists es_ahorro boolean not null default false;

-- Crea la categoría "Ahorro" para las cuentas que ya existen.
insert into public.categorias (user_id, nombre, tipo, icono, orden, es_ahorro)
select id, 'Ahorro', 'gasto', 'piggy-bank', 99, true
from auth.users
on conflict (user_id, tipo, nombre) do update set es_ahorro = true;

-- ── 2. Ajustes de ahorro (una fila por usuario) ──────────────────
create table if not exists public.ajustes (
  user_id            uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- Qué parte de cada ingreso quiero ahorrar.
  porcentaje_ahorro  numeric(5, 2) not null default 30
                     check (porcentaje_ahorro >= 0 and porcentaje_ahorro <= 100),
  -- Día en que normalmente recibo dinero: 0 = lunes ... 6 = domingo.
  dia_ingreso        smallint not null default 0 check (dia_ingreso between 0 and 6),
  -- "Tengo $X" y cuándo lo anoté. El dinero disponible de hoy se calcula como
  -- ese monto más/menos los movimientos registrados después de ese momento.
  saldo_inicial      numeric(12, 2),
  saldo_fecha        date,
  saldo_marca        timestamptz,
  -- Lo que ya tenía ahorrado antes de empezar a usar la app.
  ahorro_inicial     numeric(12, 2) not null default 0 check (ahorro_inicial >= 0),
  updated_at         timestamptz not null default now()
);

alter table public.ajustes enable row level security;

drop policy if exists "ajustes: solo los míos" on public.ajustes;
create policy "ajustes: solo los míos" on public.ajustes
  for all to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
