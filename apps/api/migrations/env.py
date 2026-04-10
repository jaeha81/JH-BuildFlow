import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# apps/api 루트를 sys.path에 추가
sys.path.insert(0, str(Path(__file__).parent.parent))

# Alembic Config object
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override DATABASE_URL from env (asyncpg → psycopg2 for sync alembic)
db_url = os.getenv("DATABASE_URL") or os.getenv("DATABASE_SYNC_URL")
if db_url:
    if "asyncpg" in db_url:
        db_url = db_url.replace("postgresql+asyncpg", "postgresql+psycopg2", 1)
    config.set_main_option("sqlalchemy.url", db_url)

# Import all models so autogenerate can detect them
from app.models import Base  # noqa: E402

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
