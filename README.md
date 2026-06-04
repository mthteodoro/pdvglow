# Glow Clothings - Sistema PDV Web

PDV Web para loja de roupas femininas com cadastro de clientes, estoque, importacao Excel, vendas, financeiro e dashboard em tela unica.

## Stack

- Frontend: Next.js App Router, TypeScript, Tailwind CSS, componentes Shadcn/UI locais
- Backend: FastAPI, SQLAlchemy async, pandas, openpyxl
- Banco: Supabase PostgreSQL
- Autenticacao: Supabase Auth
- Infra: Docker, Docker Compose
- Deploy: Render

## Estrutura

```text
glow-clothings/
  backend/
    app/
      routers/
      schemas/
      services/
      auth.py
      database.py
      main.py
  frontend/
    app/
    components/
    lib/
    services/
  database/schema.sql
  docker-compose.yml
  render.yaml
```

## Supabase

1. Crie um projeto no Supabase.
2. No SQL Editor, execute `database/schema.sql`.
3. Em Authentication, crie ao menos um usuario por email/senha.
4. Copie a connection string PostgreSQL e as chaves do projeto.

Se voce ja tentou executar outro schema antes e aparecer erro de tipos incompativeis entre `uuid` e `text`, execute primeiro `database/reset.sql` no SQL Editor e depois rode novamente `database/schema.sql`. O reset apaga as tabelas do PDV, entao use apenas em ambiente inicial ou sem dados reais.

Observacao: o schema habilita RLS e politicas para usuarios autenticados. O backend tambem valida JWT do Supabase antes de acessar os endpoints.

## Variaveis de ambiente

Copie `.env.example` para `.env` na raiz do projeto e preencha:

```bash
cp .env.example .env
```

Campos principais:

- `DATABASE_URL`: use o formato async do SQLAlchemy, por exemplo `postgresql+asyncpg://...`
- `SUPABASE_URL`: URL publica do projeto Supabase
- `SUPABASE_JWT_SECRET`: JWT secret do Supabase, ou use `SUPABASE_JWKS_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave anon do frontend
- `NEXT_PUBLIC_API_URL`: URL da API

Para desenvolvimento sem login, defina `AUTH_REQUIRED=false`, mas nao use isso em producao.

## Executar local com Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Swagger: http://localhost:8000/docs

## Executar sem Docker

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Importacao Excel

O arquivo `.xlsx` deve ter:

| Coluna | Conteudo |
| --- | --- |
| A | ID |
| B | Produto |
| C | Quantidade |
| D | Preco |

Fluxo na tela:

1. Escolha o arquivo.
2. Clique em Preview.
3. Confirme em Importar.

## Endpoints

- `POST /clientes`
- `GET /clientes?busca=`
- `PUT /clientes/{id}`
- `DELETE /clientes/{id}`
- `POST /produtos`
- `GET /produtos?busca=&produto_id=`
- `PUT /produtos/{id}`
- `DELETE /produtos/{id}`
- `POST /produtos/importar-excel?preview=true`
- `POST /vendas`
- `GET /vendas`
- `POST /financeiro`
- `GET /financeiro`
- `GET /dashboard`

## Deploy no Render

O arquivo `render.yaml` define dois web services Docker:

- `glow-clothings-api`, apontando para `backend`
- `glow-clothings-web`, apontando para `frontend`

No Render, configure as variaveis do `.env.example`. Em producao, ajuste:

- `NEXT_PUBLIC_API_URL` para a URL publica da API no Render
- `CORS_ORIGINS` para a URL publica do frontend

## Observacoes de producao

- Use connection pooling do Supabase na `DATABASE_URL`.
- Mantenha `AUTH_REQUIRED=true`.
- Crie usuarios no Supabase Auth e distribua apenas para operadores autorizados.
- Configure backup e monitoramento no Supabase.
