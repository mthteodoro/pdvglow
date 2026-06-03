from datetime import datetime, time
import zoneinfo
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Cliente, MovimentoFinanceiro, Produto, Venda
from app.schemas.financeiro import DashboardOut, MovimentoCreate


async def listar_movimentos(db: AsyncSession) -> list[MovimentoFinanceiro]:
    stmt = select(MovimentoFinanceiro).order_by(MovimentoFinanceiro.created_at.desc())
    return list((await db.execute(stmt)).scalars())


async def criar_movimento(db: AsyncSession, payload: MovimentoCreate) -> MovimentoFinanceiro:
    movimento = MovimentoFinanceiro(**payload.model_dump())
    db.add(movimento)
    await db.commit()
    await db.refresh(movimento)
    return movimento


async def dashboard(db: AsyncSession) -> DashboardOut:
    try:
        tz = zoneinfo.ZoneInfo("America/Sao_Paulo")
        hoje = datetime.combine(datetime.now(tz).date(), time.min, tzinfo=tz)
    except Exception:
        hoje = datetime.combine(datetime.now().date(), time.min)

    vendas_do_dia = await db.scalar(select(func.count(Venda.id)).where(Venda.created_at >= hoje))
    faturamento_do_dia = await db.scalar(select(func.coalesce(func.sum(Venda.total), 0)).where(Venda.created_at >= hoje))
    clientes = await db.scalar(select(func.count(Cliente.id)))
    produtos = await db.scalar(select(func.count(Produto.id)))
    total_estoque = await db.scalar(select(func.coalesce(func.sum(Produto.quantidade), 0)))
    saldo = await db.scalar(
        select(
            func.coalesce(
                func.sum(
                    case(
                        (MovimentoFinanceiro.tipo == "entrada", MovimentoFinanceiro.valor),
                        else_=-MovimentoFinanceiro.valor,
                    )
                ),
                0,
            )
        )
    )

    return DashboardOut(
        vendas_do_dia=vendas_do_dia or 0,
        faturamento_do_dia=Decimal(faturamento_do_dia or 0),
        clientes_cadastrados=clientes or 0,
        produtos_cadastrados=produtos or 0,
        total_em_estoque=total_estoque or 0,
        saldo_financeiro=Decimal(saldo or 0),
    )
