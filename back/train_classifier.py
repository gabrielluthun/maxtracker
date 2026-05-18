"""Rétrocompatibilité — préférer app.domain.train_classifier."""
from app.domain.train_classifier import (  # noqa: F401
    classify_train_type,
    is_eligible_subscription_train,
)
