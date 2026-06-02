from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import clientes, financeiro, produtos, vendas


settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
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
