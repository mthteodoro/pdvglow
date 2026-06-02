from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class VendaItemCreate(BaseModel):
    produto_id: str
    quantidade: int = Field(gt=0)


class VendaCreate(BaseModel):
    cliente_id: str | None = None
    forma_pagamento: str
    itens: list[VendaItemCreate] = Field(min_length=1)


class VendaItemOut(BaseModel):
    id: str
    produto_id: str
    produto_nome: str
    quantidade: int
    preco_unitario: Decimal
    subtotal: Decimal

    class Config:
        from_attributes = True


class VendaOut(BaseModel):
    id: str
    cliente_id: str | None
    forma_pagamento: str
    total: Decimal
    created_at: datetime
    itens: list[VendaItemOut] = []

    class Config:
        from_attributes = True
