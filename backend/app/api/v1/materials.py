from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import accessible_project_ids, check_project_access, require_capability
from app.db.session import get_db
from app.models.material import (
    Material,
    MaterialExpense,
    MaterialStockMovement,
    Supplier,
    UnitOfMeasure,
)
from app.models.user import User
from app.schemas.material import (
    MaterialCreate,
    MaterialExpenseCreate,
    MaterialExpenseOut,
    MaterialOut,
    MaterialStockBalanceOut,
    MaterialUpdate,
    StockMovementCreate,
    StockMovementOut,
    SupplierCreate,
    SupplierOut,
    SupplierUpdate,
    UnitOfMeasureCreate,
    UnitOfMeasureOut,
)
from app.services.materials import build_stock_balances, resolve_total_cost

units_router = APIRouter(prefix="/units-of-measure", tags=["units-of-measure"])
suppliers_router = APIRouter(prefix="/suppliers", tags=["suppliers"])
materials_router = APIRouter(prefix="/materials", tags=["materials"])
stock_router = APIRouter(prefix="/stock", tags=["stock"])
material_expenses_router = APIRouter(prefix="/material-expenses", tags=["material-expenses"])


@units_router.get("", response_model=list[UnitOfMeasureOut])
def list_units(
    db: Session = Depends(get_db), _: User = Depends(require_capability("materials:read"))
) -> list[UnitOfMeasure]:
    return db.query(UnitOfMeasure).order_by(UnitOfMeasure.id).all()


@units_router.post("", response_model=UnitOfMeasureOut, status_code=status.HTTP_201_CREATED)
def create_unit(
    payload: UnitOfMeasureCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("units:write")),
) -> UnitOfMeasure:
    unit = UnitOfMeasure(**payload.model_dump())
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@suppliers_router.get("", response_model=list[SupplierOut])
def list_suppliers(
    db: Session = Depends(get_db), _: User = Depends(require_capability("suppliers:read"))
) -> list[Supplier]:
    return db.query(Supplier).filter(Supplier.is_active.is_(True)).order_by(Supplier.id).all()


@suppliers_router.post("", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("suppliers:write")),
) -> Supplier:
    supplier = Supplier(**payload.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@suppliers_router.patch("/{supplier_id}", response_model=SupplierOut)
def update_supplier(
    supplier_id: int,
    payload: SupplierUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("suppliers:write")),
) -> Supplier:
    supplier = db.get(Supplier, supplier_id)
    if supplier is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    return supplier


@materials_router.get("", response_model=list[MaterialOut])
def list_materials(
    db: Session = Depends(get_db), _: User = Depends(require_capability("materials:read"))
) -> list[Material]:
    return db.query(Material).filter(Material.is_active.is_(True)).order_by(Material.id).all()


@materials_router.get("/{material_id}", response_model=MaterialOut)
def get_material(
    material_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("materials:read")),
) -> Material:
    material = db.get(Material, material_id)
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
    return material


@materials_router.post("", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
def create_material(
    payload: MaterialCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("materials:write")),
) -> Material:
    material = Material(**payload.model_dump())
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@materials_router.patch("/{material_id}", response_model=MaterialOut)
def update_material(
    material_id: int,
    payload: MaterialUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("materials:write")),
) -> Material:
    material = db.get(Material, material_id)
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(material, field, value)
    db.commit()
    db.refresh(material)
    return material


@stock_router.get("", response_model=list[MaterialStockBalanceOut])
def get_stock_balances(
    project_id: int,
    material_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("stock:read")),
) -> list[MaterialStockBalanceOut]:
    check_project_access(db, current_user, project_id)
    return build_stock_balances(db, project_id, material_id)


@stock_router.post(
    "/movements", response_model=StockMovementOut, status_code=status.HTTP_201_CREATED
)
def record_stock_movement(
    payload: StockMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("stock:write")),
) -> MaterialStockMovement:
    check_project_access(db, current_user, payload.project_id)
    material = db.get(Material, payload.material_id)
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    movement = MaterialStockMovement(
        material_id=payload.material_id,
        project_id=payload.project_id,
        type=payload.type,
        quantity=payload.quantity,
        unit_price=payload.unit_price,
        total_cost=resolve_total_cost(payload.quantity, payload.unit_price, payload.total_cost),
        supplier_id=payload.supplier_id,
        date=payload.date,
        note=payload.note,
        recorded_by=current_user.id,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement


@material_expenses_router.get("", response_model=list[MaterialExpenseOut])
def list_material_expenses(
    project_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("material_expenses:read")),
) -> list[MaterialExpense]:
    if project_id is not None:
        check_project_access(db, current_user, project_id)

    query = db.query(MaterialExpense)
    ids = accessible_project_ids(db, current_user)
    if ids is not None:
        query = query.filter(MaterialExpense.project_id.in_(ids or [-1]))
    if project_id is not None:
        query = query.filter(MaterialExpense.project_id == project_id)
    if start_date is not None:
        query = query.filter(MaterialExpense.date >= start_date)
    if end_date is not None:
        query = query.filter(MaterialExpense.date <= end_date)
    return query.order_by(MaterialExpense.date.desc()).all()


@material_expenses_router.post(
    "", response_model=MaterialExpenseOut, status_code=status.HTTP_201_CREATED
)
def create_material_expense(
    payload: MaterialExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("material_expenses:write")),
) -> MaterialExpense:
    check_project_access(db, current_user, payload.project_id)
    expense = MaterialExpense(**payload.model_dump(), recorded_by=current_user.id)
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense
