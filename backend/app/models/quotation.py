from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import QuotationStatus


class Quotation(TimestampMixin, Base):
    __tablename__ = "quotations"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_name: Mapped[str] = mapped_column(String(200), nullable=False)
    project_description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    project_ref_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"), nullable=True)
    total_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    validity_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    terms: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[QuotationStatus] = mapped_column(
        Enum(QuotationStatus, name="quotation_status"), default=QuotationStatus.draft, nullable=False
    )
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    project_ref: Mapped["Project | None"] = relationship()  # noqa: F821
    line_items: Mapped[list["QuotationLineItem"]] = relationship(
        back_populates="quotation", cascade="all, delete-orphan", order_by="QuotationLineItem.sort_order"
    )


class QuotationLineItem(Base):
    __tablename__ = "quotation_line_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    quotation_id: Mapped[int] = mapped_column(
        ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False
    )
    description: Mapped[str] = mapped_column(String(300), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    rate: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    quotation: Mapped["Quotation"] = relationship(back_populates="line_items")
