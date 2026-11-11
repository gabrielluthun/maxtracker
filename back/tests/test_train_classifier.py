"""Type de train et filtrage des trajets éligibles à la synchronisation.

Exemples tirés du flux SNCF « Disponibilités TGV Max » (novembre 2026).
"""
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.domain.stations import is_same_city_trip, normalize_station
from app.domain.train_classifier import classify_train_type
from app.services.sync import SyncService


@pytest.mark.parametrize(
    "entity,axe,expected",
    [
        # Anciennement écartés comme « TER » : ce sont des TGV.
        ("JCNORDSUD", "SUD EST", "TGV_INOUI"),  # Lille → Lyon, train 5120
        ("JCSUDATL", "SUD EST", "TGV_INOUI"),  # Lyon → Nantes, train 5351
        ("AZURPA", "SUD EST", "TGV_INOUI"),  # Nice → Cannes, train 6180
        ("PAVDR", "SUD EST", "TGV_INOUI"),
        ("PALILLE", "NORD", "TGV_INOUI"),
        ("PAMETZLUX", "EST", "TGV_INOUI"),
        ("TJOURSOSE", "IC ARO", "INTERCITES"),
        ("PARISTOULOUSE", "IC NUIT", "INTERCITES_NUIT"),
        ("OUIGO", "", "TGV_INOUI"),
        ("", "", "INTERCITES"),
    ],
)
def test_classify_train_type(entity, axe, expected):
    assert classify_train_type(entity, axe) == expected


@pytest.mark.parametrize(
    "origine,destination,expected",
    [
        ("LYON (intramuros)", "LYON (intramuros)", True),  # Perrache ↔ Part-Dieu
        ("LYON PART DIEU", "LYON ST EXUPERY TGV.", True),  # même métropole
        ("LILLE (intramuros)", "LYON (intramuros)", False),
        ("NICE VILLE", "CANNES", False),
        ("MASSY TGV", "MARNE LA VALLEE CHESSY", False),  # hors métropoles connues
    ],
)
def test_is_same_city_trip(origine, destination, expected):
    assert is_same_city_trip(normalize_station(origine), normalize_station(destination)) is expected


def _row(train_no, origine, destination, entity, axe, *, date="2099-01-01", eligible="OUI"):
    return {
        "date": date,
        "train_no": train_no,
        "origine": origine,
        "destination": destination,
        "entity": entity,
        "axe": axe,
        "heure_depart": "10:00",
        "heure_arrivee": "12:00",
        "od_happy_card": eligible,
    }


@pytest.mark.asyncio
async def test_sync_keeps_every_eligible_train_but_same_city_trips():
    # Dates dans la fenêtre J → J+30 quelle que soit la date d'exécution.
    from datetime import datetime, timedelta

    from app.domain.trips import PARIS_TZ

    day = (datetime.now(PARIS_TZ).date() + timedelta(days=2)).isoformat()
    rows = [
        _row("5120", "LILLE (intramuros)", "LYON (intramuros)", "JCNORDSUD", "SUD EST", date=day),
        _row("6180", "NICE VILLE", "CANNES", "AZURPA", "SUD EST", date=day),
        _row("5351", "LYON (intramuros)", "NANTES", "JCSUDATL", "SUD EST", date=day),
        _row("9852", "LYON (intramuros)", "LYON (intramuros)", "PARISRHONE", "SUD EST", date=day),
        _row("7001", "LILLE (intramuros)", "PARIS (intramuros)", "LILLEPA", "NORD", date=day, eligible="NON"),
    ]
    trips = MagicMock()
    trips.replace_all = AsyncMock()
    trips.cleanup_today_before = AsyncMock()
    trips.count = AsyncMock(return_value=3)
    sync = MagicMock()
    sync.get_sncf_data_updated_at = AsyncMock(return_value=None)
    sync.update = AsyncMock()
    sncf = MagicMock()
    sncf.fetch_dataset_updated_at = AsyncMock(return_value="2026-11-11T05:00:00")
    sncf.fetch_export = AsyncMock(return_value=rows)

    result = await SyncService(MagicMock(), trips, sync, sncf, None).sync_trips(force=True)

    assert result["status"] == "ok"
    docs = trips.replace_all.await_args.args[0]
    assert sorted(d["train_no"] for d in docs) == ["5120", "5351", "6180"]
    assert {d["train_type"] for d in docs} == {"TGV_INOUI"}
