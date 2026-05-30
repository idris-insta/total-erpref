"""
Customer Assignment & Daily Board
Ported from ib-erp-main instabiz ERPNext extension.
Handles customer-to-salesperson assignments, daily rollover, and the customer board.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timezone, timedelta
import uuid

from core.legacy_db import db

router = APIRouter()


# ─── Schemas ─────────────────────────────────────────────────────────────────

class AssignmentConfig(BaseModel):
    salesperson_user: str
    salesperson_name: str
    max_customers_per_day: int = 20
    territory: Optional[str] = None
    customer_type: Optional[str] = None   # e.g. "Regular", "Prospect"
    is_active: bool = True


class CustomerAssignment(BaseModel):
    customer_id: str
    customer_name: str
    salesperson_user: str
    salesperson_name: str
    assigned_date: str = Field(default_factory=lambda: date.today().isoformat())
    visit_type: str = "Call"           # Call | Visit | WhatsApp
    priority: str = "Normal"          # High | Normal | Low
    notes: Optional[str] = None
    status: str = "Pending"           # Pending | Done | Rolled


class AssignmentUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    outcome: Optional[str] = None
    next_follow_up: Optional[str] = None


class DailyBoardQuery(BaseModel):
    salesperson_user: Optional[str] = None
    date: Optional[str] = None


# ─── Assignment Config (admin) ────────────────────────────────────────────────

@router.get("/configs", summary="List all salesperson assignment configs")
async def list_configs():
    configs = await db.ib_assignment_configs.find({}).sort("salesperson_name", 1).to_list(200)
    return {"configs": configs, "total": len(configs)}


@router.post("/configs", summary="Create or update assignment config for a salesperson")
async def upsert_config(data: AssignmentConfig):
    existing = await db.ib_assignment_configs.find_one({"salesperson_user": data.salesperson_user})
    doc = data.model_dump()
    if existing:
        doc["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.ib_assignment_configs.update_one(
            {"salesperson_user": data.salesperson_user},
            {"$set": doc}
        )
        return {"message": "Config updated", "salesperson_user": data.salesperson_user}
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = doc["created_at"]
    await db.ib_assignment_configs.insert_one(doc)
    return {"message": "Config created", "id": doc["id"]}


# ─── Daily Customer Board ─────────────────────────────────────────────────────

@router.get("/board", summary="Get the daily customer board (today's assignments)")
async def get_daily_board(salesperson_user: Optional[str] = None, date_str: Optional[str] = None):
    today = date_str or date.today().isoformat()
    query: Dict[str, Any] = {"assigned_date": today}
    if salesperson_user:
        query["salesperson_user"] = salesperson_user

    assignments = await db.customer_assignments.find(query).sort("priority", -1).to_list(500)

    # Group by salesperson
    board: Dict[str, list] = {}
    for a in assignments:
        sp = a.get("salesperson_name", "Unknown")
        board.setdefault(sp, []).append(a)

    summary = {
        "date": today,
        "total": len(assignments),
        "pending": sum(1 for a in assignments if a.get("status") == "Pending"),
        "done": sum(1 for a in assignments if a.get("status") == "Done"),
        "rolled": sum(1 for a in assignments if a.get("status") == "Rolled"),
        "board": board,
    }
    return summary


@router.post("/assignments", summary="Create a customer assignment")
async def create_assignment(data: CustomerAssignment):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = doc["created_at"]
    await db.customer_assignments.insert_one(doc)
    return {"message": "Assignment created", "id": doc["id"]}


@router.put("/assignments/{assignment_id}", summary="Update assignment status / outcome")
async def update_assignment(assignment_id: str, data: AssignmentUpdate):
    existing = await db.customer_assignments.find_one({"id": assignment_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Assignment not found")
    update: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.status:
        update["status"] = data.status
    if data.notes is not None:
        update["notes"] = data.notes
    if data.outcome is not None:
        update["outcome"] = data.outcome
    if data.next_follow_up is not None:
        update["next_follow_up"] = data.next_follow_up
    await db.customer_assignments.update_one({"id": assignment_id}, {"$set": update})
    return {"message": "Assignment updated"}


@router.post("/rollover", summary="Roll over pending assignments to tomorrow (scheduler trigger)")
async def rollover_pending():
    """
    Mirrors instabiz ERPNext scheduler: run_daily_assignment().
    Rolls pending assignments from today to tomorrow.
    """
    today = date.today().isoformat()
    tomorrow = (date.today() + timedelta(days=1)).isoformat()

    pending = await db.customer_assignments.find(
        {"assigned_date": today, "status": "Pending"}
    ).to_list(1000)

    rolled = 0
    for a in pending:
        # Mark existing as Rolled
        await db.customer_assignments.update_one(
            {"id": a["id"]},
            {"$set": {"status": "Rolled", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        # Create new for tomorrow
        new_doc = {**a, "id": str(uuid.uuid4()), "assigned_date": tomorrow,
                   "status": "Pending", "notes": f"Rolled over from {today}",
                   "created_at": datetime.now(timezone.utc).isoformat(),
                   "updated_at": datetime.now(timezone.utc).isoformat()}
        new_doc.pop("outcome", None)
        await db.customer_assignments.insert_one(new_doc)
        rolled += 1

    return {"message": f"Rolled over {rolled} assignments to {tomorrow}", "rolled": rolled}


@router.get("/analytics", summary="Assignment completion analytics")
async def assignment_analytics(days: int = 7):
    results = []
    for i in range(days):
        d = (date.today() - timedelta(days=i)).isoformat()
        all_day = await db.customer_assignments.find({"assigned_date": d}).to_list(500)
        results.append({
            "date": d,
            "total": len(all_day),
            "done": sum(1 for a in all_day if a.get("status") == "Done"),
            "pending": sum(1 for a in all_day if a.get("status") == "Pending"),
            "rolled": sum(1 for a in all_day if a.get("status") == "Rolled"),
            "completion_rate": round(
                sum(1 for a in all_day if a.get("status") == "Done") / max(len(all_day), 1) * 100, 1
            )
        })
    return {"analytics": results}
