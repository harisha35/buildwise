from collections import defaultdict

from sqlalchemy.orm import Session

from app.models.enums import StockMovementType
from app.models.material import Material, MaterialExpense, MaterialStockMovement
from app.schemas.material import MaterialStockBalanceOut


def resolve_total_cost(quantity: float, unit_price: float | None, total_cost: float | None) -> float | None:
    """FR-5.4: total cost is either supplied directly or derived from quantity * unit price."""
    if total_cost is not None:
        return total_cost
    if unit_price is not None:
        return round(quantity * unit_price, 2)
    return None


def build_stock_balances(
    db: Session, project_id: int, material_id: int | None = None
) -> list[MaterialStockBalanceOut]:
    """FR-5.6: current stock per material per project = Σ(in) − Σ(out) − Σ(wastage)."""
    query = db.query(MaterialStockMovement).filter(MaterialStockMovement.project_id == project_id)
    if material_id is not None:
        query = query.filter(MaterialStockMovement.material_id == material_id)

    totals: dict[int, dict[str, float]] = defaultdict(
        lambda: {"in": 0.0, "out": 0.0, "wastage": 0.0}
    )
    for movement in query.all():
        totals[movement.material_id][movement.type.value] += float(movement.quantity)

    if not totals:
        return []

    materials = {m.id: m for m in db.query(Material).filter(Material.id.in_(totals.keys())).all()}

    balances: list[MaterialStockBalanceOut] = []
    for mat_id, values in totals.items():
        material = materials.get(mat_id)
        balances.append(
            MaterialStockBalanceOut(
                material_id=mat_id,
                material_name=material.name if material else "",
                unit_label=material.unit.label if material and material.unit else None,
                project_id=project_id,
                quantity_in=values["in"],
                quantity_out=values["out"],
                quantity_wastage=values["wastage"],
                current_stock=values["in"] - values["out"] - values["wastage"],
            )
        )
    return sorted(balances, key=lambda b: b.material_name)


def material_spend_total(db: Session, project_ids: list[int] | None) -> float:
    """Σ material stock-in cost + Σ direct material expenses, per §6.6 profitability formula."""
    stock_in_query = db.query(MaterialStockMovement).filter(
        MaterialStockMovement.type == StockMovementType.stock_in
    )
    expense_query = db.query(MaterialExpense)
    if project_ids is not None:
        stock_in_query = stock_in_query.filter(
            MaterialStockMovement.project_id.in_(project_ids or [-1])
        )
        expense_query = expense_query.filter(MaterialExpense.project_id.in_(project_ids or [-1]))

    stock_in_total = sum(float(m.total_cost or 0) for m in stock_in_query.all())
    expense_total = sum(float(e.amount) for e in expense_query.all())
    return stock_in_total + expense_total
