export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-ground px-6 py-24 text-ink">
      <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-lime">
        LMS — Wilmer Mosquera
      </span>
      <h1 className="text-center text-[clamp(34px,4.6vw,58px)] font-black leading-none tracking-[-0.045em]">
        Aula<span className="text-accent">WM</span>
      </h1>
      <p className="max-w-md text-center text-[13px] leading-relaxed text-ink/70">
        Fase 1 en construcción. El sistema de diseño (tokens, tipografía
        Archivo/Azeret Mono) ya está cableado — ver{" "}
        <code className="font-mono text-lime">apps/web/src/app/globals.css</code>.
      </p>
    </main>
  );
}
