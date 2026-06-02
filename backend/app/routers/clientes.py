from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_user
from app.database import get_db
from app.schemas.clientes import ClienteCreate, ClienteOut, ClienteUpdate
from app.services import clientes_service

router = APIRouter(prefix="/clientes", tags=["clientes"], dependencies=[Depends(require_user)])


@router.post("", response_model=ClienteOut, status_code=status.HTTP_201_CREATED)
async def criar(payload: ClienteCreate, db: Annotated[AsyncSession, Depends(get_db)]):
    return await clientes_service.criar_cliente(db, payload)


@router.get("", response_model=list[ClienteOut])
async def listar(db: Annotated[AsyncSession, Depends(get_db)], busca: str | None = None):
    return await clientes_service.listar_clientes(db, busca)


@router.put("/{cliente_id}", response_model=ClienteOut)
async def atualizar(cliente_id: str, payload: ClienteUpdate, db: Annotated[AsyncSession, Depends(get_db)]):
    return await clientes_service.atualizar_cliente(db, cliente_id, payload)


@router.delete("/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir(cliente_id: str, db: Annotated[AsyncSession, Depends(get_db)]):
    await clientes_service.excluir_cliente(db, cliente_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
