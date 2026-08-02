import enum


class UserRole(str, enum.Enum):
    owner = "owner"
    contractor = "contractor"
    supervisor = "supervisor"
    accountant = "accountant"


class ProjectStatus(str, enum.Enum):
    planning = "planning"
    ongoing = "ongoing"
    on_hold = "on_hold"
    completed = "completed"


class ContractType(str, enum.Enum):
    fixed_price = "fixed_price"
    cost_plus = "cost_plus"
    other = "other"


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    half_day = "half_day"


class PaymentMode(str, enum.Enum):
    cash = "cash"
    bank_transfer = "bank_transfer"
    upi = "upi"


class PaymentStatus(str, enum.Enum):
    due = "due"
    paid = "paid"


class StockMovementType(str, enum.Enum):
    stock_in = "in"
    stock_out = "out"
    wastage = "wastage"


class QuotationStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    accepted = "accepted"
    rejected = "rejected"


class MilestoneStatus(str, enum.Enum):
    pending = "pending"
    invoiced = "invoiced"
    paid = "paid"


class InvoiceStatus(str, enum.Enum):
    unpaid = "unpaid"
    partially_paid = "partially_paid"
    paid = "paid"
    overdue = "overdue"
