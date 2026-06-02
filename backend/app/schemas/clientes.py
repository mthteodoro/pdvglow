from datetime import datetime

from pydantic import BaseModel, EmailStr


class ClienteBase(BaseModel):
    nome: str
    telefone: str | None = None
    email: EmailStr | None = None
    observacoes: str | None = None


class ClienteCreate(ClienteBase):
    pass


class ClienteUpdate(BaseModel):
    nome: str | None = None
    telefone: str | None = None
    email: EmailStr | None = None
    observacoes: str | None = None


class ClienteOut(ClienteBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True
