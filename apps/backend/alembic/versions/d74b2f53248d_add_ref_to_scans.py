from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd74b2f53248d'
down_revision = 'f7e84ffbd038'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('scans', sa.Column('ref', sa.String(length=200), nullable=True))


def downgrade():
    op.drop_column('scans', 'ref')
