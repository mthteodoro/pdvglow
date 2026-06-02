from datetime import datetime
from decimal import Decimal
from enum import Enum
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class FinanceiroTipo(str, Enum):
    entrada = "entrada"
    saida = "saida"


class Cliente(Base):
    __tablename__ = "clientes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    nome: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    telefone: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(160))
    observacoes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Produto(Base):
    __tablename__ = "produtos"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    nome: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    quantidade: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    preco: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Venda(Base):
    __tablename__ = "vendas"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    cliente_id: Mapped[str | None] = mapped_column(ForeignKey("clientes.id", ondelete="SET NULL"))
    forma_pagamento: Mapped[str] = mapped_column(String(40), nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    itens: Mapped[list["VendaItem"]] = relationship(cascade="all, delete-orphan", lazy="selectin")


class VendaItem(Base):
    __tablename__ = "venda_itens"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    venda_id: Mapped[str] = mapped_column(ForeignKey("vendas.id", ondelete="CASCADE"), nullable=False)
    produto_id: Mapped[str] = mapped_column(ForeignKey("produtos.id"), nullable=False)
    produto_nome: Mapped[str] = mapped_column(String(180), nullable=False)
    quantidade: Mapped[int] = mapped_column(Integer, nullable=False)
    preco_unitario: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)


class MovimentoFinanceiro(Base):
    __tablename__ = "financeiro"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    descricao: Mapped[str] = mapped_column(String(220), nullable=False)
    valor: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    venda_id: Mapped[str | None] = mapped_column(ForeignKey("vendas.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
