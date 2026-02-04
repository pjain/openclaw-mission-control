"""Rename gateways to gateway.

Revision ID: 4b2a5e2dbb6e
Revises: c1c8b3b9f4d1
Create Date: 2026-02-04 18:20:00.000000
"""

from alembic import op
import sqlalchemy as sa
import sqlmodel

revision = "4b2a5e2dbb6e"
down_revision = "c1c8b3b9f4d1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "gateway_configs" in tables and "gateways" not in tables:
        op.rename_table("gateway_configs", "gateways")
        tables.discard("gateway_configs")
        tables.add("gateways")

    if "boards" in tables:
        columns = {col["name"] for col in inspector.get_columns("boards")}
        with op.batch_alter_table("boards") as batch:
            if "gateway_config_id" in columns and "gateway_id" not in columns:
                batch.alter_column(
                    "gateway_config_id",
                    new_column_name="gateway_id",
                    existing_type=sa.Uuid(),
                )
            elif "gateway_id" not in columns:
                batch.add_column(sa.Column("gateway_id", sa.Uuid(), nullable=True))
            for legacy_col in (
                "gateway_url",
                "gateway_token",
                "gateway_main_session_key",
                "gateway_workspace_root",
            ):
                if legacy_col in columns:
                    batch.drop_column(legacy_col)

        indexes = {index["name"] for index in inspector.get_indexes("boards")}
        if "ix_boards_gateway_id" not in indexes:
            op.create_index(
                op.f("ix_boards_gateway_id"), "boards", ["gateway_id"], unique=False
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "boards" in tables:
        columns = {col["name"] for col in inspector.get_columns("boards")}
        with op.batch_alter_table("boards") as batch:
            if "gateway_id" in columns and "gateway_config_id" not in columns:
                batch.alter_column(
                    "gateway_id",
                    new_column_name="gateway_config_id",
                    existing_type=sa.Uuid(),
                )
            if "gateway_url" not in columns:
                batch.add_column(
                    sa.Column("gateway_url", sqlmodel.sql.sqltypes.AutoString(), nullable=True)
                )
            if "gateway_token" not in columns:
                batch.add_column(
                    sa.Column("gateway_token", sqlmodel.sql.sqltypes.AutoString(), nullable=True)
                )
            if "gateway_main_session_key" not in columns:
                batch.add_column(
                    sa.Column(
                        "gateway_main_session_key",
                        sqlmodel.sql.sqltypes.AutoString(),
                        nullable=True,
                    )
                )
            if "gateway_workspace_root" not in columns:
                batch.add_column(
                    sa.Column(
                        "gateway_workspace_root",
                        sqlmodel.sql.sqltypes.AutoString(),
                        nullable=True,
                    )
                )

    if "gateways" in tables and "gateway_configs" not in tables:
        op.rename_table("gateways", "gateway_configs")
