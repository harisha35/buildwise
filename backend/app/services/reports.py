from collections import defaultdict
from datetime import date

from sqlalchemy.orm import Session, joinedload

from app.models.enums import InvoiceStatus, StockMovementType
from app.models.invoice import Invoice, InvoicePayment
from app.models.material import MaterialExpense, MaterialStockMovement
from app.models.payment import WorkerPayment, WorkerPaymentProjectBreakdown
from app.models.project import Project
from app.schemas.report import (
    InvoiceReportOut,
    InvoiceReportRow,
    ProfitabilityReportOut,
    ProfitabilityRow,
)


def _scope(query, column, project_ids: list[int] | None):
    if project_ids is not None:
        query = query.filter(column.in_(project_ids or [-1]))
    return query


def build_invoice_report(
    db: Session,
    project_ids: list[int] | None,
    start_date: date | None,
    end_date: date | None,
    status_filter: InvoiceStatus | None = None,
) -> InvoiceReportOut:
    """FR-8.3 Invoice & Client Payment Report: outstanding, overdue, paid — filterable by date range."""
    query = db.query(Invoice).options(joinedload(Invoice.project), joinedload(Invoice.payments))
    query = _scope(query, Invoice.project_id, project_ids)
    if start_date is not None:
        query = query.filter(Invoice.invoice_date >= start_date)
    if end_date is not None:
        query = query.filter(Invoice.invoice_date <= end_date)
    if status_filter is not None:
        query = query.filter(Invoice.status == status_filter)
    invoices = query.order_by(Invoice.invoice_date.desc()).all()

    rows: list[InvoiceReportRow] = []
    total_invoiced = total_received = total_outstanding = 0.0
    counts = dict.fromkeys(InvoiceStatus, 0)
    for invoice in invoices:
        received = sum(float(p.amount) for p in invoice.payments)
        total = float(invoice.total_amount)
        rows.append(
            InvoiceReportRow(
                invoice_id=invoice.id,
                project_id=invoice.project_id,
                project_name=invoice.project.name,
                client_name=invoice.client_name,
                invoice_date=invoice.invoice_date,
                due_date=invoice.due_date,
                total_amount=total,
                amount_received=received,
                amount_outstanding=total - received,
                status=invoice.status,
            )
        )
        total_invoiced += total
        total_received += received
        total_outstanding += total - received
        counts[invoice.status] += 1

    return InvoiceReportOut(
        rows=rows,
        total_invoiced=total_invoiced,
        total_received=total_received,
        total_outstanding=total_outstanding,
        overdue_count=counts[InvoiceStatus.overdue],
        unpaid_count=counts[InvoiceStatus.unpaid],
        partially_paid_count=counts[InvoiceStatus.partially_paid],
        paid_count=counts[InvoiceStatus.paid],
    )


def build_profitability_report(
    db: Session,
    project_ids: list[int] | None,
    start_date: date | None,
    end_date: date | None,
) -> ProfitabilityReportOut:
    """FR-8.3 Project Profitability: Σ(invoice payments received) − (Σ labour cost + Σ material cost),
    per project."""
    project_query = _scope(
        db.query(Project).filter(Project.is_deleted.is_(False)), Project.id, project_ids
    )
    projects = project_query.order_by(Project.id).all()
    scope = [p.id for p in projects]

    received_by_project: dict[int, float] = defaultdict(float)
    labour_by_project: dict[int, float] = defaultdict(float)
    material_by_project: dict[int, float] = defaultdict(float)

    if scope:
        payment_query = (
            db.query(Invoice.project_id, InvoicePayment.amount)
            .join(InvoicePayment, InvoicePayment.invoice_id == Invoice.id)
            .filter(Invoice.project_id.in_(scope))
        )
        if start_date is not None:
            payment_query = payment_query.filter(InvoicePayment.date >= start_date)
        if end_date is not None:
            payment_query = payment_query.filter(InvoicePayment.date <= end_date)
        for project_id, amount in payment_query.all():
            received_by_project[project_id] += float(amount)

        labour_query = (
            db.query(WorkerPaymentProjectBreakdown.project_id, WorkerPaymentProjectBreakdown.amount)
            .join(WorkerPayment, WorkerPayment.id == WorkerPaymentProjectBreakdown.payment_id)
            .filter(WorkerPaymentProjectBreakdown.project_id.in_(scope))
        )
        if start_date is not None:
            labour_query = labour_query.filter(WorkerPayment.week_start >= start_date)
        if end_date is not None:
            labour_query = labour_query.filter(WorkerPayment.week_end <= end_date)
        for project_id, amount in labour_query.all():
            labour_by_project[project_id] += float(amount)

        stock_query = db.query(
            MaterialStockMovement.project_id, MaterialStockMovement.total_cost
        ).filter(
            MaterialStockMovement.project_id.in_(scope),
            MaterialStockMovement.type == StockMovementType.stock_in,
        )
        expense_query = db.query(MaterialExpense.project_id, MaterialExpense.amount).filter(
            MaterialExpense.project_id.in_(scope)
        )
        if start_date is not None:
            stock_query = stock_query.filter(MaterialStockMovement.date >= start_date)
            expense_query = expense_query.filter(MaterialExpense.date >= start_date)
        if end_date is not None:
            stock_query = stock_query.filter(MaterialStockMovement.date <= end_date)
            expense_query = expense_query.filter(MaterialExpense.date <= end_date)
        for project_id, cost in stock_query.all():
            material_by_project[project_id] += float(cost or 0)
        for project_id, amount in expense_query.all():
            material_by_project[project_id] += float(amount)

    rows = [
        ProfitabilityRow(
            project_id=project.id,
            project_name=project.name,
            amount_received=received_by_project.get(project.id, 0.0),
            labour_cost=labour_by_project.get(project.id, 0.0),
            material_cost=material_by_project.get(project.id, 0.0),
            profit=received_by_project.get(project.id, 0.0)
            - (labour_by_project.get(project.id, 0.0) + material_by_project.get(project.id, 0.0)),
        )
        for project in projects
    ]

    return ProfitabilityReportOut(
        rows=rows,
        total_amount_received=sum(r.amount_received for r in rows),
        total_labour_cost=sum(r.labour_cost for r in rows),
        total_material_cost=sum(r.material_cost for r in rows),
        total_profit=sum(r.profit for r in rows),
    )
