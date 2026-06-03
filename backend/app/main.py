import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import clientes, financeiro, produtos, vendas

logger = logging.getLogger("glow")

settings = get_settings()

app = FastAPI(title=settings.app_name)

_origins = settings.cors_origin_list
logger.warning("CORS origins: %s", _origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials="*" not in _origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clientes.router)
app.include_router(produtos.router)
app.include_router(vendas.router)
app.include_router(financeiro.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": settings.app_name}
