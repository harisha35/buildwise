from datetime import date

import pytest

from app.models.enums import StockMovementType
from app.models.material import Material, MaterialExpense, MaterialStockMovement, UnitOfMeasure
from app.models.project import Project
from app.services.materials import build_stock_balances, material_spend_total, resolve_total_cost


@pytest.fixture
def project(db):
    project = Project(name="Site A")
    db.add(project)
    db.flush()
    return project


@pytest.fixture
def material(db):
    unit = UnitOfMeasure(code="bag", label="Bag")
    db.add(unit)
    db.flush()
    material = Material(name="Cement", unit_id=unit.id)
    db.add(material)
    db.flush()
    return material


def test_resolve_total_cost_prefers_explicit_value():
    assert resolve_total_cost(10, 50, 400) == 400


def test_resolve_total_cost_derives_from_unit_price():
    assert resolve_total_cost(10, 55.5, None) == 555


def test_resolve_total_cost_none_when_no_price_info():
    assert resolve_total_cost(10, None, None) is None


def test_stock_balance_nets_in_out_wastage(db, project, material):
    db.add_all(
        [
            MaterialStockMovement(
                material_id=material.id,
                project_id=project.id,
                type=StockMovementType.stock_in,
                quantity=100,
                unit_price=10,
                total_cost=1000,
                date=date(2026, 8, 1),
            ),
            MaterialStockMovement(
                material_id=material.id,
                project_id=project.id,
                type=StockMovementType.stock_out,
                quantity=30,
                date=date(2026, 8, 2),
            ),
            MaterialStockMovement(
                material_id=material.id,
                project_id=project.id,
                type=StockMovementType.wastage,
                quantity=5,
                date=date(2026, 8, 3),
            ),
        ]
    )
    db.flush()

    balances = build_stock_balances(db, project.id)
    assert len(balances) == 1
    balance = balances[0]
    assert balance.material_name == "Cement"
    assert balance.unit_label == "Bag"
    assert balance.quantity_in == 100
    assert balance.quantity_out == 30
    assert balance.quantity_wastage == 5
    assert balance.current_stock == 65


def test_material_spend_total_sums_stock_in_and_expenses(db, project, material):
    db.add_all(
        [
            MaterialStockMovement(
                material_id=material.id,
                project_id=project.id,
                type=StockMovementType.stock_in,
                quantity=100,
                unit_price=10,
                total_cost=1000,
                date=date(2026, 8, 1),
            ),
            MaterialStockMovement(
                material_id=material.id,
                project_id=project.id,
                type=StockMovementType.wastage,
                quantity=5,
                date=date(2026, 8, 3),
            ),
            MaterialExpense(
                project_id=project.id,
                material_id=material.id,
                amount=250,
                date=date(2026, 8, 4),
            ),
        ]
    )
    db.flush()

    # Wastage cost is not double-counted; only stock-in cost + direct expenses count.
    assert material_spend_total(db, None) == 1250
    assert material_spend_total(db, [project.id]) == 1250
    assert material_spend_total(db, [project.id + 999]) == 0
