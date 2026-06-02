from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ProdutoBase(BaseModel):
    id: str
    nome: str
    quantidade: int = Field(ge=0)
    preco: Decimal = Field(ge=0)


class ProdutoCreate(ProdutoBase):
    pass


class ProdutoUpdate(BaseModel):
    nome: str | None = None
    quantidade: int | None = Field(default=None, ge=0)
    preco: Decimal | None = Field(default=None, ge=0)


class ProdutoOut(ProdutoBase):
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ImportPreviewItem(ProdutoBase):
    status: str


class ImportPreviewResponse(BaseModel):
    total_linhas: int
    validos: int
    itens: list[ImportPreviewItem]
