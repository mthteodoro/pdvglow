from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_admin, require_user
from app.database import get_db
from app.schemas.financeiro import DashboardOut, MovimentoCreate, MovimentoOut
from app.services import financeiro_service

router = APIRouter(tags=["financeiro"], dependencies=[Depends(require_user)])


@router.post("/financeiro", response_model=MovimentoOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
async def criar(payload: MovimentoCreate, db: Annotated[AsyncSession, Depends(get_db)]):
    return await financeiro_service.criar_movimento(db, payload)


@router.get("/financeiro", response_model=list[MovimentoOut], dependencies=[Depends(require_admin)])
async def listar(db: Annotated[AsyncSession, Depends(get_db)]):
    return await financeiro_service.listar_movimentos(db)


@router.get("/dashboard", response_model=DashboardOut)
async def dashboard(db: Annotated[AsyncSession, Depends(get_db)]):
    return await financeiro_service.dashboard(db)
