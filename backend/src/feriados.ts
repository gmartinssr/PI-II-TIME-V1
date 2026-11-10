import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const URL_BASE = "https://feriadosapi.com/api/v1/feriados/nacionais";
const ARQUIVO = fileURLToPath(new URL("./dados/feriados.json", import.meta.url));
const cachePorAno = new Map<number, Set<string>>();

function normalizarData(valor: unknown): string | null {
    if (typeof valor !== "string") return null;
    const iso = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const br = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
    return null;
}

function extrairData(item: unknown): string | null {
    if (typeof item === "string") return normalizarData(item);
    if (typeof item === "object" && item !== null) {
        const registro = item as Record<string, unknown>;
        return normalizarData(registro.data ?? registro.date);
    }
    return null;
}

function listaParaSet(lista: unknown): Set<string> {
    const datas = new Set<string>();
    for (const item of Array.isArray(lista) ? lista : []) {
        const data = extrairData(item);
        if (data) datas.add(data);
    }
    return datas;
}

function lerArquivo(ano: number): Set<string> | null {
    try {
        const salvo = JSON.parse(readFileSync(ARQUIVO, "utf8")) as Record<string, unknown>;
        const datas = listaParaSet(salvo[String(ano)]);
        return datas.size > 0 ? datas : null;
    } catch {
        return null;
    }
}

async function buscarNaApi(ano: number): Promise<Set<string>> {
    const chave = process.env.FERIADO_API_KEY;
    if (!chave) throw new Error("FERIADO_API_KEY não configurada.");

    const resposta = await fetch(`${URL_BASE}?ano=${ano}`, {
        headers: { Authorization: `Bearer ${chave}` },
        signal: AbortSignal.timeout(5000)
    });
    if (!resposta.ok) throw new Error(`FeriadosAPI respondeu ${resposta.status}.`);

    const json = (await resposta.json()) as { feriados?: unknown; data?: unknown };
    return listaParaSet(json.feriados ?? json.data);
}

async function buscarFeriados(ano: number): Promise<Set<string>> {
    const emCache = cachePorAno.get(ano);
    if (emCache) return emCache;

    const datas = lerArquivo(ano) ?? (await buscarNaApi(ano));
    cachePorAno.set(ano, datas);
    return datas;
}

export async function mensagemSeFeriado(data: string): Promise<string | null> {
    try {
        const feriados = await buscarFeriados(Number(data.slice(0, 4)));
        return feriados.has(data) ? "O prazo não pode cair em um feriado nacional." : null;
    } catch (erro) {
        console.error("Não foi possível consultar os feriados:", erro);
        return null;
    }
}
