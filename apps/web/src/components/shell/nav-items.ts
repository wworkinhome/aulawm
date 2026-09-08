export type NavItem = { label: string; href: string };

// Sections 19–20 of the original brief ("NAVEGACIÓN ESTUDIANTE" /
// "NAVEGACIÓN DOCENTE"). Most hrefs are stubs (ComingSoon) until their
// phase in ROADMAP.md is built — see components/shell/coming-soon.tsx.
export const NAV_ESTUDIANTE: NavItem[] = [
  { label: "Dashboard", href: "/inicio" },
  { label: "Mis cursos", href: "/cursos" },
  { label: "Calendario", href: "/calendario" },
  { label: "Actividades", href: "/actividades" },
  { label: "Exámenes", href: "/examenes" },
  { label: "Laboratorios", href: "/labs" },
  { label: "Proyectos", href: "/proyectos" },
  { label: "Calificaciones", href: "/calificaciones" },
  { label: "Competencias", href: "/competencias" },
  { label: "Gamificación", href: "/gamificacion" },
  { label: "Certificados", href: "/certificados" },
  { label: "Notificaciones", href: "/notificaciones" },
  { label: "Perfil", href: "/perfil" },
];

export const NAV_DOCENTE: NavItem[] = [
  { label: "Dashboard", href: "/panel" },
  { label: "Cursos", href: "/panel/cursos" },
  { label: "Contenido", href: "/panel/contenido" },
  { label: "Actividades", href: "/panel/actividades" },
  { label: "Talleres", href: "/panel/talleres" },
  { label: "Exámenes", href: "/panel/examenes" },
  { label: "Banco de preguntas", href: "/panel/banco-preguntas" },
  { label: "Simulacros ICFES", href: "/panel/icfes" },
  { label: "Laboratorios", href: "/panel/labs" },
  { label: "Programación", href: "/panel/programacion" },
  { label: "Calificaciones", href: "/panel/calificaciones" },
  { label: "Rúbricas", href: "/panel/rubricas" },
  { label: "Competencias", href: "/panel/competencias" },
  { label: "Estudiantes", href: "/panel/estudiantes" },
  { label: "Analytics", href: "/panel/analytics" },
  { label: "Anuncios", href: "/panel/anuncios" },
  { label: "Calendario", href: "/panel/calendario" },
  { label: "Configuración", href: "/panel/configuracion" },
];
