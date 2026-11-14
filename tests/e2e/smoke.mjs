// Teste de fumaça: abre as telas principais da versão de demonstração e falha se alguma quebrar.
// Uso: npm run build && npm run test:e2e   (sobe o "vite preview" sozinho)
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PORTA = 4179;
const BASE = `http://localhost:${PORTA}`;
const servidor = spawn("npx", ["vite", "preview", "--port", String(PORTA), "--strictPort"], { stdio: "ignore" });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 50; i++) {
  if (await fetch(BASE).then((r) => r.ok, () => false)) break;
  await esperar(200);
}

const TELAS = [
  ["loja", "Voltar ao painel"],
  ["painel", "Copiloto"],
  ["pedidos", "Pedidos"],
  ["caixa", "Caixa"],
  ["salao", "Mesa"],
  ["mapa", "Zona"],
  ["fregueses", "Fregueses"],
  ["cardapio", "Cardápio"],
  ["config", "Configurações"],
  ["admin", "Sua carteira"],
  ["termos", "Termos"],
];

const falhas = [];
const navegador = await chromium.launch();
try {
  for (const [rota, texto] of TELAS) {
    const pg = await navegador.newPage({ viewport: { width: 1280, height: 860 } });
    const erros = [];
    pg.on("pageerror", (e) => erros.push(e.message));
    await pg.goto(`${BASE}/#${rota}`);
    try {
      await pg.getByText(texto, { exact: false }).first().waitFor({ timeout: 8000 });
    } catch {
      falhas.push(`#${rota}: não apareceu "${texto}"`);
    }
    if (erros.length) falhas.push(`#${rota}: ${erros.join(" | ")}`);
    await pg.close();
  }
  // loja → voltar ao painel
  const pg = await navegador.newPage();
  await pg.goto(`${BASE}/#loja`);
  await pg.getByText("Voltar ao painel").first().click();
  await pg.waitForURL(/#painel/, { timeout: 5000 }).catch(() => falhas.push("botão Voltar ao painel não levou ao painel"));
} finally {
  await navegador.close();
  servidor.kill();
}

if (falhas.length) {
  console.error("Falhou:\n- " + falhas.join("\n- "));
  process.exit(1);
}
console.log(`OK: ${TELAS.length} telas abriram sem erro`);
