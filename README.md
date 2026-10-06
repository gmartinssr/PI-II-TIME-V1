# Workflow

<h3>Integrantes</h3>
<ul>
    <li><strong>Gustavo Martins Romero</strong></li>
    <li><strong>Guilherme Baez Machado</strong></li>
    <li><strong>João Pedro Bortolozzo Rodrigues</strong></li>
    <li><strong>Lucas Freitas Minneh</strong></li>
    <li><strong>Vitor Zago Guedes Batista</strong></li>
</ul>

## Informações Importantes

**Curso**: Engenharia de Software

**Componente curricular**: Projeto Integrador II

**Semestre/Ano**: 2° semestre 2026

**Professor Orientador**: Fernando Silveira

## Execução

Os comandos devem ser executados dentro da pasta `backend`:

- `npm run back`: inicia somente o backend na porta 3333.
- `npm run front`: inicia somente o frontend em `http://localhost:3030`.
- `npm start`: inicia backend e frontend juntos no mesmo servidor, em `http://localhost:3000`.

O formulário de login envia os dados para `POST /api/login`. A validação do
email e da senha é feita no backend, que aceita domínios comuns como `.com`,
`.com.br`, `.org`, `.net`, `.edu`, `.gov`, `.io`, `.dev` e `.app`. O email
deve ter entre 6 e 254 caracteres e a senha deve ter pelo menos 6 caracteres.
Quando há erro, a API retorna mensagens específicas por campo, e o frontend
as exibe abaixo do email ou da senha correspondente.
A senha também deve conter pelo menos uma letra maiúscula, uma letra minúscula,
um número e um caractere especial permitido (`.`, `_`, `@`, `!`, `$` ou `#`).
