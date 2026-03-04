"""add zip_path to scans

Revision ID: f7e84ffbd038
Revises: d34849e6b738
Create Date: 2026-03-02 15:25:50.740723

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7e84ffbd038'
down_revision: Union[str, Sequence[str], None] = 'd34849e6b738'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("scans", sa.Column("zip_path", sa.String(length=1000), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("scans", "zip_path")
