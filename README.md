# 📋 Workflow — Sistema de Gestão de Demandas

Aplicação web full-stack desenvolvida para o controle, acompanhamento e gestão de demandas internas e projetos. O sistema permite cadastrar, visualizar, editar, excluir e comentar solicitações, integrando validação completa entre front-end e back-end com persistência em banco de dados Oracle.

---

## 🚀 Funcionalidades

- **Gestão Completa de Demandas (CRUD):** Cadastro, listagem, visualização detalhada (`DEM-XXXX`), edição e exclusão de demandas.
- **Controle de Metadados:** Classificação por prioridade (*Baixa, Média, Alta, Crítica*), status (*Aberta, Em andamento, Revisão, Concluída, Cancelada*), categoria, projeto, solicitante, responsável e prazos.
- **Sistema de Comentários:** Registro e histórico de interações e atualizações dentro de cada demanda.
- **Gestão de Anexos:** Suporte a upload via *drag-and-drop* com validação de tamanho (máx. 5 MB) e extensão (`.png`, `.jpg`, `.jpeg`, `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.csv`).
- **Consulta de Feriados:** Integração com a [BrasilAPI](https://brasilapi.com.br) para validação e cálculo de prazos úteis.

---

## 🛠️ Tecnologias Utilizadas

- **Front-end:** HTML5, CSS3, JavaScript (ES6+ / Vanilla JS)
- **Back-end:** Node.js, Express, TypeScript
- **Banco de Dados:** Oracle Database (`oracledb` com Pool de Conexões)
- **Integrações Externas:** BrasilAPI (Feriados Nacionais)

---

## ⚙️ Pré-requisitos e Configuração

1. **Node.js** instalado (versão 18 ou superior recomendada).
2. Acesso a uma instância do **Oracle Database** (verifique se é necessário estar conectado à VPN da instituição).

### Variáveis de Ambiente

Crie um arquivo `.env` dentro da pasta `backend` (`backend/.env`) seguindo o modelo abaixo:

```env
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_CONNECT_STRING=host:1521/servico
PORT=3333
SERVE_FRONTEND=false
```

> ⚠️ **Atenção:** Nunca envie o arquivo `.env` para o repositório. Certifique-se de que ele está listado no `.gitignore`. Os feriados nacionais são consumidos diretamente da BrasilAPI e não exigem chave de autenticação.

---

## ▶️ Como Executar

Abra o terminal, acesse a pasta `backend` e instale as dependências:

```bash
cd backend
npm install
```

Em seguida, utilize um dos comandos abaixo conforme a necessidade:

| Comando | Descrição | URL de Acesso |
| :--- | :--- | :--- |
| `npm run back` | Inicia somente o servidor back-end (API) | `http://localhost:3333` |
| `npm run front` | Inicia somente a interface front-end | `http://localhost:3030` |
| `npm start` | Inicia back-end e front-end integrados no mesmo servidor | `http://localhost:3000` |

---

## 🔌 Principais Endpoints da API

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/demandas` | Lista todas as demandas cadastradas |
| `GET` | `/api/demandas/:id` | Retorna os detalhes de uma demanda específica |
| `POST` | `/api/demandas` | Cadastra uma nova demanda |
| `PUT` | `/api/demandas/:id` | Atualiza os dados de uma demanda existente |
| `DELETE` | `/api/demandas/:id` | Remove uma demanda do sistema |
| `GET` | `/api/demandas/:id/comentarios` | Lista os comentários de uma demanda |
| `POST` | `/api/demandas/:id/comentarios` | Adiciona um novo comentário à demanda |

---

## 🎓 Informações Acadêmicas

- **Curso:** Engenharia de Software
- **Componente Curricular:** Projeto Integrador II
- **Período:** 2º Semestre de 2026
- **Professor Orientador:** Fernando Silveira

### 👨‍💻 Integrantes do Grupo

- **Guilherme Baez Machado**
- **Gustavo Martins Romero**
- **João Pedro Bortolozzo Rodrigues**
- **Lucas Freitas Minneh**
- **Vitor Zago Guedes Batista**