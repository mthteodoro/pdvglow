from decimal import Decimal

import pandas as pd
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Produto
from app.schemas.produtos import ImportPreviewItem, ImportPreviewResponse, ProdutoCreate, ProdutoUpdate


async def listar_produtos(db: AsyncSession, busca: str | None = None, produto_id: str | None = None) -> list[Produto]:
    stmt = select(Produto).order_by(Produto.nome)
    if produto_id:
        stmt = stmt.where(Produto.id == produto_id)
    if busca:
        stmt = stmt.where(Produto.nome.ilike(f"%{busca}%"))
    return list((await db.execute(stmt)).scalars())


async def obter_produto(db: AsyncSession, produto_id: str) -> Produto:
    produto = await db.get(Produto, produto_id)
    if not produto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado")
    return produto


async def criar_produto(db: AsyncSession, payload: ProdutoCreate) -> Produto:
    if await db.get(Produto, payload.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Produto já existe")
    produto = Produto(**payload.model_dump())
    db.add(produto)
    await db.commit()
    await db.refresh(produto)
    return produto


async def atualizar_produto(db: AsyncSession, produto_id: str, payload: ProdutoUpdate) -> Produto:
    produto = await obter_produto(db, produto_id)
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(produto, campo, valor)
    await db.commit()
    await db.refresh(produto)
    return produto


async def excluir_produto(db: AsyncSession, produto_id: str) -> None:
    produto = await obter_produto(db, produto_id)
    await db.delete(produto)
    await db.commit()


async def ler_excel(file: UploadFile) -> list[ProdutoCreate]:
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Envie um arquivo .xlsx")

    try:
        dataframe = pd.read_excel(file.file, engine="openpyxl", header=None, usecols=[0, 1, 2, 3])
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Não foi possível ler o Excel") from exc

    produtos: list[ProdutoCreate] = []
    for index, row in dataframe.dropna(how="all").iterrows():
        try:
            produtos.append(
                ProdutoCreate(
                    id=str(row.iloc[0]).strip(),
                    nome=str(row.iloc[1]).strip(),
                    quantidade=int(row.iloc[2]),
                    preco=Decimal(str(row.iloc[3])),
                )
            )
        except Exception as exc:
            linha = index + 1
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Linha {linha} inválida") from exc
    return produtos


async def preview_importacao(db: AsyncSession, produtos: list[ProdutoCreate]) -> ImportPreviewResponse:
    itens: list[ImportPreviewItem] = []
    for produto in produtos:
        existe = await db.get(Produto, produto.id)
        itens.append(ImportPreviewItem(**produto.model_dump(), status="atualizar" if existe else "novo"))
    return ImportPreviewResponse(total_linhas=len(produtos), validos=len(itens), itens=itens)


async def importar_produtos(db: AsyncSession, produtos: list[ProdutoCreate]) -> list[Produto]:
    salvos: list[Produto] = []
    async with db.begin():
        for payload in produtos:
            produto = await db.get(Produto, payload.id)
            if produto:
                produto.nome = payload.nome
                produto.quantidade = payload.quantidade
                produto.preco = payload.preco
            else:
                produto = Produto(**payload.model_dump())
                db.add(produto)
            salvos.append(produto)
    for produto in salvos:
        await db.refresh(produto)
    return salvos
