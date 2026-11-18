-- Fase 1: esquema inicial.
-- Cómo aplicarlo: Supabase → SQL Editor → pegar todo este archivo → Run.
-- Es seguro correrlo más de una vez (usa "if not exists" / "drop policy if exists").

-- ── Categorías ───────────────────────────────────────────────────
create table if not exists public.categorias (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre      text not null check (char_length(nombre) between 1 and 40),
  tipo        text not null check (tipo in ('gasto', 'ingreso')),
  icono       text not null default '🏷️',
  orden       integer not null default 0,
  -- Archivar en vez de borrar: los movimientos viejos conservan su categoría.
  archivada   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, tipo, nombre)
);

-- ── Movimientos ──────────────────────────────────────────────────
create table if not exists public.movimientos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- El monto siempre es positivo; el signo lo da "tipo".
  -- numeric(12,2) guarda centavos exactos (float redondearía mal el dinero).
  monto         numeric(12, 2) not null check (monto > 0),
  tipo          text not null check (tipo in ('gasto', 'ingreso')),
  categoria_id  uuid references public.categorias (id) on delete set null,
  fecha         date not null default current_date,
  descripcion   text,
  metodo_pago   text check (metodo_pago in ('efectivo', 'debito', 'credito', 'transferencia')),
  -- ¿Lo capturé a mano o viene de un estado de cuenta?
  origen        text not null default 'manual' check (origen in ('manual', 'banco')),
  -- Huella del renglón del estado de cuenta; evita duplicados al reimportar.
  -- Es NULL en movimientos manuales (los NULL no chocan entre sí en un UNIQUE).
  huella_importacion text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, huella_importacion)
);

create index if not exists movimientos_user_fecha_idx
  on public.movimientos (user_id, fecha desc);

-- Mantener updated_at al día en cada edición.
create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists movimientos_updated_at on public.movimientos;
create trigger movimientos_updated_at
  before update on public.movimientos
  for each row execute function public.tocar_updated_at();

-- ── Seguridad por fila (RLS) ─────────────────────────────────────
-- Con RLS activado, nadie ve nada salvo lo que permita una política.
-- La política: cada usuario solo puede leer y escribir SUS filas.
alter table public.categorias  enable row level security;
alter table public.movimientos enable row level security;

drop policy if exists "categorias: solo las mías" on public.categorias;
create policy "categorias: solo las mías" on public.categorias
  for all to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "movimientos: solo los míos" on public.movimientos;
create policy "movimientos: solo los míos" on public.movimientos
  for all to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
