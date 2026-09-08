export function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-[29px] font-extrabold leading-tight tracking-[-0.03em] text-ink">
        {title}
      </h1>
      <div className="mt-5 rounded-[16px] border border-dashed border-white/[.16] bg-panel/60 p-8 text-center">
        <div className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-lime">
          Próximamente
        </div>
        <p className="mx-auto mt-2 max-w-[40ch] text-[13px] leading-relaxed text-ink/65">
          Esta sección todavía no está construida — ver{" "}
          <a
            href="https://github.com/wworkinhome/aulawm/blob/main/ROADMAP.md"
            className="text-lime hover:text-accent"
          >
            ROADMAP.md
          </a>{" "}
          para la fase en la que llega.
        </p>
      </div>
    </div>
  );
}
