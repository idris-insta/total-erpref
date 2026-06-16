"""
seed_pg.py — PostgreSQL demo seeder for instabiz-erp-unified (FastAPI backend).

Unlike the legacy seed_data.py (MongoDB/motor), this seeds through the running
REST API, so payloads are always schema-valid. Idempotent-ish: 4xx on an entity
that already exists is logged and skipped, never fatal.

Usage (from WSL, backend running on :8000):
    ~/erp-venv/bin/python seed_pg.py
Optional env: API_BASE (default http://127.0.0.1:8000),
              SEED_EMAIL / SEED_PASSWORD (admin login, auto-registers if missing).
"""
import json
import os
import urllib.error
import urllib.request

API = os.environ.get("API_BASE", "http://127.0.0.1:8000").rstrip("/")
EMAIL = os.environ.get("SEED_EMAIL", "admin@instabiz.local")
PASSWORD = os.environ.get("SEED_PASSWORD", "admin123")


def _req(method, path, body=None, token=None):
    url = API + path
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token:
        r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r) as resp:
            raw = resp.read().decode()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:160]
    except urllib.error.URLError as e:
        return 0, str(e)


def login():
    st, body = _req("POST", "/api/auth/login", {"email": EMAIL, "password": PASSWORD})
    if st == 200 and isinstance(body, dict):
        return body["token"]
    # not registered yet — create the admin
    st, body = _req("POST", "/api/auth/register",
                    {"email": EMAIL, "password": PASSWORD, "name": "Admin", "role": "admin"})
    if st == 200 and isinstance(body, dict):
        return body["token"]
    raise SystemExit(f"login/register failed: {st} {body}")


def seed(token, label, path, rows):
    ok = skip = 0
    for row in rows:
        st, body = _req("POST", path, row, token)
        if st in (200, 201):
            ok += 1
        else:
            skip += 1
            print(f"   - skip ({st}): {str(body)[:90]}")
    print(f"  {label}: {ok} created, {skip} skipped")


ACCOUNTS = [
    {"customer_name": "Shree Packaging Industries", "gstin": "27ABCDS1234A1Z5",
     "billing_address": "Plot 14, MIDC Bhosari", "billing_city": "Pune",
     "billing_state": "Maharashtra", "billing_pincode": "411026",
     "credit_limit": 500000, "credit_days": 30, "location": "maharashtra"},
    {"customer_name": "Gujarat Tapes & Films Pvt Ltd", "gstin": "24AAECG5678B1Z2",
     "billing_address": "Survey 88, GIDC Vapi", "billing_city": "Vapi",
     "billing_state": "Gujarat", "billing_pincode": "396195",
     "credit_limit": 800000, "credit_days": 45, "location": "gujarat"},
    {"customer_name": "Chennai Adhesives Co", "gstin": "33AAFCC9012C1Z9",
     "billing_address": "12 Ambattur Industrial Estate", "billing_city": "Chennai",
     "billing_state": "Tamil Nadu", "billing_pincode": "600058",
     "credit_limit": 300000, "credit_days": 30, "location": "chennai"},
    {"customer_name": "Mumbai Carton Works", "gstin": "27AAGCM3456D1Z7",
     "billing_address": "Unit 5, Andheri MIDC", "billing_city": "Mumbai",
     "billing_state": "Maharashtra", "billing_pincode": "400093",
     "credit_limit": 250000, "credit_days": 21, "location": "maharashtra"},
    {"customer_name": "Surat Label Printers", "gstin": "24AAHCS7890E1Z4",
     "billing_address": "Ring Road, Udhna", "billing_city": "Surat",
     "billing_state": "Gujarat", "billing_pincode": "394210",
     "credit_limit": 400000, "credit_days": 30, "location": "gujarat"},
    {"customer_name": "Coimbatore Auto Components", "gstin": "33AAICC2345F1Z1",
     "billing_address": "SIDCO Industrial Area", "billing_city": "Coimbatore",
     "billing_state": "Tamil Nadu", "billing_pincode": "641021",
     "credit_limit": 600000, "credit_days": 45, "location": "chennai"},
]

LEADS = [
    {"company_name": "Nashik Flexi Pack", "contact_person": "Rohan Deshmukh",
     "email": "rohan@nashikflexi.in", "phone": "9822011223", "source": "Website",
     "city": "Nashik", "state": "Maharashtra", "estimated_value": 180000,
     "product_interest": "BOPP Tape", "status": "New"},
    {"company_name": "Rajkot Insulation Pvt Ltd", "contact_person": "Meera Patel",
     "email": "meera@rajkotinsul.com", "phone": "9898012345", "source": "Referral",
     "city": "Rajkot", "state": "Gujarat", "estimated_value": 320000,
     "product_interest": "Foam Tape", "status": "Contacted"},
    {"company_name": "Trichy Electricals", "contact_person": "Karthik Raman",
     "email": "karthik@trichyelec.in", "phone": "9943011456", "source": "Exhibition",
     "city": "Tiruchirappalli", "state": "Tamil Nadu", "estimated_value": 95000,
     "product_interest": "Cloth Tape", "status": "New"},
    {"company_name": "Aurangabad Auto Ancillaries", "contact_person": "Sunil More",
     "email": "sunil@aurangabadauto.com", "phone": "9011022334", "source": "Cold Call",
     "city": "Aurangabad", "state": "Maharashtra", "estimated_value": 540000,
     "product_interest": "Specialty Tape", "status": "Qualified"},
    {"company_name": "Ahmedabad Pharma Packaging", "contact_person": "Nisha Shah",
     "email": "nisha@admpharma.in", "phone": "9925033445", "source": "Website",
     "city": "Ahmedabad", "state": "Gujarat", "estimated_value": 210000,
     "product_interest": "BOPP Tape", "status": "Contacted"},
    {"company_name": "Madurai Textile Mills", "contact_person": "Bala Subramanian",
     "email": "bala@maduraitex.in", "phone": "9952044556", "source": "Referral",
     "city": "Madurai", "state": "Tamil Nadu", "estimated_value": 130000,
     "product_interest": "Cloth Tape", "status": "New"},
    {"company_name": "Kolhapur Foundry Works", "contact_person": "Amit Patil",
     "email": "amit@kolhapurfoundry.com", "phone": "9766055667", "source": "Exhibition",
     "city": "Kolhapur", "state": "Maharashtra", "estimated_value": 410000,
     "product_interest": "Foam Tape", "status": "Qualified"},
    {"company_name": "Vadodara Chemicals Ltd", "contact_person": "Priya Joshi",
     "email": "priya@vadodarachem.in", "phone": "9879066778", "source": "Website",
     "city": "Vadodara", "state": "Gujarat", "estimated_value": 275000,
     "product_interest": "Specialty Tape", "status": "Contacted"},
]

ITEMS = [
    {"item_code": "BOPP-48-65", "item_name": "BOPP Tape 48mm x 65m Clear", "category": "BOPP",
     "uom": "PCS", "hsn_code": "39199090", "width": 48, "length": 65, "color": "Clear",
     "standard_cost": 11.5, "selling_price": 18, "reorder_level": 500},
    {"item_code": "BOPP-72-65", "item_name": "BOPP Tape 72mm x 65m Brown", "category": "BOPP",
     "uom": "PCS", "hsn_code": "39199090", "width": 72, "length": 65, "color": "Brown",
     "standard_cost": 16, "selling_price": 25, "reorder_level": 400},
    {"item_code": "CLOTH-48-25", "item_name": "Cloth Tape 48mm x 25m Black", "category": "CLOTH",
     "uom": "PCS", "hsn_code": "59069990", "width": 48, "length": 25, "color": "Black",
     "standard_cost": 28, "selling_price": 42, "reorder_level": 300},
    {"item_code": "FOAM-24-5", "item_name": "Foam Tape 24mm x 5m White", "category": "FOAM",
     "uom": "PCS", "hsn_code": "39211900", "width": 24, "length": 5, "color": "White",
     "standard_cost": 35, "selling_price": 55, "reorder_level": 200},
    {"item_code": "FOAM-12-10", "item_name": "Foam Tape 12mm x 10m White", "category": "FOAM",
     "uom": "PCS", "hsn_code": "39211900", "width": 12, "length": 10, "color": "White",
     "standard_cost": 30, "selling_price": 48, "reorder_level": 250},
    {"item_code": "SPEC-50-50", "item_name": "Double-Sided Tissue Tape 50mm x 50m", "category": "SPECIALTY",
     "uom": "PCS", "hsn_code": "39199090", "width": 50, "length": 50, "color": "Clear",
     "standard_cost": 45, "selling_price": 72, "reorder_level": 150},
    {"item_code": "BOPP-24-65", "item_name": "BOPP Tape 24mm x 65m Clear", "category": "BOPP",
     "uom": "PCS", "hsn_code": "39199090", "width": 24, "length": 65, "color": "Clear",
     "standard_cost": 6.5, "selling_price": 11, "reorder_level": 600},
    {"item_code": "CLOTH-72-25", "item_name": "Cloth Tape 72mm x 25m Silver", "category": "CLOTH",
     "uom": "PCS", "hsn_code": "59069990", "width": 72, "length": 25, "color": "Silver",
     "standard_cost": 40, "selling_price": 60, "reorder_level": 200},
    {"item_code": "JUMBO-1280", "item_name": "BOPP Jumbo Roll 1280mm Clear", "category": "BOPP",
     "uom": "KG", "hsn_code": "39199090", "width": 1280, "color": "Clear",
     "standard_cost": 145, "selling_price": 0, "reorder_level": 50},
    {"item_code": "SPEC-PROTECT", "item_name": "Surface Protection Film 500mm", "category": "SPECIALTY",
     "uom": "KG", "hsn_code": "39191000", "width": 500, "color": "Blue",
     "standard_cost": 120, "selling_price": 185, "reorder_level": 80},
]

EMPLOYEES = [
    {"employee_code": "IB-EMP-001", "name": "Ramesh Kumar", "email": "ramesh@instabiz.in",
     "phone": "9820011001", "department": "Sales", "designation": "Sales Manager",
     "location": "maharashtra", "date_of_joining": "2022-04-01", "shift_timing": "General",
     "basic_salary": 45000, "hra": 9000, "pf": 1800, "esi": 0, "pt": 200},
    {"employee_code": "IB-EMP-002", "name": "Anita Singh", "email": "anita@instabiz.in",
     "phone": "9820011002", "department": "Sales", "designation": "Sales Executive",
     "location": "gujarat", "date_of_joining": "2023-06-15", "shift_timing": "General",
     "basic_salary": 28000, "hra": 5600, "pf": 1800, "esi": 0, "pt": 200},
    {"employee_code": "IB-EMP-003", "name": "Vijay Nair", "email": "vijay@instabiz.in",
     "phone": "9820011003", "department": "Factory Production", "designation": "Production Supervisor",
     "location": "maharashtra", "date_of_joining": "2021-01-10", "shift_timing": "Factory Shift",
     "basic_salary": 32000, "hra": 6400, "pf": 1800, "esi": 0, "pt": 200},
    {"employee_code": "IB-EMP-004", "name": "Lakshmi Iyer", "email": "lakshmi@instabiz.in",
     "phone": "9820011004", "department": "Accounts", "designation": "Accounts Executive",
     "location": "chennai", "date_of_joining": "2023-02-20", "shift_timing": "General",
     "basic_salary": 30000, "hra": 6000, "pf": 1800, "esi": 0, "pt": 200},
    {"employee_code": "IB-EMP-005", "name": "Suresh Patil", "email": "suresh@instabiz.in",
     "phone": "9820011005", "department": "Warehouse", "designation": "Warehouse Incharge",
     "location": "gujarat", "date_of_joining": "2020-09-05", "shift_timing": "General",
     "basic_salary": 26000, "hra": 5200, "pf": 1800, "esi": 195, "pt": 200},
]


def main():
    print(f"Seeding {API} as {EMAIL} ...")
    token = login()
    print("  auth: OK")
    seed(token, "Accounts", "/api/crm/accounts", ACCOUNTS)
    seed(token, "Leads", "/api/crm/leads", LEADS)
    seed(token, "Items", "/api/inventory/items", ITEMS)
    seed(token, "Employees", "/api/hrms/employees", EMPLOYEES)
    print("Done.")


if __name__ == "__main__":
    main()
