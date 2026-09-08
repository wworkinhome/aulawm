-- ============================================================
-- AulaWM — storage buckets
-- Private by default, per docs/adr/0006-file-storage-strategy.md and
-- SECURITY.md §5 — nothing here is public; every read goes through a
-- signed URL issued after an API authorization check.
--
-- Convención de rutas:
--   material/{cursoId}/{asignacionId}/{nombre}
--   entregas/{asignacionId}/{estudianteId}/{intento}/{nombre}
-- ============================================================

insert into storage.buckets (id, name, public)
values
  ('material', 'material', false),
  ('entregas', 'entregas', false),
  ('avatares', 'avatares', false)
on conflict (id) do nothing;
