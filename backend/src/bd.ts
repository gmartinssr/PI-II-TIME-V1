import "dotenv/config";
import oracledb from "oracledb";

let pool: oracledb.Pool | undefined;

// Cria o pool de conexões do Oracle uma única vez e o reaproveita.
export async function iniciarPool() {
    if (pool) {
        return pool;
    }

    pool = await oracledb.createPool({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectString: process.env.DB_CONNECT_STRING,
        poolMin: 1,
        poolMax: 5,
        poolIncrement: 1,
        connectTimeout: 10
    });

    console.log("Pool Oracle criado com sucesso!");

    return pool;
}

// Faz uma consulta simples para confirmar que o banco responde.
export async function testarPool() {
    if (!pool) {
        throw new Error("O pool ainda não foi iniciado.");
    }

    let conexao: oracledb.Connection | undefined;

    try {
        conexao = await pool.getConnection();

        const resultado = await conexao.execute(
            "SELECT * FROM USUARIO"
        );

        console.log("Conexão pelo pool funcionando!");
        console.log("Resultado:", resultado.rows);
    } finally {
        if (conexao) {
            await conexao.close();
        }
    }
}