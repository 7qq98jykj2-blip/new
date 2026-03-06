from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, date
import bcrypt
import jwt
from calendar import monthrange

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'

# ============ MODELS ============

class UserCreate(BaseModel):
    mobile: str
    password: str
    name: str
    role: str  # 'admin' or 'driver'

class UserLogin(BaseModel):
    mobile: str
    password: str

class UserResponse(BaseModel):
    id: str
    mobile: str
    name: str
    role: str

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class DriverCreate(BaseModel):
    full_name: str
    aadhaar_number: str
    address: str
    phone: str
    password: str  # Password for driver login
    job_start_date: str
    base_salary: float
    standard_hours: float
    profile_photo_url: Optional[str] = None
    aadhaar_photo_url: Optional[str] = None
    pan_card_photo_url: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry_date: Optional[str] = None
    license_photo_url: Optional[str] = None
    emergency_contact: Optional[str] = None
    blood_type: Optional[str] = None
    can_drive_2wheeler: bool = False
    can_drive_4wheeler: bool = False
    upi_id: Optional[str] = None

class DriverUpdate(BaseModel):
    full_name: Optional[str] = None
    aadhaar_number: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    job_start_date: Optional[str] = None
    base_salary: Optional[float] = None
    standard_hours: Optional[float] = None
    profile_photo_url: Optional[str] = None
    aadhaar_photo_url: Optional[str] = None
    pan_card_photo_url: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry_date: Optional[str] = None
    license_photo_url: Optional[str] = None
    emergency_contact: Optional[str] = None
    blood_type: Optional[str] = None
    can_drive_2wheeler: Optional[bool] = None
    can_drive_4wheeler: Optional[bool] = None
    upi_id: Optional[str] = None

class DriverResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    full_name: str
    aadhaar_number: str
    address: str
    phone: str
    job_start_date: str
    base_salary: float
    standard_hours: float
    profile_photo_url: Optional[str] = None
    aadhaar_photo_url: Optional[str] = None
    pan_card_photo_url: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry_date: Optional[str] = None
    license_photo_url: Optional[str] = None
    emergency_contact: Optional[str] = None
    blood_type: Optional[str] = None
    can_drive_2wheeler: bool = False
    can_drive_4wheeler: bool = False
    upi_id: Optional[str] = None
    license_expiring_soon: Optional[bool] = False
    created_at: str

class DutyEntryCreate(BaseModel):
    driver_id: str
    date: str
    in_time: str
    out_time: str

class DutyEntryUpdate(BaseModel):
    in_time: Optional[str] = None
    out_time: Optional[str] = None

class DutyEntryResponse(BaseModel):
    id: str
    driver_id: str
    driver_name: Optional[str] = None
    date: str
    in_time: str
    out_time: str
    hours_worked: float
    overtime_minutes: int
    conveyance_given: bool
    dinner_given: bool
    breakfast_given: bool
    approval_status: str  # pending, approved, rejected
    created_at: str

class DutyApprovalUpdate(BaseModel):
    approval_status: str  # approved or rejected

class AdvanceCreate(BaseModel):
    driver_id: str
    amount: float
    date: str
    reason: str

class AdvanceResponse(BaseModel):
    id: str
    driver_id: str
    driver_name: Optional[str] = None
    amount: float
    settled_amount: float
    date: str
    reason: str
    created_at: str

class BonusCreate(BaseModel):
    driver_id: str
    amount: float
    date: str
    bonus_type: str  # yearly, monthly, incentive
    reason: str

class BonusResponse(BaseModel):
    id: str
    driver_id: str
    driver_name: Optional[str] = None
    amount: float
    date: str
    bonus_type: str
    reason: str
    created_at: str

class PaymentProofCreate(BaseModel):
    driver_id: str
    month: int
    year: int
    screenshot_url: str

class PaymentProofResponse(BaseModel):
    id: str
    driver_id: str
    month: int
    year: int
    screenshot_url: str
    upload_date: str

class LeaveRecordCreate(BaseModel):
    driver_id: str
    date: str
    reason: str

class LeaveRecordResponse(BaseModel):
    id: str
    driver_id: str
    driver_name: Optional[str] = None
    date: str
    reason: str
    deduction_amount: float
    created_at: str

class ExpenseCreate(BaseModel):
    driver_id: str
    date: str
    amount: float
    description: str
    category: str  # 'fuel', 'toll', 'misc'

class ExpenseResponse(BaseModel):
    id: str
    driver_id: str
    driver_name: Optional[str] = None
    date: str
    amount: float
    description: str
    category: str
    created_at: str

class SettingsResponse(BaseModel):
    overtime_per_15min: float
    conveyance_amount: float
    dinner_amount: float
    breakfast_amount: float
    conveyance_trigger_before_time: str  # e.g., "08:00"
    conveyance_trigger_after_time: str  # e.g., "23:30"
    dinner_trigger_after_time: str  # e.g., "23:00"
    breakfast_trigger_before_time: str  # e.g., "07:30"
    grace_period_minutes: int  # Grace period before overtime calculation
    working_days_per_week: int
    days_in_month: int

class SettingsUpdate(BaseModel):
    overtime_per_15min: Optional[float] = None
    conveyance_amount: Optional[float] = None
    dinner_amount: Optional[float] = None
    breakfast_amount: Optional[float] = None
    conveyance_trigger_before_time: Optional[str] = None
    conveyance_trigger_after_time: Optional[str] = None
    dinner_trigger_after_time: Optional[str] = None
    breakfast_trigger_before_time: Optional[str] = None
    grace_period_minutes: Optional[int] = None
    working_days_per_week: Optional[int] = None
    days_in_month: Optional[int] = None

class PayrollResponse(BaseModel):
    driver_id: str
    driver_name: str
    month: int
    year: int
    base_salary: float
    total_overtime_amount: float
    total_conveyance: float
    total_dinner: float
    total_breakfast: float
    total_expenses: float
    total_bonuses: float
    total_advances: float
    leave_deductions: float
    deductions: float
    net_pay: float
    duty_entries: List[dict]
    expenses: List[dict]
    bonuses: List[dict]
    advances: List[dict]
    leaves: List[dict]
    payment_proof_url: Optional[str] = None

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str) -> str:
    payload = {'user_id': user_id, 'role': role}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({'id': payload['user_id']}, {'_id': 0})
        if not user:
            raise HTTPException(status_code=401, detail='User not found')
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expired')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Invalid token')

async def get_admin_user(user: dict = Depends(get_current_user)):
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    return user

# ============ CALCULATION HELPERS ============

def calculate_duty_details(in_time_str: str, out_time_str: str, standard_hours: float, settings: dict):
    """Calculate hours worked, overtime, conveyance, dinner, and breakfast allowances"""
    in_time = datetime.fromisoformat(in_time_str)
    out_time = datetime.fromisoformat(out_time_str)
    
    # Calculate total hours worked
    duration = out_time - in_time
    hours_worked = duration.total_seconds() / 3600
    
    # Calculate overtime in minutes with grace period
    overtime_hours = max(0, hours_worked - standard_hours)
    overtime_minutes_exact = overtime_hours * 60
    
    # Apply grace period - only count overtime if it exceeds grace period
    grace_period = settings.get('grace_period_minutes', 0)
    if overtime_minutes_exact > grace_period:
        overtime_minutes_after_grace = overtime_minutes_exact - grace_period
        # Round up to nearest 15 minutes
        overtime_minutes = int((overtime_minutes_after_grace + 14) // 15) * 15
    else:
        overtime_minutes = 0
    
    # Breakfast: triggered if in_time is before breakfast_trigger_before_time (e.g., 07:30)
    breakfast_trigger_parts = settings.get('breakfast_trigger_before_time', '07:30').split(':')
    breakfast_trigger_hour = int(breakfast_trigger_parts[0])
    breakfast_trigger_minute = int(breakfast_trigger_parts[1])
    breakfast_trigger_time = in_time.replace(hour=breakfast_trigger_hour, minute=breakfast_trigger_minute, second=0, microsecond=0)
    breakfast_given = in_time < breakfast_trigger_time
    
    # Conveyance: triggered if in_time before 08:00 OR out_time after 23:30
    conveyance_before_parts = settings.get('conveyance_trigger_before_time', '08:00').split(':')
    conveyance_before_hour = int(conveyance_before_parts[0])
    conveyance_before_minute = int(conveyance_before_parts[1])
    conveyance_before_trigger = in_time.replace(hour=conveyance_before_hour, minute=conveyance_before_minute, second=0, microsecond=0)
    conveyance_by_early_start = in_time < conveyance_before_trigger
    
    conveyance_after_parts = settings.get('conveyance_trigger_after_time', '23:30').split(':')
    conveyance_after_hour = int(conveyance_after_parts[0])
    conveyance_after_minute = int(conveyance_after_parts[1])
    conveyance_after_trigger = out_time.replace(hour=conveyance_after_hour, minute=conveyance_after_minute, second=0, microsecond=0)
    conveyance_by_late_end = out_time >= conveyance_after_trigger
    
    conveyance_given = conveyance_by_early_start or conveyance_by_late_end
    
    # Dinner: triggered if out_time is after dinner_trigger_after_time (e.g., 23:00)
    dinner_trigger_parts = settings.get('dinner_trigger_after_time', '23:00').split(':')
    dinner_trigger_hour = int(dinner_trigger_parts[0])
    dinner_trigger_minute = int(dinner_trigger_parts[1])
    dinner_trigger_time = out_time.replace(hour=dinner_trigger_hour, minute=dinner_trigger_minute, second=0, microsecond=0)
    dinner_given = out_time >= dinner_trigger_time
    
    return {
        'hours_worked': round(hours_worked, 2),
        'overtime_minutes': overtime_minutes,
        'conveyance_given': conveyance_given,
        'dinner_given': dinner_given,
        'breakfast_given': breakfast_given
    }

# ============ AUTH ROUTES ============

@api_router.post('/auth/register', response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({'mobile': user_data.mobile}, {'_id': 0})
    if existing:
        raise HTTPException(status_code=400, detail='Mobile number already registered')
    
    user_id = str(uuid.uuid4())
    user_doc = {
        'id': user_id,
        'mobile': user_data.mobile,
        'password_hash': hash_password(user_data.password),
        'name': user_data.name,
        'role': user_data.role,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.role)
    user_response = UserResponse(id=user_id, mobile=user_data.mobile, name=user_data.name, role=user_data.role)
    
    return TokenResponse(token=token, user=user_response)

@api_router.post('/auth/login', response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({'mobile': credentials.mobile}, {'_id': 0})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail='Invalid mobile number or password')
    
    token = create_token(user['id'], user['role'])
    user_response = UserResponse(id=user['id'], mobile=user['mobile'], name=user['name'], role=user['role'])
    
    return TokenResponse(token=token, user=user_response)

@api_router.get('/auth/me', response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(id=user['id'], mobile=user['mobile'], name=user['name'], role=user['role'])

# ============ DRIVER ROUTES ============

@api_router.post('/drivers', response_model=DriverResponse)
async def create_driver(driver_data: DriverCreate, user: dict = Depends(get_admin_user)):
    # Check if user with this phone already exists
    existing_user = await db.users.find_one({'mobile': driver_data.phone}, {'_id': 0})
    
    user_id = None
    if not existing_user:
        # Create user account for driver
        user_id = str(uuid.uuid4())
        user_doc = {
            'id': user_id,
            'mobile': driver_data.phone,
            'password_hash': hash_password(driver_data.password),
            'name': driver_data.full_name,
            'role': 'driver',
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    else:
        user_id = existing_user['id']
        # Update password if provided
        await db.users.update_one(
            {'id': user_id},
            {'$set': {'password_hash': hash_password(driver_data.password)}}
        )
    
    driver_id = str(uuid.uuid4())
    driver_doc = {
        'id': driver_id,
        'user_id': user_id,
        **{k: v for k, v in driver_data.model_dump().items() if k != 'password'},
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.drivers.insert_one(driver_doc)
    return DriverResponse(**{k: v for k, v in driver_doc.items() if k != '_id'})

@api_router.get('/drivers', response_model=List[DriverResponse])
async def list_drivers(user: dict = Depends(get_current_user)):
    drivers = await db.drivers.find({}, {'_id': 0}).to_list(1000)
    return [DriverResponse(**d) for d in drivers]

@api_router.get('/drivers/{driver_id}', response_model=DriverResponse)
async def get_driver(driver_id: str, user: dict = Depends(get_current_user)):
    driver = await db.drivers.find_one({'id': driver_id}, {'_id': 0})
    if not driver:
        raise HTTPException(status_code=404, detail='Driver not found')
    return DriverResponse(**driver)

@api_router.put('/drivers/{driver_id}', response_model=DriverResponse)
async def update_driver(driver_id: str, driver_data: DriverUpdate, user: dict = Depends(get_admin_user)):
    update_data = {k: v for k, v in driver_data.model_dump().items() if v is not None and k != 'password'}
    if not update_data and not driver_data.password:
        raise HTTPException(status_code=400, detail='No data to update')
    
    # Get existing driver
    driver = await db.drivers.find_one({'id': driver_id}, {'_id': 0})
    if not driver:
        raise HTTPException(status_code=404, detail='Driver not found')
    
    # Update driver password if provided
    if driver_data.password:
        if driver.get('user_id'):
            await db.users.update_one(
                {'id': driver['user_id']},
                {'$set': {'password_hash': hash_password(driver_data.password)}}
            )
        else:
            # Create user account if doesn't exist
            user_id = str(uuid.uuid4())
            user_doc = {
                'id': user_id,
                'mobile': driver.get('phone'),
                'password_hash': hash_password(driver_data.password),
                'name': driver.get('full_name'),
                'role': 'driver',
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user_doc)
            update_data['user_id'] = user_id
    
    if update_data:
        result = await db.drivers.update_one({'id': driver_id}, {'$set': update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail='Driver not found')
    
    updated_driver = await db.drivers.find_one({'id': driver_id}, {'_id': 0})
    return DriverResponse(**updated_driver)

@api_router.delete('/drivers/{driver_id}')
async def delete_driver(driver_id: str, user: dict = Depends(get_admin_user)):
    result = await db.drivers.delete_one({'id': driver_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Driver not found')
    return {'message': 'Driver deleted successfully'}

# ============ DUTY ENTRY ROUTES ============

@api_router.post('/duty-entries', response_model=DutyEntryResponse)
async def create_duty_entry(entry_data: DutyEntryCreate, user: dict = Depends(get_current_user)):
    # Get driver info for standard hours
    driver = await db.drivers.find_one({'id': entry_data.driver_id}, {'_id': 0})
    if not driver:
        raise HTTPException(status_code=404, detail='Driver not found')
    
    # Get settings
    settings = await db.settings.find_one({}, {'_id': 0})
    if not settings:
        # Create default settings
        settings = {
            'overtime_per_15min': 25.0,
            'conveyance_amount': 75.0,
            'dinner_amount': 200.0,
            'breakfast_amount': 100.0,
            'conveyance_trigger_before_time': '08:00',
            'conveyance_trigger_after_time': '23:30',
            'dinner_trigger_after_time': '23:00',
            'breakfast_trigger_before_time': '07:30',
            'grace_period_minutes': 15,
            'working_days_per_week': 6,
            'days_in_month': 30
        }
        await db.settings.insert_one(settings)
    
    # Calculate duty details
    details = calculate_duty_details(
        entry_data.in_time,
        entry_data.out_time,
        driver['standard_hours'],
        settings
    )
    
    entry_id = str(uuid.uuid4())
    entry_doc = {
        'id': entry_id,
        'driver_id': entry_data.driver_id,
        'date': entry_data.date,
        'in_time': entry_data.in_time,
        'out_time': entry_data.out_time,
        'hours_worked': details['hours_worked'],
        'overtime_minutes': details['overtime_minutes'],
        'conveyance_given': details['conveyance_given'],
        'dinner_given': details['dinner_given'],
        'breakfast_given': details['breakfast_given'],
        'approval_status': 'pending',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.duty_entries.insert_one(entry_doc)
    
    response = DutyEntryResponse(**{k: v for k, v in entry_doc.items() if k != '_id'})
    response.driver_name = driver['full_name']
    return response

@api_router.get('/duty-entries', response_model=List[DutyEntryResponse])
async def list_duty_entries(
    driver_id: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if driver_id:
        query['driver_id'] = driver_id
    if month and year:
        # Filter by month and year
        start_date = f"{year}-{month:02d}-01"
        last_day = monthrange(year, month)[1]
        end_date = f"{year}-{month:02d}-{last_day}"
        query['date'] = {'$gte': start_date, '$lte': end_date}
    
    entries = await db.duty_entries.find(query, {'_id': 0}).to_list(1000)
    
    # Add driver names
    driver_ids = list(set([e['driver_id'] for e in entries]))
    drivers = await db.drivers.find({'id': {'$in': driver_ids}}, {'_id': 0}).to_list(1000)
    driver_map = {d['id']: d['full_name'] for d in drivers}
    
    result = []
    for entry in entries:
        resp = DutyEntryResponse(**entry)
        resp.driver_name = driver_map.get(entry['driver_id'])
        result.append(resp)
    
    return result

@api_router.put('/duty-entries/{entry_id}', response_model=DutyEntryResponse)
async def update_duty_entry(entry_id: str, entry_data: DutyEntryUpdate, user: dict = Depends(get_admin_user)):
    # Get existing entry
    entry = await db.duty_entries.find_one({'id': entry_id}, {'_id': 0})
    if not entry:
        raise HTTPException(status_code=404, detail='Duty entry not found')
    
    # Get driver info
    driver = await db.drivers.find_one({'id': entry['driver_id']}, {'_id': 0})
    if not driver:
        raise HTTPException(status_code=404, detail='Driver not found')
    
    # Get settings
    settings = await db.settings.find_one({}, {'_id': 0})
    
    # Update times if provided
    in_time = entry_data.in_time if entry_data.in_time else entry['in_time']
    out_time = entry_data.out_time if entry_data.out_time else entry['out_time']
    
    # Recalculate
    details = calculate_duty_details(in_time, out_time, driver['standard_hours'], settings)
    
    update_data = {
        'in_time': in_time,
        'out_time': out_time,
        'hours_worked': details['hours_worked'],
        'overtime_minutes': details['overtime_minutes'],
        'conveyance_given': details['conveyance_given'],
        'dinner_given': details['dinner_given'],
        'breakfast_given': details['breakfast_given']
    }
    
    await db.duty_entries.update_one({'id': entry_id}, {'$set': update_data})
    
    updated_entry = await db.duty_entries.find_one({'id': entry_id}, {'_id': 0})
    response = DutyEntryResponse(**updated_entry)
    response.driver_name = driver['full_name']
    return response

@api_router.delete('/duty-entries/{entry_id}')
async def delete_duty_entry(entry_id: str, user: dict = Depends(get_admin_user)):
    result = await db.duty_entries.delete_one({'id': entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Duty entry not found')
    return {'message': 'Duty entry deleted successfully'}

# ============ EXPENSE ROUTES ============

@api_router.post('/expenses', response_model=ExpenseResponse)
async def create_expense(expense_data: ExpenseCreate, user: dict = Depends(get_current_user)):
    expense_id = str(uuid.uuid4())
    expense_doc = {
        'id': expense_id,
        **expense_data.model_dump(),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.expenses.insert_one(expense_doc)
    
    # Get driver name
    driver = await db.drivers.find_one({'id': expense_data.driver_id}, {'_id': 0})
    response = ExpenseResponse(**{k: v for k, v in expense_doc.items() if k != '_id'})
    response.driver_name = driver['full_name'] if driver else None
    return response

@api_router.get('/expenses', response_model=List[ExpenseResponse])
async def list_expenses(
    driver_id: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if driver_id:
        query['driver_id'] = driver_id
    if month and year:
        start_date = f"{year}-{month:02d}-01"
        last_day = monthrange(year, month)[1]
        end_date = f"{year}-{month:02d}-{last_day}"
        query['date'] = {'$gte': start_date, '$lte': end_date}
    
    expenses = await db.expenses.find(query, {'_id': 0}).to_list(1000)
    
    # Add driver names
    driver_ids = list(set([e['driver_id'] for e in expenses]))
    drivers = await db.drivers.find({'id': {'$in': driver_ids}}, {'_id': 0}).to_list(1000)
    driver_map = {d['id']: d['full_name'] for d in drivers}
    
    result = []
    for expense in expenses:
        resp = ExpenseResponse(**expense)
        resp.driver_name = driver_map.get(expense['driver_id'])
        result.append(resp)
    
    return result

@api_router.delete('/expenses/{expense_id}')
async def delete_expense(expense_id: str, user: dict = Depends(get_admin_user)):
    result = await db.expenses.delete_one({'id': expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Expense not found')
    return {'message': 'Expense deleted successfully'}

# ============ SETTINGS ROUTES ============

@api_router.get('/settings', response_model=SettingsResponse)
async def get_settings(user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({}, {'_id': 0})
    if not settings:
        settings = {
            'overtime_per_15min': 25.0,
            'conveyance_amount': 75.0,
            'dinner_amount': 200.0,
            'breakfast_amount': 100.0,
            'conveyance_trigger_before_time': '08:00',
            'conveyance_trigger_after_time': '23:30',
            'dinner_trigger_after_time': '23:00',
            'breakfast_trigger_before_time': '07:30',
            'grace_period_minutes': 15,
            'working_days_per_week': 6,
            'days_in_month': 30
        }
        await db.settings.insert_one(settings)
    return SettingsResponse(**settings)

@api_router.put('/settings', response_model=SettingsResponse)
async def update_settings(settings_data: SettingsUpdate, user: dict = Depends(get_admin_user)):
    update_data = {k: v for k, v in settings_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail='No data to update')
    
    settings = await db.settings.find_one({}, {'_id': 0})
    if settings:
        await db.settings.update_one({}, {'$set': update_data})
    else:
        default_settings = {
            'overtime_per_15min': 25.0,
            'conveyance_amount': 75.0,
            'dinner_amount': 200.0,
            'breakfast_amount': 100.0,
            'conveyance_trigger_before_time': '08:00',
            'conveyance_trigger_after_time': '23:30',
            'dinner_trigger_after_time': '23:00',
            'breakfast_trigger_before_time': '07:30',
            'working_days_per_week': 6,
            'days_in_month': 30,
            **update_data
        }
        await db.settings.insert_one(default_settings)
    
    updated_settings = await db.settings.find_one({}, {'_id': 0})
    return SettingsResponse(**updated_settings)

# ============ PAYROLL ROUTES ============

@api_router.get('/payroll/{driver_id}/{year}/{month}', response_model=PayrollResponse)
async def calculate_payroll(driver_id: str, year: int, month: int, user: dict = Depends(get_current_user)):
    # Get driver
    driver = await db.drivers.find_one({'id': driver_id}, {'_id': 0})
    if not driver:
        raise HTTPException(status_code=404, detail='Driver not found')
    
    # Get settings
    settings = await db.settings.find_one({}, {'_id': 0})
    if not settings:
        settings = {
            'overtime_per_15min': 25.0,
            'conveyance_amount': 75.0,
            'dinner_amount': 200.0,
            'breakfast_amount': 100.0,
            'conveyance_trigger_before_time': '08:00',
            'conveyance_trigger_after_time': '23:30',
            'dinner_trigger_after_time': '23:00',
            'breakfast_trigger_before_time': '07:30',
            'grace_period_minutes': 15,
            'working_days_per_week': 6,
            'days_in_month': 30
        }
    
    # Get duty entries for the month (only approved ones)
    start_date = f"{year}-{month:02d}-01"
    last_day = monthrange(year, month)[1]
    end_date = f"{year}-{month:02d}-{last_day}"
    
    duty_entries = await db.duty_entries.find({
        'driver_id': driver_id,
        'date': {'$gte': start_date, '$lte': end_date},
        'approval_status': 'approved'
    }, {'_id': 0}).to_list(1000)
    
    # Get expenses
    expenses = await db.expenses.find({
        'driver_id': driver_id,
        'date': {'$gte': start_date, '$lte': end_date}
    }, {'_id': 0}).to_list(1000)
    
    # Get bonuses
    bonuses = await db.bonuses.find({
        'driver_id': driver_id,
        'date': {'$gte': start_date, '$lte': end_date}
    }, {'_id': 0}).to_list(1000)
    
    # Get advances (unsettled)
    advances = await db.advances.find({
        'driver_id': driver_id
    }, {'_id': 0}).to_list(1000)
    
    # Get leaves
    leaves = await db.leaves.find({
        'driver_id': driver_id,
        'date': {'$gte': start_date, '$lte': end_date}
    }, {'_id': 0}).to_list(1000)
    
    # Get payment proof
    payment_proof = await db.payment_proofs.find_one({
        'driver_id': driver_id,
        'year': year,
        'month': month
    }, {'_id': 0})
    
    # Calculate totals
    total_overtime_minutes = sum([e['overtime_minutes'] for e in duty_entries])
    total_overtime_amount = (total_overtime_minutes / 15) * settings['overtime_per_15min']
    
    conveyance_count = sum([1 for e in duty_entries if e.get('conveyance_given', False)])
    total_conveyance = conveyance_count * settings['conveyance_amount']
    
    dinner_count = sum([1 for e in duty_entries if e.get('dinner_given', False)])
    total_dinner = dinner_count * settings['dinner_amount']
    
    breakfast_count = sum([1 for e in duty_entries if e.get('breakfast_given', False)])
    total_breakfast = breakfast_count * settings.get('breakfast_amount', 100.0)
    
    total_expenses = sum([e['amount'] for e in expenses])
    total_bonuses = sum([b['amount'] for b in bonuses])
    
    # Calculate unsettled advances
    total_advances = sum([a['amount'] - a['settled_amount'] for a in advances if a['amount'] > a['settled_amount']])
    
    # Calculate leave deductions
    leave_deductions = sum([l['deduction_amount'] for l in leaves])
    
    # Other deductions (can be extended)
    other_deductions = 0
    
    # Net pay calculation
    net_pay = (driver['base_salary'] + total_overtime_amount + total_conveyance + 
               total_dinner + total_breakfast + total_expenses + total_bonuses - total_advances - 
               leave_deductions - other_deductions)
    
    return PayrollResponse(
        driver_id=driver_id,
        driver_name=driver['full_name'],
        month=month,
        year=year,
        base_salary=driver['base_salary'],
        total_overtime_amount=round(total_overtime_amount, 2),
        total_conveyance=round(total_conveyance, 2),
        total_dinner=round(total_dinner, 2),
        total_breakfast=round(total_breakfast, 2),
        total_expenses=round(total_expenses, 2),
        total_bonuses=round(total_bonuses, 2),
        total_advances=round(total_advances, 2),
        leave_deductions=round(leave_deductions, 2),
        deductions=round(other_deductions, 2),
        net_pay=round(net_pay, 2),
        duty_entries=[{
            'date': e['date'],
            'hours_worked': e['hours_worked'],
            'overtime_minutes': e['overtime_minutes'],
            'conveyance_given': e.get('conveyance_given', False),
            'dinner_given': e.get('dinner_given', False),
            'breakfast_given': e.get('breakfast_given', False),
            'approval_status': e.get('approval_status', 'pending')
        } for e in duty_entries],
        expenses=[{
            'date': e['date'],
            'amount': e['amount'],
            'description': e['description'],
            'category': e['category']
        } for e in expenses],
        bonuses=[{
            'date': b['date'],
            'amount': b['amount'],
            'bonus_type': b['bonus_type'],
            'reason': b['reason']
        } for b in bonuses],
        advances=[{
            'date': a['date'],
            'amount': a['amount'],
            'settled_amount': a['settled_amount'],
            'reason': a['reason']
        } for a in advances if a['amount'] > a['settled_amount']],
        leaves=[{
            'date': l['date'],
            'reason': l['reason'],
            'deduction_amount': l['deduction_amount']
        } for l in leaves],
        payment_proof_url=payment_proof['screenshot_url'] if payment_proof else None
    )

# ============ DASHBOARD STATS ============

@api_router.get('/stats/dashboard')
async def get_dashboard_stats(user: dict = Depends(get_admin_user)):
    # Count active drivers
    total_drivers = await db.drivers.count_documents({})
    
    # Get current month info
    now = datetime.now()
    current_month = now.month
    current_year = now.year
    
    # Optimize: Batch fetch all data for current month instead of per-driver queries
    start_date = f"{current_year}-{current_month:02d}-01"
    last_day = monthrange(current_year, current_month)[1]
    end_date = f"{current_year}-{current_month:02d}-{last_day}"
    
    # Fetch all drivers and their data in parallel
    drivers = await db.drivers.find({}, {'_id': 0, 'id': 1, 'base_salary': 1}).to_list(1000)
    
    # Batch fetch all month data
    all_duty_entries = await db.duty_entries.find({
        'date': {'$gte': start_date, '$lte': end_date},
        'approval_status': 'approved'
    }, {'_id': 0}).to_list(10000)
    
    all_expenses = await db.expenses.find({
        'date': {'$gte': start_date, '$lte': end_date}
    }, {'_id': 0}).to_list(10000)
    
    all_bonuses = await db.bonuses.find({
        'date': {'$gte': start_date, '$lte': end_date}
    }, {'_id': 0}).to_list(10000)
    
    all_advances = await db.advances.find({}, {'_id': 0}).to_list(10000)
    
    all_leaves = await db.leaves.find({
        'date': {'$gte': start_date, '$lte': end_date}
    }, {'_id': 0}).to_list(10000)
    
    # Get settings once
    settings = await db.settings.find_one({}, {'_id': 0}) or {
        'overtime_per_15min': 25.0,
        'conveyance_amount': 75.0,
        'dinner_amount': 200.0,
        'breakfast_amount': 100.0
    }
    
    # Group data by driver_id in memory
    from collections import defaultdict
    duty_by_driver = defaultdict(list)
    expenses_by_driver = defaultdict(list)
    bonuses_by_driver = defaultdict(list)
    advances_by_driver = defaultdict(list)
    leaves_by_driver = defaultdict(list)
    
    for entry in all_duty_entries:
        duty_by_driver[entry['driver_id']].append(entry)
    for expense in all_expenses:
        expenses_by_driver[expense['driver_id']].append(expense)
    for bonus in all_bonuses:
        bonuses_by_driver[bonus['driver_id']].append(bonus)
    for advance in all_advances:
        advances_by_driver[advance['driver_id']].append(advance)
    for leave in all_leaves:
        leaves_by_driver[leave['driver_id']].append(leave)
    
    # Calculate total payroll
    total_payroll = 0
    for driver in drivers:
        driver_id = driver['id']
        base_salary = driver['base_salary']
        
        # Calculate driver payroll from grouped data
        duty_entries = duty_by_driver[driver_id]
        expenses = expenses_by_driver[driver_id]
        bonuses = bonuses_by_driver[driver_id]
        advances = [a for a in advances_by_driver[driver_id] if a['amount'] > a['settled_amount']]
        leaves = leaves_by_driver[driver_id]
        
        # Calculate components
        total_overtime = sum((e['overtime_minutes'] / 15) * settings['overtime_per_15min'] for e in duty_entries)
        total_conveyance = sum(settings['conveyance_amount'] for e in duty_entries if e.get('conveyance_given'))
        total_dinner = sum(settings['dinner_amount'] for e in duty_entries if e.get('dinner_given'))
        total_breakfast = sum(settings.get('breakfast_amount', 100.0) for e in duty_entries if e.get('breakfast_given'))
        total_expenses_amt = sum(e['amount'] for e in expenses)
        total_bonuses_amt = sum(b['amount'] for b in bonuses)
        total_advances_amt = sum(a['amount'] - a['settled_amount'] for a in advances)
        total_leaves_deduction = sum(l['deduction_amount'] for l in leaves)
        
        net_pay = (base_salary + total_overtime + total_conveyance + total_dinner + 
                   total_breakfast + total_expenses_amt + total_bonuses_amt - 
                   total_advances_amt - total_leaves_deduction)
        
        total_payroll += net_pay
    
    # Count today's entries
    today = now.strftime('%Y-%m-%d')
    today_entries = await db.duty_entries.count_documents({'date': today})
    
    return {
        'total_drivers': total_drivers,
        'current_month_payroll': round(total_payroll, 2),
        'today_entries': today_entries,
        'current_month': current_month,
        'current_year': current_year
    }

app.include_router(api_router)

# Include new feature routes
from routes_new_features import router as new_features_router
app.include_router(new_features_router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
