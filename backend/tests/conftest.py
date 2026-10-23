import os
import sys
import pytest

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


@pytest.fixture(scope="session", autouse=True)
def seed_database():
    """Re-seed the database before the entire test session to ensure clean state."""
    from app.seed.seed_data import run_seed
    run_seed()
    yield
