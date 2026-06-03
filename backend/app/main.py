print(">>> iniciando app", flush=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

print(">>> fastapi importado", flush=True)

from app.config import get_settings

print(">>> config importado", flush=True)

try:
    from app.routers import clientes, financeiro, produtos, vendas
    print(">>> routers importados", flush=True)
except Exception as e:
    print(f">>> ERRO nos routers: {e}", flush=True)
    raise

settings = get_settings()
print(f">>> settings ok — CORS: {settings.cors_origin_list}", flush=True)

app = FastAPI(title=settings.app_name)

_origins = settings.cors_origin_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials="*" not in _origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

print(">>> middleware CORS adicionado", flush=True)

app.include_router(clientes.router)
app.include_router(produtos.router)
app.include_router(vendas.router)
app.include_router(financeiro.router)


@app.options("/{path:path}")
async def preflight_handler():
    return {}


@app.get("/health")
async def health():
    return {"status": "ok", "service": settings.app_name}
