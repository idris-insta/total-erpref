"""
Transport & Transporter Master
Ported from ib-erp-main: IB Transport doctype + Gatepass transporter logic.
Handles lorry/vehicle master, LR tracking, and driver assignment.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from core.legacy_db import db

router = APIRouter()


# ─── Schemas ─────────────────────────────────────────────────────────────────

class TransporterCreate(BaseModel):
    name: str
    gstin: Optional[str] = None
    pan: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    is_active: bool = True
    notes: Optional[str] = None


class VehicleCreate(BaseModel):
    vehicle_number: str
    vehicle_type: str = "Truck"   # Truck | Tempo | Mini-Truck | Motorcycle
    transporter_id: Optional[str] = None
    transporter_name: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    driver_license: Optional[str] = None
    capacity_kg: Optional[float] = None
    is_active: bool = True


class LREntry(BaseModel):
    lr_number: str
    lr_date: str
    transporter_id: Optional[str] = None
    transporter_name: Optional[str] = None
    vehicle_number: Optional[str] = None
    driver_name: Optional[str] = None
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    gatepass_id: Optional[str] = None
    delivery_note_id: Optional[str] = None
    weight_kg: Optional[float] = None
    freight_amount: Optional[float] = None
    expected_delivery_date: Optional[str] = None
    actual_delivery_date: Optional[str] = None
    status: str = "In Transit"  # In Transit | Delivered | Returned


# ─── Transporter Master ───────────────────────────────────────────────────────

@router.get("/transporters", summary="List all transporters")
async def list_transporters(is_active: Optional[bool] = None):
    query: Dict[str, Any] = {}
    if is_active is not None:
        query["is_active"] = is_active
    transporters = await db.transporters.find(query).sort("name", 1).to_list(500)
    return {"transporters": transporters, "total": len(transporters)}


@router.post("/transporters", summary="Create a transporter")
async def create_transporter(data: TransporterCreate):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = doc["created_at"]
    await db.transporters.insert_one(doc)
    return {"message": "Transporter created", "id": doc["id"], **doc}


@router.get("/transporters/{transporter_id}", summary="Get transporter by ID")
async def get_transporter(transporter_id: str):
    t = await db.transporters.find_one({"id": transporter_id})
    if not t:
        raise HTTPException(status_code=404, detail="Transporter not found")
    # Attach vehicles
    vehicles = await db.vehicles.find({"transporter_id": transporter_id}).to_list(100)
    t["vehicles"] = vehicles
    return t


@router.put("/transporters/{transporter_id}", summary="Update transporter")
async def update_transporter(transporter_id: str, data: TransporterCreate):
    t = await db.transporters.find_one({"id": transporter_id})
    if not t:
        raise HTTPException(status_code=404, detail="Transporter not found")
    update = data.model_dump()
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.transporters.update_one({"id": transporter_id}, {"$set": update})
    return {"message": "Transporter updated"}


# ─── Vehicle Master ───────────────────────────────────────────────────────────

@router.get("/vehicles", summary="List all vehicles")
async def list_vehicles(transporter_id: Optional[str] = None):
    query: Dict[str, Any] = {}
    if transporter_id:
        query["transporter_id"] = transporter_id
    vehicles = await db.vehicles.find(query).sort("vehicle_number", 1).to_list(500)
    return {"vehicles": vehicles, "total": len(vehicles)}


@router.post("/vehicles", summary="Add a vehicle")
async def create_vehicle(data: VehicleCreate):
    # Check if vehicle number already exists
    existing = await db.vehicles.find_one({"vehicle_number": data.vehicle_number})
    if existing:
        raise HTTPException(status_code=400, detail="Vehicle number already registered")
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = doc["created_at"]
    await db.vehicles.insert_one(doc)
    return {"message": "Vehicle added", "id": doc["id"], **doc}


@router.put("/vehicles/{vehicle_id}", summary="Update vehicle details")
async def update_vehicle(vehicle_id: str, data: VehicleCreate):
    v = await db.vehicles.find_one({"id": vehicle_id})
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    update = data.model_dump()
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.vehicles.update_one({"id": vehicle_id}, {"$set": update})
    return {"message": "Vehicle updated"}


# ─── LR (Lorry Receipt) Tracking ─────────────────────────────────────────────

@router.get("/lr-entries", summary="List LR entries")
async def list_lr_entries(status: Optional[str] = None, transporter_id: Optional[str] = None):
    query: Dict[str, Any] = {}
    if status:
        query["status"] = status
    if transporter_id:
        query["transporter_id"] = transporter_id
    entries = await db.lr_entries.find(query).sort("lr_date", -1).to_list(500)
    return {"lr_entries": entries, "total": len(entries)}


@router.post("/lr-entries", summary="Create LR entry")
async def create_lr_entry(data: LREntry):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = doc["created_at"]
    await db.lr_entries.insert_one(doc)
    return {"message": "LR entry created", "id": doc["id"]}


@router.put("/lr-entries/{lr_id}/deliver", summary="Mark LR as delivered")
async def mark_lr_delivered(lr_id: str, actual_delivery_date: Optional[str] = None):
    lr = await db.lr_entries.find_one({"id": lr_id})
    if not lr:
        raise HTTPException(status_code=404, detail="LR not found")
    update = {
        "status": "Delivered",
        "actual_delivery_date": actual_delivery_date or datetime.now(timezone.utc).date().isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.lr_entries.update_one({"id": lr_id}, {"$set": update})
    return {"message": "LR marked as delivered"}


@router.get("/vehicle-log", summary="Movement log for a vehicle")
async def vehicle_log(vehicle_number: str):
    lr_entries = await db.lr_entries.find({"vehicle_number": vehicle_number}).sort("lr_date", -1).to_list(200)
    gatepasses = await db.gatepasses.find({"vehicle_number": vehicle_number}).sort("created_at", -1).to_list(200)
    return {
        "vehicle_number": vehicle_number,
        "lr_entries": lr_entries,
        "gatepasses": gatepasses,
        "total_trips": len(lr_entries)
    }
