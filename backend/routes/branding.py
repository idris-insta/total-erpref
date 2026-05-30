"""
IB Branding Module
Ported from ib-erp-main: IB Branding doctype.
Stores company branding (logo, colors, fonts, print header) used across PDF generation.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid
import os
import base64

from core.legacy_db import db

router = APIRouter()

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/tmp/erp_uploads")


# ─── Schema ───────────────────────────────────────────────────────────────────

class BrandingConfig(BaseModel):
    company_name: str
    tagline: Optional[str] = None
    primary_color: str = "#1e3a5f"       # Used in PDF headers
    secondary_color: str = "#e2e8f0"
    accent_color: str = "#3b82f6"
    font_family: str = "Helvetica"
    print_header_html: Optional[str] = None   # Custom HTML for document header
    print_footer_html: Optional[str] = None   # Custom HTML for document footer
    gstin: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_branch: Optional[str] = None
    authorized_signatory: Optional[str] = None
    logo_url: Optional[str] = None       # Set after uploading logo
    stamp_url: Optional[str] = None      # Company stamp/seal
    is_active: bool = True


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/", summary="Get current branding config")
async def get_branding():
    """Returns the active branding configuration. Falls back to defaults if none set."""
    config = await db.ib_branding.find_one({"is_active": True})
    if not config:
        return {
            "company_name": "InstaBiz",
            "primary_color": "#1e3a5f",
            "secondary_color": "#e2e8f0",
            "accent_color": "#3b82f6",
            "font_family": "Helvetica",
            "is_active": True,
            "message": "No branding config found — using defaults"
        }
    return config


@router.post("/", summary="Save branding configuration")
async def save_branding(data: BrandingConfig):
    # Deactivate any existing config
    await db.ib_branding.update_many({"is_active": True}, {"$set": {"is_active": False}})

    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = doc["created_at"]
    await db.ib_branding.insert_one(doc)
    return {"message": "Branding saved", "id": doc["id"]}


@router.put("/", summary="Update branding configuration")
async def update_branding(data: BrandingConfig):
    config = await db.ib_branding.find_one({"is_active": True})
    if not config:
        return await save_branding(data)
    update = data.model_dump()
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.ib_branding.update_one({"id": config["id"]}, {"$set": update})
    return {"message": "Branding updated"}


@router.post("/upload-logo", summary="Upload company logo")
async def upload_logo(file: UploadFile = File(...)):
    """Upload company logo — used in PDF generation and UI header."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"logo_{uuid.uuid4().hex}{os.path.splitext(file.filename)[1]}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    logo_url = f"/api/branding/files/{filename}"

    # Update branding if exists
    config = await db.ib_branding.find_one({"is_active": True})
    if config:
        await db.ib_branding.update_one(
            {"id": config["id"]},
            {"$set": {"logo_url": logo_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )

    return {"logo_url": logo_url, "filename": filename}


@router.post("/upload-stamp", summary="Upload company stamp/seal")
async def upload_stamp(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"stamp_{uuid.uuid4().hex}{os.path.splitext(file.filename)[1]}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    stamp_url = f"/api/branding/files/{filename}"

    config = await db.ib_branding.find_one({"is_active": True})
    if config:
        await db.ib_branding.update_one(
            {"id": config["id"]},
            {"$set": {"stamp_url": stamp_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )

    return {"stamp_url": stamp_url, "filename": filename}


@router.get("/preview-pdf-header", summary="Preview PDF header with current branding")
async def preview_pdf_header():
    """Returns the HTML that would be injected into the top of every generated PDF."""
    config = await db.ib_branding.find_one({"is_active": True})
    if not config:
        config = {"company_name": "InstaBiz", "primary_color": "#1e3a5f"}

    html = config.get("print_header_html") or f"""
    <div style="background:{config['primary_color']};color:#fff;padding:12px 20px;border-radius:4px;">
      <h2 style="margin:0;font-size:18px;">{config['company_name']}</h2>
      {f"<p style='margin:2px 0;font-size:11px;'>{config.get('tagline','')}</p>" if config.get('tagline') else ''}
      <div style="font-size:10px;margin-top:4px;">
        {config.get('address_line1','')} {config.get('city','')} {config.get('state','')} {config.get('pincode','')}
        &nbsp;|&nbsp; GSTIN: {config.get('gstin','N/A')}
      </div>
    </div>
    """
    return {"html": html, "config": config}
