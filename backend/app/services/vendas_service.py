from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Cliente, MovimentoFinanceiro, Produto, Venda, VendaItem
from app.schemas.vendas import VendaCreate


async def listar_vendas(db: AsyncSession) -> list[Venda]:
    stmt = select(Venda).options(selectinload(Venda.itens)).order_by(Venda.created_at.desc())
    return list((await db.execute(stmt)).scalars())


async def criar_venda(db: AsyncSession, payload: VendaCreate) -> Venda:
    total = Decimal("0")
    itens_venda: list[VendaItem] = []

    async with db.begin():
        if payload.cliente_id and not await db.get(Cliente, payload.cliente_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado")

        venda = Venda(cliente_id=payload.cliente_id, forma_pagamento=payload.forma_pagamento, total=Decimal("0"))
        db.add(venda)
        await db.flush()

        for item in payload.itens:
            produto = await db.get(Produto, item.produto_id, with_for_update=True)
            if not produto:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Produto {item.produto_id} não encontrado")
            if produto.quantidade < item.quantidade:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Estoque insuficiente para {produto.nome}",
                )

            subtotal = produto.preco * item.quantidade
            produto.quantidade -= item.quantidade
            total += subtotal
            venda_item = VendaItem(
                venda_id=venda.id,
                produto_id=produto.id,
                produto_nome=produto.nome,
                quantidade=item.quantidade,
                preco_unitario=produto.preco,
                subtotal=subtotal,
            )
            db.add(venda_item)
            itens_venda.append(venda_item)

        venda.total = total
        db.add(
            MovimentoFinanceiro(
                tipo="entrada",
                descricao=f"Venda {venda.id}",
                valor=total,
                venda_id=venda.id,
            )
        )

    venda.itens = itens_venda
    await db.refresh(venda)
    return venda
