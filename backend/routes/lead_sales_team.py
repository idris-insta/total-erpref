"""
Lead Sales Team Management
Ported from ib-erp-main: Lead Sales Team, Lead Sales Team Member, Lead Sales Team Territory doctypes.
Manages hierarchical sales teams, territory allocation, and lead ownership.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from core.legacy_db import db

router = APIRouter()


# ─── Schemas ─────────────────────────────────────────────────────────────────

class SalesTeamMember(BaseModel):
    user_id: str
    user_email: str
    user_name: str
    role: str = "Member"         # Team Lead | Member
    target_monthly: Optional[float] = None
    is_active: bool = True


class SalesTeamTerritory(BaseModel):
    territory_name: str
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    pincode_range_start: Optional[str] = None
    pincode_range_end: Optional[str] = None


class SalesTeamCreate(BaseModel):
    team_name: str
    team_code: str
    team_lead_user: Optional[str] = None
    team_lead_name: Optional[str] = None
    description: Optional[str] = None
    members: List[SalesTeamMember] = []
    territories: List[SalesTeamTerritory] = []
    is_active: bool = True


class LeadAssignment(BaseModel):
    lead_id: str
    team_id: Optional[str] = None
    assigned_to_user: str
    assigned_to_name: str
    reason: Optional[str] = None


# ─── Sales Team CRUD ──────────────────────────────────────────────────────────

@router.get("/teams", summary="List all sales teams")
async def list_teams(is_active: Optional[bool] = None):
    query: Dict[str, Any] = {}
    if is_active is not None:
        query["is_active"] = is_active
    teams = await db.lead_sales_teams.find(query).sort("team_name", 1).to_list(200)
    return {"teams": teams, "total": len(teams)}


@router.post("/teams", summary="Create a sales team")
async def create_team(data: SalesTeamCreate):
    # Ensure team code is unique
    existing = await db.lead_sales_teams.find_one({"team_code": data.team_code})
    if existing:
        raise HTTPException(status_code=400, detail=f"Team code '{data.team_code}' already exists")

    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = doc["created_at"]

    # Assign IDs to members and territories
    for m in doc["members"]:
        m["id"] = str(uuid.uuid4())
    for t in doc["territories"]:
        t["id"] = str(uuid.uuid4())

    await db.lead_sales_teams.insert_one(doc)
    return {"message": "Sales team created", "id": doc["id"], **doc}


@router.get("/teams/{team_id}", summary="Get sales team with members and territories")
async def get_team(team_id: str):
    team = await db.lead_sales_teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Enrich with member performance
    for member in team.get("members", []):
        leads = await db.leads.find({"assigned_to": member["user_email"]}).to_list(1000)
        member["total_leads"] = len(leads)
        member["won_leads"] = sum(1 for l in leads if l.get("status") == "won")
        member["active_leads"] = sum(1 for l in leads if l.get("status") not in ["won", "lost"])

    return team


@router.put("/teams/{team_id}", summary="Update sales team")
async def update_team(team_id: str, data: SalesTeamCreate):
    team = await db.lead_sales_teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    update = data.model_dump()
    for m in update["members"]:
        if "id" not in m:
            m["id"] = str(uuid.uuid4())
    for t in update["territories"]:
        if "id" not in t:
            t["id"] = str(uuid.uuid4())
    update["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.lead_sales_teams.update_one({"id": team_id}, {"$set": update})
    return {"message": "Team updated"}


@router.delete("/teams/{team_id}", summary="Deactivate a sales team")
async def deactivate_team(team_id: str):
    await db.lead_sales_teams.update_one(
        {"id": team_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Team deactivated"}


# ─── Lead Assignment ──────────────────────────────────────────────────────────

@router.post("/assign-lead", summary="Assign a lead to a salesperson")
async def assign_lead(data: LeadAssignment):
    lead = await db.leads.find_one({"id": data.lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    update: Dict[str, Any] = {
        "assigned_to": data.assigned_to_user,
        "assigned_to_name": data.assigned_to_name,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if data.team_id:
        update["sales_team_id"] = data.team_id

    await db.leads.update_one({"id": data.lead_id}, {"$set": update})

    # Log the assignment
    log_doc = {
        "id": str(uuid.uuid4()),
        "lead_id": data.lead_id,
        "team_id": data.team_id,
        "assigned_to_user": data.assigned_to_user,
        "assigned_to_name": data.assigned_to_name,
        "reason": data.reason,
        "assigned_at": datetime.now(timezone.utc).isoformat()
    }
    await db.lead_assignment_logs.insert_one(log_doc)

    return {"message": f"Lead assigned to {data.assigned_to_name}"}


@router.get("/territory-match", summary="Find best team for a given pincode/state")
async def territory_match(state: Optional[str] = None, district: Optional[str] = None, pincode: Optional[str] = None):
    """
    Returns the sales team(s) whose territory covers the given location.
    Mirrors the ERPNext territory routing logic.
    """
    teams = await db.lead_sales_teams.find({"is_active": True}).to_list(200)
    matched = []

    for team in teams:
        for territory in team.get("territories", []):
            match = False
            if state and territory.get("state") and territory["state"].lower() == state.lower():
                match = True
            if district and territory.get("district") and territory["district"].lower() == district.lower():
                match = True
            if pincode and territory.get("pincode_range_start") and territory.get("pincode_range_end"):
                if territory["pincode_range_start"] <= pincode <= territory["pincode_range_end"]:
                    match = True
            if match:
                matched.append({
                    "team_id": team["id"],
                    "team_name": team["team_name"],
                    "team_lead": team.get("team_lead_name"),
                    "territory": territory.get("territory_name")
                })
                break

    return {"matched_teams": matched, "count": len(matched)}


@router.get("/my-team/{user_email}", summary="Get team and leads for a salesperson")
async def my_team(user_email: str):
    """Used by the salesperson UI to see their team and their leads."""
    # Find teams where user is a member
    teams = await db.lead_sales_teams.find({"is_active": True}).to_list(200)
    my_teams = []
    for team in teams:
        for m in team.get("members", []):
            if m.get("user_email") == user_email:
                my_teams.append({"id": team["id"], "name": team["team_name"], "role": m.get("role")})
                break

    # Get their leads
    leads = await db.leads.find({"assigned_to": user_email}).sort("created_at", -1).to_list(500)

    return {
        "user_email": user_email,
        "teams": my_teams,
        "leads": leads,
        "total_leads": len(leads),
        "active_leads": sum(1 for l in leads if l.get("status") not in ["won", "lost"]),
        "won_leads": sum(1 for l in leads if l.get("status") == "won"),
    }
