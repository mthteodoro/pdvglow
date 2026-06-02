from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Cliente
from app.schemas.clientes import ClienteCreate, ClienteUpdate


async def listar_clientes(db: AsyncSession, busca: str | None = None) -> list[Cliente]:
    stmt = select(Cliente).order_by(Cliente.nome)
    if busca:
        stmt = stmt.where(Cliente.nome.ilike(f"%{busca}%"))
    return list((await db.execute(stmt)).scalars())


async def obter_cliente(db: AsyncSession, cliente_id: str) -> Cliente:
    cliente = await db.get(Cliente, cliente_id)
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado")
    return cliente


async def criar_cliente(db: AsyncSession, payload: ClienteCreate) -> Cliente:
    cliente = Cliente(**payload.model_dump())
    db.add(cliente)
    await db.commit()
    await db.refresh(cliente)
    return cliente


async def atualizar_cliente(db: AsyncSession, cliente_id: str, payload: ClienteUpdate) -> Cliente:
    cliente = await obter_cliente(db, cliente_id)
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(cliente, campo, valor)
    await db.commit()
    await db.refresh(cliente)
    return cliente


async def excluir_cliente(db: AsyncSession, cliente_id: str) -> None:
    cliente = await obter_cliente(db, cliente_id)
    await db.delete(cliente)
    await db.commit()
