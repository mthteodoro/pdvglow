from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class MovimentoCreate(BaseModel):
    tipo: str = Field(pattern="^(entrada|saida)$")
    descricao: str
    valor: Decimal = Field(gt=0)


class MovimentoOut(MovimentoCreate):
    id: str
    venda_id: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardOut(BaseModel):
    vendas_do_dia: int
    faturamento_do_dia: Decimal
    clientes_cadastrados: int
    produtos_cadastrados: int
    total_em_estoque: int
    saldo_financeiro: Decimal
