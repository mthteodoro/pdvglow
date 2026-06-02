from typing import Annotated

from fastapi import APIRouter, Depends, File, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_user
from app.database import get_db
from app.schemas.produtos import ImportPreviewResponse, ProdutoCreate, ProdutoOut, ProdutoUpdate
from app.services import produtos_service

router = APIRouter(prefix="/produtos", tags=["produtos"], dependencies=[Depends(require_user)])


@router.post("", response_model=ProdutoOut, status_code=status.HTTP_201_CREATED)
async def criar(payload: ProdutoCreate, db: Annotated[AsyncSession, Depends(get_db)]):
    return await produtos_service.criar_produto(db, payload)


@router.get("", response_model=list[ProdutoOut])
async def listar(
    db: Annotated[AsyncSession, Depends(get_db)],
    busca: str | None = None,
    produto_id: str | None = None,
):
    return await produtos_service.listar_produtos(db, busca, produto_id)


@router.put("/{produto_id}", response_model=ProdutoOut)
async def atualizar(produto_id: str, payload: ProdutoUpdate, db: Annotated[AsyncSession, Depends(get_db)]):
    return await produtos_service.atualizar_produto(db, produto_id, payload)


@router.delete("/{produto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir(produto_id: str, db: Annotated[AsyncSession, Depends(get_db)]):
    await produtos_service.excluir_produto(db, produto_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/importar-excel", response_model=ImportPreviewResponse | list[ProdutoOut])
async def importar_excel(
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
    preview: bool = False,
):
    produtos = await produtos_service.ler_excel(file)
    if preview:
        return await produtos_service.preview_importacao(db, produtos)
    return await produtos_service.importar_produtos(db, produtos)
