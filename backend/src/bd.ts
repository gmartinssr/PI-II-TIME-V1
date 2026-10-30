import "dotenv/config";
import oracledb from "oracledb";

let pool: oracledb.Pool | undefined;

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