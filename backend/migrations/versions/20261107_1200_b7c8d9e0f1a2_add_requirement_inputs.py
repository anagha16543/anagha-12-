"""add_requirement_inputs

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
Create Date: 2026-11-07 12:00:00.000000+00:00
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "requirement_inputs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("requirement_id", sa.Uuid(), sa.ForeignKey("nba_requirements.id", ondelete="CASCADE"), nullable=False),
        sa.Column("academic_year_id", sa.Uuid(), sa.ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False),
        sa.Column("department", sa.String(100), nullable=False),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.Column("entered_by_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("requirement_id", "academic_year_id", "department", name="uq_requirement_input_scope"),
    )
    op.create_index("ix_requirement_inputs_requirement_id", "requirement_inputs", ["requirement_id"])
    op.create_index("ix_requirement_inputs_academic_year_id", "requirement_inputs", ["academic_year_id"])


def downgrade() -> None:
    op.drop_index("ix_requirement_inputs_academic_year_id", table_name="requirement_inputs")
    op.drop_index("ix_requirement_inputs_requirement_id", table_name="requirement_inputs")
    op.drop_table("requirement_inputs")
