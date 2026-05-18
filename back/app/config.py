"""Application configuration from environment variables."""
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")


@dataclass(frozen=True)
class Settings:
    mongo_url: str
    db_name: str
    cors_origins: list[str]
    rate_limit_per_min: int = 10
    sync_interval_min: int = 15
    live_fare_check_max_trains: int = 200
    sncf_records_page_limit: int = 100
    search_result_limit: int = 5000

    sncf_export_url: str = (
        "https://data.sncf.com/api/explore/v2.1/catalog/datasets/tgvmax/exports/json"
    )
    sncf_records_url: str = (
        "https://data.sncf.com/api/explore/v2.1/catalog/datasets/tgvmax/records"
    )
    sncf_dataset_meta_url: str = (
        "https://data.sncf.com/api/explore/v2.1/catalog/datasets/tgvmax/"
    )
    sncf_connect_base: str = "https://www.sncf-connect.com"


@lru_cache
def get_settings() -> Settings:
    return Settings(
        mongo_url=os.environ["MONGO_URL"],
        db_name=os.environ["DB_NAME"],
        cors_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    )
