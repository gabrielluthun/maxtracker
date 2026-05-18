from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/")
async def root():
    return {"app": "MaxTracker", "status": "ok"}
