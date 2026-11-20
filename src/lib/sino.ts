// Sino de pedido novo: som de sino (parciais de sino de verdade), alto e com compressor para não distorcer.
// O navegador só libera som depois do primeiro clique na página: o contexto é destravado no primeiro toque.
let ctx: AudioContext | null = null;
function contexto() {
  if (ctx) return ctx;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  ctx = new Ctx();
  return ctx;
}
if (typeof window !== "undefined") {
  const destravar = () =>
    contexto()
      ?.resume()
      .catch(() => {});
  ["pointerdown", "keydown", "touchstart"].forEach((e) => window.addEventListener(e, destravar, { passive: true }));
}

/** Uma batida de sino que começa em `quando` (segundos do relógio do áudio). */
function batida(c: AudioContext, saida: AudioNode, base: number, quando: number) {
  // sino: frequências fora da série harmônica, cada uma some num tempo
  const parciais: [number, number, number][] = [
    [1, 1, 2.4],
    [2.0, 0.6, 1.8],
    [2.76, 0.45, 1.3],
    [5.4, 0.25, 0.8],
    [8.93, 0.12, 0.5],
  ];
  for (const [r, vol, dur] of parciais) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = base * r;
    g.gain.setValueAtTime(0.0001, quando);
    g.gain.exponentialRampToValueAtTime(vol, quando + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, quando + dur);
    o.connect(g).connect(saida);
    o.start(quando);
    o.stop(quando + dur + 0.05);
  }
}

/** Toca o sino (tlim-tlom, duas vezes). Volume de 0 a 1. */
export function tocarSino(volume = 1) {
  try {
    const c = contexto();
    if (!c) return;
    if (c.state === "suspended") c.resume().catch(() => {});
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 6;
    const mestre = c.createGain();
    mestre.gain.value = 1.25 * volume;
    comp.connect(mestre).connect(c.destination);
    const t = c.currentTime + 0.02;
    batida(c, comp, 1318.5, t);
    batida(c, comp, 987.8, t + 0.32);
    batida(c, comp, 1318.5, t + 0.9);
    batida(c, comp, 987.8, t + 1.22);
  } catch {
    /* navegador sem som */
  }
}
