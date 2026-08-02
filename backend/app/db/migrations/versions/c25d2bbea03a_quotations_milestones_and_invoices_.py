"""quotations, milestones, and invoices (phase 3)

Revision ID: c25d2bbea03a
Revises: 948ad50b7a78
Create Date: 2026-08-02 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'c25d2bbea03a'
down_revision: Union[str, Sequence[str], None] = '948ad50b7a78'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('quotations',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('client_name', sa.String(length=200), nullable=False),
    sa.Column('project_description', sa.String(length=500), nullable=True),
    sa.Column('project_ref_id', sa.Integer(), nullable=True),
    sa.Column('total_amount', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('validity_date', sa.Date(), nullable=True),
    sa.Column('terms', sa.Text(), nullable=True),
    sa.Column('status', sa.Enum('draft', 'sent', 'accepted', 'rejected', name='quotation_status'), nullable=False),
    sa.Column('created_by', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['project_ref_id'], ['projects.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('quotation_line_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('quotation_id', sa.Integer(), nullable=False),
    sa.Column('description', sa.String(length=300), nullable=False),
    sa.Column('quantity', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('rate', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('sort_order', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['quotation_id'], ['quotations.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('milestones',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('project_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('status', sa.Enum('pending', 'invoiced', 'paid', name='milestone_status'), nullable=False),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('invoices',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('project_id', sa.Integer(), nullable=False),
    sa.Column('client_name', sa.String(length=200), nullable=False),
    sa.Column('total_amount', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('invoice_date', sa.Date(), nullable=False),
    sa.Column('due_date', sa.Date(), nullable=True),
    sa.Column('status', sa.Enum('unpaid', 'partially_paid', 'paid', 'overdue', name='invoice_status'), nullable=False),
    sa.Column('created_by', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('invoice_milestones',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('invoice_id', sa.Integer(), nullable=False),
    sa.Column('milestone_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['milestone_id'], ['milestones.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('invoice_line_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('invoice_id', sa.Integer(), nullable=False),
    sa.Column('description', sa.String(length=300), nullable=False),
    sa.Column('quantity', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('rate', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('sort_order', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('invoice_payments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('invoice_id', sa.Integer(), nullable=False),
    sa.Column('amount', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('date', sa.Date(), nullable=False),
    # payment_mode already exists (created by worker_payments in the baseline migration) — reused here,
    # so create_type=False avoids a duplicate CREATE TYPE / and a duplicate DROP TYPE on downgrade.
    sa.Column('mode', postgresql.ENUM('cash', 'bank_transfer', 'upi', name='payment_mode', create_type=False), nullable=False),
    sa.Column('note', sa.String(length=300), nullable=True),
    sa.Column('recorded_by', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default='now()', nullable=False),
    sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['recorded_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('invoice_payments')
    op.drop_table('invoice_line_items')
    op.drop_table('invoice_milestones')
    op.drop_table('invoices')
    op.drop_table('milestones')
    op.drop_table('quotation_line_items')
    op.drop_table('quotations')
    sa.Enum(name='invoice_status').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='milestone_status').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='quotation_status').drop(op.get_bind(), checkfirst=True)
