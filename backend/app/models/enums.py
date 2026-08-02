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
