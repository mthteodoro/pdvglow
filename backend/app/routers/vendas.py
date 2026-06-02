from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_user
from app.database import get_db
from app.schemas.vendas import VendaCreate, VendaOut
from app.services import vendas_service

router = APIRouter(prefix="/vendas", tags=["vendas"], dependencies=[Depends(require_user)])


@router.post("", response_model=VendaOut, status_code=status.HTTP_201_CREATED)
async def criar(payload: VendaCreate, db: Annotated[AsyncSession, Depends(get_db)]):
    return await vendas_service.criar_venda(db, payload)


@router.get("", response_model=list[VendaOut])
async def listar(db: Annotated[AsyncSession, Depends(get_db)]):
    return await vendas_service.listar_vendas(db)
