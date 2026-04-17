from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.contracts import SimulationRequest
from app.services.simulator import demo_attack_simulator


router = APIRouter(prefix="/simulations", tags=["simulations"])


@router.post("/execute")
async def execute_simulation(payload: SimulationRequest, db: Session = Depends(get_db)):
    try:
        return await demo_attack_simulator.execute_simulation(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
