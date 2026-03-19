"""add progress fields to scans

Revision ID: c4482c564b5c
Revises: d74b2f53248d
Create Date: 2026-03-18 16:59:47.401784

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4482c564b5c'
down_revision: Union[str, Sequence[str], None] = 'd74b2f53248d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "scans",
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "scans",
        sa.Column("current_step", sa.String(length=100), nullable=False, server_default="queued"),
    )
    op.add_column(
        "scans",
        sa.Column("status_message", sa.String(length=500), nullable=True, server_default="Scan queued"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("scans", "status_message")
    op.drop_column("scans", "current_step")
    op.drop_column("scans", "progress")