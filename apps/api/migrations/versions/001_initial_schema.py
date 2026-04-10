"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-04-10 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── companies ──────────────────────────────────────────────
    op.create_table(
        "companies",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(100), unique=True, nullable=False),
        sa.Column("business_number", sa.String(20), nullable=True),
        sa.Column("representative_name", sa.String(100), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("company_settings", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── users ──────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("email", sa.String(254), unique=True, nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("role", sa.String(30), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_company_id", "users", ["company_id"])
    op.create_index("ix_users_email", "users", ["email"])

    # ── projects ───────────────────────────────────────────────
    op.create_table(
        "projects",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("name", sa.String(300), nullable=False),
        sa.Column("site_address", sa.Text, nullable=True),
        sa.Column("client_name", sa.String(200), nullable=True),
        sa.Column("industry_template", sa.String(20), nullable=True),
        sa.Column("contract_amount", sa.Numeric(15, 2), nullable=True),
        sa.Column("estimated_budget", sa.Numeric(15, 2), nullable=True),
        sa.Column("start_date", sa.Date, nullable=True),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="draft"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("site_info", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_projects_company_id", "projects", ["company_id"])

    # ── process_packages ───────────────────────────────────────
    op.create_table(
        "process_packages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("project_id", sa.String(36), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("trade_type", sa.String(20), nullable=False),
        sa.Column("budget_allocated", sa.Numeric(15, 2), nullable=True),
        sa.Column("schedule", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("status", sa.String(30), nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_process_packages_project_id", "process_packages", ["project_id"])

    # ── project_documents ──────────────────────────────────────
    op.create_table(
        "project_documents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("project_id", sa.String(36), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("doc_type", sa.String(50), nullable=False),
        sa.Column("file_url", sa.String(500), nullable=False),
        sa.Column("file_name", sa.String(300), nullable=False),
        sa.Column("file_hash", sa.String(64), nullable=True),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("is_internal", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("is_external", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("folder_key", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── vendors ────────────────────────────────────────────────
    op.create_table(
        "vendors",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("company_name", sa.String(200), nullable=False),
        sa.Column("representative_name", sa.String(100), nullable=True),
        sa.Column("email", sa.String(254), unique=True, nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("business_number", sa.String(20), nullable=True),
        sa.Column("business_cert_url", sa.String(500), nullable=True),
        sa.Column("trade_types", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("regions", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("tax_info", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("rating", sa.Numeric(3, 2), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("is_verified", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_vendors_company_id", "vendors", ["company_id"])

    # ── bid_requests ───────────────────────────────────────────
    op.create_table(
        "bid_requests",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("project_id", sa.String(36), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("process_package_id", sa.String(36), sa.ForeignKey("process_packages.id"), nullable=False),
        sa.Column("vendor_id", sa.String(36), sa.ForeignKey("vendors.id"), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("response_status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("response_reason", sa.Text, nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── bid_packages ───────────────────────────────────────────
    op.create_table(
        "bid_packages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("bid_request_id", sa.String(36), sa.ForeignKey("bid_requests.id"), nullable=False, unique=True),
        sa.Column("documents", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("instructions", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── quotes ─────────────────────────────────────────────────
    op.create_table(
        "quotes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("vendor_id", sa.String(36), sa.ForeignKey("vendors.id"), nullable=False),
        sa.Column("project_id", sa.String(36), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("bid_request_id", sa.String(36), sa.ForeignKey("bid_requests.id"), nullable=False),
        sa.Column("file_url", sa.String(500), nullable=True),
        sa.Column("file_name", sa.String(300), nullable=True),
        sa.Column("parsed_total", sa.Numeric(15, 2), nullable=True),
        sa.Column("line_items_json", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("parse_status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("manual_review_required", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("submission_type", sa.String(20), nullable=False, server_default="upload"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── quote_lines_normalized ────────────────────────────────
    op.create_table(
        "quote_lines_normalized",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("quote_id", sa.String(36), sa.ForeignKey("quotes.id"), nullable=False),
        sa.Column("item_name", sa.String(300), nullable=False),
        sa.Column("unit", sa.String(20), nullable=False),
        sa.Column("quantity", sa.Numeric(12, 3), nullable=False, server_default="0"),
        sa.Column("unit_price", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_quote_lines_quote_id", "quote_lines_normalized", ["quote_id"])

    # ── message_threads ────────────────────────────────────────
    op.create_table(
        "message_threads",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("project_id", sa.String(36), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("vendor_id", sa.String(36), sa.ForeignKey("vendors.id"), nullable=False),
        sa.Column("thread_type", sa.String(20), nullable=False, server_default="project"),
        sa.Column("is_closed", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── messages ───────────────────────────────────────────────
    op.create_table(
        "messages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("thread_id", sa.String(36), sa.ForeignKey("message_threads.id"), nullable=False),
        sa.Column("sender_id", sa.String(36), nullable=False),
        sa.Column("sender_role", sa.String(30), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("file_url", sa.String(500), nullable=True),
        sa.Column("ai_handled", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("escalated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── settlements ────────────────────────────────────────────
    op.create_table(
        "settlements",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("project_id", sa.String(36), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("vendor_id", sa.String(36), sa.ForeignKey("vendors.id"), nullable=False),
        sa.Column("milestone_type", sa.String(10), nullable=False),
        sa.Column("requested_amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("approved_amount", sa.Numeric(15, 2), nullable=True),
        sa.Column("invoice_file", sa.String(500), nullable=True),
        sa.Column("tax_review_status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("status", sa.String(20), nullable=False, server_default="requested"),
        sa.Column("payout_scheduled_date", sa.Date, nullable=True),
        sa.Column("payout_approved_by", sa.String(36), nullable=True),
        sa.Column("payout_approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reject_reason", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── vendor_score_snapshots ────────────────────────────────
    op.create_table(
        "vendor_score_snapshots",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("vendor_id", sa.String(36), sa.ForeignKey("vendors.id"), nullable=False),
        sa.Column("snapshot_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("participation_rate", sa.Float, nullable=True),
        sa.Column("response_speed_avg", sa.Float, nullable=True),
        sa.Column("win_rate", sa.Float, nullable=True),
        sa.Column("completion_rate", sa.Float, nullable=True),
        sa.Column("complaint_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("settlement_total", sa.Float, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── audit_logs ─────────────────────────────────────────────
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("company_id", sa.String(36), nullable=False),
        sa.Column("actor_id", sa.String(36), nullable=False),
        sa.Column("actor_role", sa.String(30), nullable=False),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("target_type", sa.String(100), nullable=False),
        sa.Column("target_id", sa.String(36), nullable=False),
        sa.Column("before_json", sa.JSON, nullable=True),
        sa.Column("after_json", sa.JSON, nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_audit_logs_company_id", "audit_logs", ["company_id"])
    op.create_index("ix_audit_logs_actor_id", "audit_logs", ["actor_id"])
    op.create_index("ix_audit_logs_target", "audit_logs", ["target_type", "target_id"])

    # ── notification_queue ────────────────────────────────────
    op.create_table(
        "notification_queue",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("recipient_id", sa.String(36), nullable=False),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("payload", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_notification_queue_recipient_id", "notification_queue", ["recipient_id"])


def downgrade() -> None:
    op.drop_table("notification_queue")
    op.drop_table("audit_logs")
    op.drop_table("vendor_score_snapshots")
    op.drop_table("settlements")
    op.drop_table("messages")
    op.drop_table("message_threads")
    op.drop_table("quote_lines_normalized")
    op.drop_table("quotes")
    op.drop_table("bid_packages")
    op.drop_table("bid_requests")
    op.drop_table("vendors")
    op.drop_table("project_documents")
    op.drop_table("process_packages")
    op.drop_table("projects")
    op.drop_table("users")
    op.drop_table("companies")
