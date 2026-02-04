"""Add gateway skyll flag and agent templates.

Revision ID: c1c8b3b9f4d1
Revises: 939a1d2dc607
Create Date: 2026-02-04 22:18:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
import sqlmodel
from alembic import op

# revision identifiers, used by Alembic.
revision = "c1c8b3b9f4d1"
down_revision = "939a1d2dc607"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    created_gateways = False
    if "gateways" not in tables and "gateway_configs" not in tables:
        op.create_table(
            "gateways",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("url", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("token", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
            sa.Column(
                "main_session_key", sqlmodel.sql.sqltypes.AutoString(), nullable=False
            ),
            sa.Column(
                "workspace_root", sqlmodel.sql.sqltypes.AutoString(), nullable=False
            ),
            sa.Column(
                "skyll_enabled",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        tables.add("gateways")
        created_gateways = True
    if "gateways" in tables and not created_gateways:
        existing_columns = {
            column["name"] for column in inspector.get_columns("gateways")
        }
        if "skyll_enabled" in existing_columns:
            pass
        else:
            op.add_column(
                "gateways",
                sa.Column(
                    "skyll_enabled",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.false(),
                ),
            )
            op.alter_column("gateways", "skyll_enabled", server_default=None)
    elif "gateways" in tables and created_gateways:
        op.alter_column("gateways", "skyll_enabled", server_default=None)
    elif "gateway_configs" in tables:
        existing_columns = {
            column["name"] for column in inspector.get_columns("gateway_configs")
        }
        if "skyll_enabled" in existing_columns:
            pass
        else:
            op.add_column(
                "gateway_configs",
                sa.Column(
                    "skyll_enabled",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.false(),
                ),
            )
            op.alter_column("gateway_configs", "skyll_enabled", server_default=None)
    op.add_column(
        "agents",
        sa.Column("identity_template", sa.Text(), nullable=True),
    )
    op.add_column(
        "agents",
        sa.Column("soul_template", sa.Text(), nullable=True),
    )
def downgrade() -> None:
    op.drop_column("agents", "soul_template")
    op.drop_column("agents", "identity_template")
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "gateways" in tables:
        op.drop_column("gateways", "skyll_enabled")
    elif "gateway_configs" in tables:
        op.drop_column("gateway_configs", "skyll_enabled")
