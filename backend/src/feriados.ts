const URL_BASE = "https://brasilapi.com.br/api/feriados/v1";
// A BrasilAPI também lista datas que não são feriados nacionais.
const DATAS_IGNORADAS = ["Carnaval", "Páscoa", "Corpus Christi"];
const feriadosPorAno = new Map<number, Set<string>>();

// Converte AAAA-MM-DD ou DD/MM/AAAA para AAAA-MM-DD.
function paraDataIso(valor: unknown): string | null {
    if (typeof valor !== "string") return null;
    const iso = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const br = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
    return null;
}

// Pega a data de um item da lista, seja texto ou objeto.
function dataDoItem(item: unknown): string | null {
    if (typeof item === "string") return paraDataIso(item);
    if (typeof item === "object" && item !== null) {
        const registro = item as Record<string, unknown>;
        return paraDataIso(registro.data ?? registro.date);
    }
    return null;
}

// Monta o conjunto de datas a partir da lista recebida.
function juntarDatas(lista: unknown): Set<string> {
    const datas = new Set<string>();
    for (const item of Array.isArray(lista) ? lista : []) {
        const data = dataDoItem(item);
        if (data) datas.add(data);
    }
    return datas;
}

// Chamada à BrasilAPI: GET /api/feriados/v1/{ano}.
async function buscarNaApi(ano: number): Promise<Set<string>> {
    const resposta = await fetch(`${URL_BASE}/${ano}`, {
        signal: AbortSignal.timeout(5000)
    });
    if (!resposta.ok) throw new Error(`BrasilAPI respondeu ${resposta.status}.`);

    const lista = (await resposta.json()) as { date: string; name: string }[];
    return juntarDatas(lista.filter((f) => !DATAS_IGNORADAS.includes(f.name)));
}

// Consulta cada ano uma vez e guarda na memória enquanto o servidor roda.
async function buscarFeriados(ano: number): Promise<Set<string>> {
    const emCache = feriadosPorAno.get(ano);
    if (emCache) return emCache;

    const datas = await buscarNaApi(ano);
    feriadosPorAno.set(ano, datas);
    return datas;
}

// Retorna a mensagem de erro se a data for feriado.
// Se a API falhar, a data é aceita e o erro vai para o terminal.
export async function validarFeriado(data: string): Promise<string | null> {
    try {
        const feriados = await buscarFeriados(Number(data.slice(0, 4)));
        return feriados.has(data) ? "O prazo não pode cair em um feriado nacional." : null;
    } catch (erro) {
        console.error("Não foi possível consultar os feriados:", erro);
        return null;
    }
}
