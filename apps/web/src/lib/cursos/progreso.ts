import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Computes a student's progress in a course by counting published clases
 * vs. their own completed progreso_clase rows. Done as a few small
 * PostgREST calls rather than a single nested-embed query — filtering two
 * levels deep through an embed (clases -> modulos -> curso_id) isn't
 * straightforward with the JS client's query builder. Fine at this scale;
 * revisit as a SQL view/RPC if course sizes make this too many round trips.
 */
export async function getCursoProgreso(
  supabase: SupabaseClient,
  cursoId: string,
  estudianteId: string,
) {
  const { data: modulos } = await supabase
    .from("modulos")
    .select("id")
    .eq("curso_id", cursoId);

  const moduloIds = (modulos ?? []).map((m) => m.id as string);
  if (moduloIds.length === 0) {
    return { total: 0, completadas: 0, porcentaje: 0 };
  }

  const { data: clases } = await supabase
    .from("clases")
    .select("id")
    .in("modulo_id", moduloIds)
    .eq("publicada", true);

  const claseIds = (clases ?? []).map((c) => c.id as string);
  const total = claseIds.length;
  if (total === 0) {
    return { total: 0, completadas: 0, porcentaje: 0 };
  }

  const { count: completadas } = await supabase
    .from("progreso_clase")
    .select("clase_id", { count: "exact", head: true })
    .eq("estudiante_id", estudianteId)
    .eq("completada", true)
    .in("clase_id", claseIds);

  const completadasNum = completadas ?? 0;
  return {
    total,
    completadas: completadasNum,
    porcentaje: total === 0 ? 0 : Math.round((completadasNum / total) * 100),
  };
}
