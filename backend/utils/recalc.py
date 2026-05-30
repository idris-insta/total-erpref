"""
Recalc & Dimension Utilities
Ported from ib-erp-main: public/js/recalc.js
All dimension → quantity → amount calculations for tape/adhesive items.
Used by quotation, sales order, production, and invoicing logic.
"""
from typing import Optional, Dict, Any
import math


# ─── Constants ────────────────────────────────────────────────────────────────

DEFAULT_DENSITY = 1050.0     # kg/m³ for standard BOPP film
DEFAULT_CORE_WT_KG = 0.05    # Standard paper core weight
PCS_PER_BOX = 24             # Default pieces per box
MIN_MARGIN_PCT = 15.0        # Minimum margin % from MSP
RSP_MARGIN_PCT = 25.0        # Recommended selling price margin


# ─── UOM Conversions ──────────────────────────────────────────────────────────

def sqm_from_dimensions(width_mm: float, length_mtr: float) -> float:
    """
    Calculate area (SQM) from width in millimetres and length in metres.
    Formula: SQM = (width_mm / 1000) × length_mtr
    """
    if width_mm <= 0 or length_mtr <= 0:
        return 0.0
    return round((width_mm / 1000) * length_mtr, 6)


def kg_from_sqm(sqm: float, thickness_micron: float, density: float = DEFAULT_DENSITY) -> float:
    """
    Calculate weight (KG) from area, thickness, and density.
    Formula: KG = SQM × (thickness_micron / 1_000_000) × density
    """
    if sqm <= 0 or thickness_micron <= 0:
        return 0.0
    thickness_m = thickness_micron / 1_000_000
    return round(sqm * thickness_m * density, 6)


def sqm_from_kg(kg: float, thickness_micron: float, density: float = DEFAULT_DENSITY) -> float:
    """Reverse: KG → SQM"""
    if kg <= 0 or thickness_micron <= 0:
        return 0.0
    thickness_m = thickness_micron / 1_000_000
    return round(kg / (thickness_m * density), 6)


def pcs_from_sqm(sqm: float, width_mm: float, length_mtr: float) -> int:
    """Number of pieces from total area and per-piece dimensions."""
    piece_sqm = sqm_from_dimensions(width_mm, length_mtr)
    if piece_sqm <= 0:
        return 0
    return max(0, math.floor(sqm / piece_sqm))


def boxes_from_pcs(pcs: int, pcs_per_box: int = PCS_PER_BOX) -> float:
    """How many boxes from pieces count."""
    if pcs_per_box <= 0:
        return 0.0
    return round(pcs / pcs_per_box, 3)


# ─── GSM-based calculations (common in HRMS paper/tape) ─────────────────────

def kg_from_gsm(sqm: float, gsm: float) -> float:
    """Weight from area and GSM (grams per square metre). kg = sqm × gsm / 1000"""
    return round(sqm * gsm / 1000, 6)


def gsm_from_thickness_density(thickness_micron: float, density: float = DEFAULT_DENSITY) -> float:
    """GSM = thickness_m × density × 1000"""
    return round((thickness_micron / 1_000_000) * density * 1000, 2)


# ─── Jumbo → Slit calculations ────────────────────────────────────────────────

def jumbo_to_slits(jumbo_width_mm: float, slit_width_mm: float, trim_mm: float = 3.0) -> Dict[str, Any]:
    """
    How many slit rolls from one jumbo roll.
    Accounts for trim (edge waste) on both sides.
    """
    usable_width = jumbo_width_mm - (2 * trim_mm)
    if usable_width <= 0 or slit_width_mm <= 0:
        return {"slits": 0, "waste_mm": jumbo_width_mm, "yield_pct": 0.0}

    slits = math.floor(usable_width / slit_width_mm)
    remaining = usable_width - (slits * slit_width_mm)
    total_waste = remaining + (2 * trim_mm)
    yield_pct = round((slits * slit_width_mm) / jumbo_width_mm * 100, 2)

    return {
        "slits": slits,
        "usable_width_mm": usable_width,
        "waste_mm": round(total_waste, 2),
        "yield_pct": yield_pct
    }


def scrap_percentage(input_kg: float, output_kg: float) -> float:
    """Scrap % = (input - output) / input × 100"""
    if input_kg <= 0:
        return 0.0
    scrap = input_kg - output_kg
    return round(max(0, scrap / input_kg * 100), 4)


REDLINE_THRESHOLD = 7.0   # 7% scrap triggers director approval


def check_redline(input_kg: float, output_kg: float) -> Dict[str, Any]:
    """
    Production Redline Guard.
    Returns whether scrap % breaches the 7% threshold.
    """
    pct = scrap_percentage(input_kg, output_kg)
    return {
        "scrap_pct": pct,
        "redline_breached": pct > REDLINE_THRESHOLD,
        "threshold_pct": REDLINE_THRESHOLD,
        "requires_director_approval": pct > REDLINE_THRESHOLD
    }


# ─── Pricing Calculations ─────────────────────────────────────────────────────

def msp_from_landed_cost(landed_cost_per_kg: float, margin_pct: float = MIN_MARGIN_PCT) -> float:
    """
    Minimum Selling Price = Landed Cost × (1 + margin%)
    Used in import bridge.
    """
    return round(landed_cost_per_kg * (1 + margin_pct / 100), 2)


def rsp_from_landed_cost(landed_cost_per_kg: float, margin_pct: float = RSP_MARGIN_PCT) -> float:
    """Recommended Selling Price with higher margin buffer."""
    return round(landed_cost_per_kg * (1 + margin_pct / 100), 2)


def unit_rate_from_sqm_rate(sqm_rate: float, thickness_micron: float,
                             density: float = DEFAULT_DENSITY) -> float:
    """Convert per-SQM rate to per-KG rate."""
    kg_per_sqm = (thickness_micron / 1_000_000) * density
    if kg_per_sqm <= 0:
        return 0.0
    return round(sqm_rate / kg_per_sqm, 4)


def unit_rate_from_kg_rate(kg_rate: float, thickness_micron: float,
                            density: float = DEFAULT_DENSITY) -> float:
    """Convert per-KG rate to per-SQM rate."""
    kg_per_sqm = (thickness_micron / 1_000_000) * density
    return round(kg_rate * kg_per_sqm, 4)


# ─── Line Item Recalculation ──────────────────────────────────────────────────

def recalculate_item_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recalculates derived fields in a quotation/order line item.
    Mirrors the ib-erp-main recalc.js `recalculate_row()` function.

    Input fields (from row dict):
      width_mm, length_mtr, thickness_micron, density, qty, rate, discount_pct, tax_pct

    Output fields added/updated:
      sqm_per_piece, kg_per_piece, total_sqm, total_kg,
      amount_before_discount, discount_amount, taxable_amount, tax_amount, total_amount
    """
    width_mm = float(row.get("width_mm") or 0)
    length_mtr = float(row.get("length_mtr") or 0)
    thickness_micron = float(row.get("thickness_micron") or 0)
    density = float(row.get("density") or DEFAULT_DENSITY)
    qty = float(row.get("qty") or 0)
    rate = float(row.get("rate") or 0)
    discount_pct = float(row.get("discount_pct") or 0)
    tax_pct = float(row.get("tax_pct") or 18)

    sqm_per_piece = sqm_from_dimensions(width_mm, length_mtr)
    kg_per_piece = kg_from_sqm(sqm_per_piece, thickness_micron, density) if thickness_micron else 0.0

    total_sqm = round(sqm_per_piece * qty, 4)
    total_kg = round(kg_per_piece * qty, 4)

    amount_before_discount = round(qty * rate, 2)
    discount_amount = round(amount_before_discount * discount_pct / 100, 2)
    taxable_amount = round(amount_before_discount - discount_amount, 2)
    tax_amount = round(taxable_amount * tax_pct / 100, 2)
    total_amount = round(taxable_amount + tax_amount, 2)

    return {
        **row,
        "sqm_per_piece": sqm_per_piece,
        "kg_per_piece": kg_per_piece,
        "total_sqm": total_sqm,
        "total_kg": total_kg,
        "amount_before_discount": amount_before_discount,
        "discount_amount": discount_amount,
        "taxable_amount": taxable_amount,
        "tax_amount": tax_amount,
        "total_amount": total_amount,
    }


def recalculate_document(items: list, overall_discount_pct: float = 0.0) -> Dict[str, Any]:
    """
    Recalculate all rows and document totals.
    Returns updated items list + document-level totals.
    """
    updated_items = [recalculate_item_row(item) for item in items]

    subtotal = sum(i.get("taxable_amount", 0) for i in updated_items)
    total_discount = sum(i.get("discount_amount", 0) for i in updated_items)
    total_tax = sum(i.get("tax_amount", 0) for i in updated_items)
    grand_total_before = sum(i.get("total_amount", 0) for i in updated_items)

    overall_discount_amount = round(grand_total_before * overall_discount_pct / 100, 2)
    grand_total = round(grand_total_before - overall_discount_amount, 2)

    return {
        "items": updated_items,
        "subtotal": round(subtotal, 2),
        "total_discount": round(total_discount + overall_discount_amount, 2),
        "total_tax": round(total_tax, 2),
        "grand_total": grand_total,
        "total_sqm": round(sum(i.get("total_sqm", 0) for i in updated_items), 4),
        "total_kg": round(sum(i.get("total_kg", 0) for i in updated_items), 4),
    }


# ─── API-level route helper ───────────────────────────────────────────────────

def convert_all_uom(width_mm: float, length_mtr: float, thickness_micron: float,
                    qty: float, density: float = DEFAULT_DENSITY) -> Dict[str, Any]:
    """
    Master conversion function — computes all UOM values at once.
    Used by the Physics Engine endpoint.
    """
    sqm_per_piece = sqm_from_dimensions(width_mm, length_mtr)
    kg_per_piece = kg_from_sqm(sqm_per_piece, thickness_micron, density)

    return {
        "per_piece": {
            "sqm": sqm_per_piece,
            "kg": kg_per_piece,
        },
        "total": {
            "qty": qty,
            "sqm": round(sqm_per_piece * qty, 4),
            "kg": round(kg_per_piece * qty, 4),
        },
        "meta": {
            "width_mm": width_mm,
            "length_mtr": length_mtr,
            "thickness_micron": thickness_micron,
            "density": density,
        }
    }
