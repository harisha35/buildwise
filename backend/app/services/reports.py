from collections import defaultdict
from datetime import date

from sqlalchemy.orm import Session, joinedload

from app.models.attendance import Attendance
from app.models.enums import AttendanceStatus, InvoiceStatus, PaymentStatus, StockMovementType
from app.models.invoice import Invoice, InvoicePayment
from app.models.material import Material, MaterialExpense, MaterialStockMovement
from app.models.payment import WorkerPayment, WorkerPaymentProjectBreakdown
from app.models.project import Project
from app.schemas.report import (
    AttendanceSummaryReportOut,
    AttendanceSummaryRow,
    InvoiceReportOut,
    InvoiceReportRow,
    MaterialExpenseReportOut,
    MaterialExpenseRow,
    PaymentDuesReportOut,
    PaymentDuesRow,
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


def build_attendance_summary_report(
    db: Session,
    project_ids: list[int] | None,
    start_date: date | None,
    end_date: date | None,
) -> AttendanceSummaryReportOut:
    """FR-8.3 Attendance Summary: per worker/per project days present/absent/half-day/OT."""
    query = db.query(Attendance).options(
        joinedload(Attendance.worker), joinedload(Attendance.project)
    )
    query = _scope(query, Attendance.project_id, project_ids)
    if start_date is not None:
        query = query.filter(Attendance.date >= start_date)
    if end_date is not None:
        query = query.filter(Attendance.date <= end_date)

    totals: dict[tuple[int, int], dict[str, float]] = defaultdict(
        lambda: {"present": 0.0, "absent": 0.0, "half_day": 0.0, "ot_hours": 0.0}
    )
    names: dict[tuple[int, int], tuple[str, str]] = {}
    for row in query.all():
        key = (row.worker_id, row.project_id)
        bucket = totals[key]
        if row.status == AttendanceStatus.present:
            bucket["present"] += 1
        elif row.status == AttendanceStatus.absent:
            bucket["absent"] += 1
        elif row.status == AttendanceStatus.half_day:
            bucket["half_day"] += 1
        bucket["ot_hours"] += float(row.ot_hours)
        names[key] = (row.worker.name, row.project.name)

    rows = [
        AttendanceSummaryRow(
            worker_id=worker_id,
            worker_name=names[(worker_id, project_id)][0],
            project_id=project_id,
            project_name=names[(worker_id, project_id)][1],
            days_present=values["present"],
            days_absent=values["absent"],
            days_half_day=values["half_day"],
            ot_hours=values["ot_hours"],
        )
        for (worker_id, project_id), values in totals.items()
    ]
    rows.sort(key=lambda r: (r.worker_name, r.project_name))

    return AttendanceSummaryReportOut(
        rows=rows,
        total_days_present=sum(r.days_present for r in rows),
        total_days_absent=sum(r.days_absent for r in rows),
        total_days_half_day=sum(r.days_half_day for r in rows),
        total_ot_hours=sum(r.ot_hours for r in rows),
    )


def build_payment_dues_report(
    db: Session,
    project_ids: list[int] | None,
    start_date: date | None,
    end_date: date | None,
    status_filter: PaymentStatus | None = None,
) -> PaymentDuesReportOut:
    """FR-8.3 Payment Dues & History: worker-wise, filterable by date range and payment status."""
    query = db.query(WorkerPayment).options(joinedload(WorkerPayment.worker))
    if project_ids is not None:
        scoped_payment_ids = (
            db.query(WorkerPaymentProjectBreakdown.payment_id)
            .filter(WorkerPaymentProjectBreakdown.project_id.in_(project_ids or [-1]))
            .distinct()
        )
        query = query.filter(WorkerPayment.id.in_(scoped_payment_ids))
    if start_date is not None:
        query = query.filter(WorkerPayment.week_end >= start_date)
    if end_date is not None:
        query = query.filter(WorkerPayment.week_start <= end_date)
    if status_filter is not None:
        query = query.filter(WorkerPayment.status == status_filter)

    payments = query.order_by(WorkerPayment.week_start.desc()).all()

    rows = [
        PaymentDuesRow(
            payment_id=payment.id,
            worker_id=payment.worker_id,
            worker_name=payment.worker.name,
            week_start=payment.week_start,
            week_end=payment.week_end,
            gross_wage_due=float(payment.gross_wage_due),
            advance_deducted=float(payment.advance_deducted),
            net_paid=float(payment.net_paid) if payment.net_paid is not None else None,
            status=payment.status,
            payment_mode=payment.payment_mode.value if payment.payment_mode else None,
            paid_at=payment.paid_at.date() if payment.paid_at else None,
        )
        for payment in payments
    ]

    return PaymentDuesReportOut(
        rows=rows,
        total_gross_wage_due=sum(r.gross_wage_due for r in rows),
        total_net_paid=sum(r.net_paid or 0.0 for r in rows),
        due_count=sum(1 for r in rows if r.status == PaymentStatus.due),
        paid_count=sum(1 for r in rows if r.status == PaymentStatus.paid),
    )


def build_material_expense_report(
    db: Session,
    project_ids: list[int] | None,
    start_date: date | None,
    end_date: date | None,
) -> MaterialExpenseReportOut:
    """FR-8.3 Material Expense Report: per project, per material/category."""
    stock_query = db.query(MaterialStockMovement).filter(
        MaterialStockMovement.type == StockMovementType.stock_in
    )
    stock_query = _scope(stock_query, MaterialStockMovement.project_id, project_ids)
    expense_query = db.query(MaterialExpense)
    expense_query = _scope(expense_query, MaterialExpense.project_id, project_ids)
    if start_date is not None:
        stock_query = stock_query.filter(MaterialStockMovement.date >= start_date)
        expense_query = expense_query.filter(MaterialExpense.date >= start_date)
    if end_date is not None:
        stock_query = stock_query.filter(MaterialStockMovement.date <= end_date)
        expense_query = expense_query.filter(MaterialExpense.date <= end_date)

    stock_by_key: dict[tuple[int, int | None], float] = defaultdict(float)
    for movement in stock_query.all():
        stock_by_key[(movement.project_id, movement.material_id)] += float(movement.total_cost or 0)

    expense_by_key: dict[tuple[int, int | None], float] = defaultdict(float)
    for expense in expense_query.all():
        expense_by_key[(expense.project_id, expense.material_id)] += float(expense.amount)

    keys = set(stock_by_key) | set(expense_by_key)
    projects = {}
    if keys:
        project_ids_in_scope = {k[0] for k in keys}
        projects = {p.id: p for p in db.query(Project).filter(Project.id.in_(project_ids_in_scope)).all()}
    materials = {}
    material_ids = {mid for _, mid in keys if mid is not None}
    if material_ids:
        materials = {m.id: m for m in db.query(Material).filter(Material.id.in_(material_ids)).all()}

    rows = []
    for project_id, material_id in keys:
        project = projects.get(project_id)
        material = materials.get(material_id) if material_id is not None else None
        stock_cost = stock_by_key.get((project_id, material_id), 0.0)
        expense_amount = expense_by_key.get((project_id, material_id), 0.0)
        rows.append(
            MaterialExpenseRow(
                project_id=project_id,
                project_name=project.name if project else "",
                material_id=material_id,
                material_name=material.name if material else "Unspecified",
                category=material.category if material else None,
                stock_in_cost=stock_cost,
                direct_expense_amount=expense_amount,
                total_cost=stock_cost + expense_amount,
            )
        )
    rows.sort(key=lambda r: (r.project_name, r.material_name))

    return MaterialExpenseReportOut(
        rows=rows,
        total_stock_in_cost=sum(r.stock_in_cost for r in rows),
        total_direct_expense_amount=sum(r.direct_expense_amount for r in rows),
        total_cost=sum(r.total_cost for r in rows),
    )
