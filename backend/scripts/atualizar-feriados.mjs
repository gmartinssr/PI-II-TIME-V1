import "dotenv/config";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const arquivo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/dados/feriados.json"
);
const chave = process.env.FERIADO_API_KEY;

if (!chave) {
  console.error("FERIADO_API_KEY não configurada no backend/.env.");
  process.exit(1);
}

const anoAtual = new Date().getFullYear();
const anos = process.argv.slice(2).map(Number).filter(Number.isInteger);
if (anos.length === 0) anos.push(anoAtual, anoAtual + 1);

function paraIso(data) {
  const br = String(data).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = String(data).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
}

let salvo = {};
try {
  salvo = JSON.parse(await readFile(arquivo, "utf8"));
} catch {
  // arquivo ainda não existe
}

let falhou = false;
for (const ano of anos) {
  try {
    const resposta = await fetch(
      `https://feriadosapi.com/api/v1/feriados/nacionais?ano=${ano}`,
      { headers: { Authorization: `Bearer ${chave}` }, signal: AbortSignal.timeout(10000) }
    );
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

    const json = await resposta.json();
    const lista = (json.feriados ?? json.data ?? [])
      .map((f) => ({ data: paraIso(f.data), nome: f.nome }))
      .filter((f) => f.data);

    if (lista.length === 0) throw new Error("a API não retornou feriados");
    salvo[ano] = lista.sort((a, b) => a.data.localeCompare(b.data));
    console.log(`${ano}: ${lista.length} feriados`);
  } catch (erro) {
    falhou = true;
    console.error(`${ano}: falhou (${erro.cause?.code ?? erro.message})`);
  }
}

await mkdir(path.dirname(arquivo), { recursive: true });
await writeFile(arquivo, JSON.stringify(salvo, null, 2) + "\n", "utf8");
process.exit(falhou ? 1 : 0);
