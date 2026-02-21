from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import os
from calendar import monthrange

# Import from main server
import sys
sys.path.append('/app/backend')

router = APIRouter()

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ============ NEW MODELS ============

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

class AdvanceSettlement(BaseModel):
    amount: float

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

class DutyApprovalUpdate(BaseModel):
    approval_status: str  # approved or rejected

# ============ ADVANCE ROUTES ============

@router.post('/advances', response_model=AdvanceResponse)
async def create_advance(advance_data: AdvanceCreate):
    advance_id = str(uuid.uuid4())
    advance_doc = {
        'id': advance_id,
        **advance_data.model_dump(),
        'settled_amount': 0.0,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.advances.insert_one(advance_doc)
    
    driver = await db.drivers.find_one({'id': advance_data.driver_id}, {'_id': 0})
    response = AdvanceResponse(**{k: v for k, v in advance_doc.items() if k != '_id'})
    response.driver_name = driver['full_name'] if driver else None
    return response

@router.get('/advances', response_model=List[AdvanceResponse])
async def list_advances(
    driver_id: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None
):
    query = {}
    if driver_id:
        query['driver_id'] = driver_id
    if month and year:
        start_date = f"{year}-{month:02d}-01"
        last_day = monthrange(year, month)[1]
        end_date = f"{year}-{month:02d}-{last_day}"
        query['date'] = {'$gte': start_date, '$lte': end_date}
    
    advances = await db.advances.find(query, {'_id': 0}).to_list(1000)
    
    driver_ids = list(set([a['driver_id'] for a in advances]))
    drivers = await db.drivers.find({'id': {'$in': driver_ids}}, {'_id': 0}).to_list(1000)
    driver_map = {d['id']: d['full_name'] for d in drivers}
    
    result = []
    for advance in advances:
        resp = AdvanceResponse(**advance)
        resp.driver_name = driver_map.get(advance['driver_id'])
        result.append(resp)
    
    return result

@router.put('/advances/{advance_id}/settle', response_model=AdvanceResponse)
async def settle_advance(advance_id: str, settlement: AdvanceSettlement):
    advance = await db.advances.find_one({'id': advance_id}, {'_id': 0})
    if not advance:
        raise HTTPException(status_code=404, detail='Advance not found')
    
    new_settled = advance['settled_amount'] + settlement.amount
    if new_settled > advance['amount']:
        raise HTTPException(status_code=400, detail='Settlement amount exceeds advance amount')
    
    await db.advances.update_one({'id': advance_id}, {'$set': {'settled_amount': new_settled}})
    
    updated_advance = await db.advances.find_one({'id': advance_id}, {'_id': 0})
    driver = await db.drivers.find_one({'id': updated_advance['driver_id']}, {'_id': 0})
    
    response = AdvanceResponse(**updated_advance)
    response.driver_name = driver['full_name'] if driver else None
    return response

@router.delete('/advances/{advance_id}')
async def delete_advance(advance_id: str):
    result = await db.advances.delete_one({'id': advance_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Advance not found')
    return {'message': 'Advance deleted successfully'}

# ============ BONUS ROUTES ============

@router.post('/bonuses', response_model=BonusResponse)
async def create_bonus(bonus_data: BonusCreate):
    bonus_id = str(uuid.uuid4())
    bonus_doc = {
        'id': bonus_id,
        **bonus_data.model_dump(),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.bonuses.insert_one(bonus_doc)
    
    driver = await db.drivers.find_one({'id': bonus_data.driver_id}, {'_id': 0})
    response = BonusResponse(**{k: v for k, v in bonus_doc.items() if k != '_id'})
    response.driver_name = driver['full_name'] if driver else None
    return response

@router.get('/bonuses', response_model=List[BonusResponse])
async def list_bonuses(
    driver_id: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None
):
    query = {}
    if driver_id:
        query['driver_id'] = driver_id
    if month and year:
        start_date = f"{year}-{month:02d}-01"
        last_day = monthrange(year, month)[1]
        end_date = f"{year}-{month:02d}-{last_day}"
        query['date'] = {'$gte': start_date, '$lte': end_date}
    
    bonuses = await db.bonuses.find(query, {'_id': 0}).to_list(1000)
    
    driver_ids = list(set([b['driver_id'] for b in bonuses]))
    drivers = await db.drivers.find({'id': {'$in': driver_ids}}, {'_id': 0}).to_list(1000)
    driver_map = {d['id']: d['full_name'] for d in drivers}
    
    result = []
    for bonus in bonuses:
        resp = BonusResponse(**bonus)
        resp.driver_name = driver_map.get(bonus['driver_id'])
        result.append(resp)
    
    return result

@router.delete('/bonuses/{bonus_id}')
async def delete_bonus(bonus_id: str):
    result = await db.bonuses.delete_one({'id': bonus_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Bonus not found')
    return {'message': 'Bonus deleted successfully'}

# ============ PAYMENT PROOF ROUTES ============

@router.post('/payment-proofs', response_model=PaymentProofResponse)
async def create_payment_proof(proof_data: PaymentProofCreate):
    proof_id = str(uuid.uuid4())
    proof_doc = {
        'id': proof_id,
        **proof_data.model_dump(),
        'upload_date': datetime.now(timezone.utc).isoformat()
    }
    
    await db.payment_proofs.insert_one(proof_doc)
    return PaymentProofResponse(**{k: v for k, v in proof_doc.items() if k != '_id'})

@router.get('/payment-proofs/{driver_id}/{year}/{month}', response_model=Optional[PaymentProofResponse])
async def get_payment_proof(driver_id: str, year: int, month: int):
    proof = await db.payment_proofs.find_one({
        'driver_id': driver_id,
        'year': year,
        'month': month
    }, {'_id': 0})
    
    if not proof:
        return None
    return PaymentProofResponse(**proof)

# ============ LEAVE ROUTES ============

@router.post('/leaves', response_model=LeaveRecordResponse)
async def create_leave_record(leave_data: LeaveRecordCreate):
    # Get driver info for salary calculation
    driver = await db.drivers.find_one({'id': leave_data.driver_id}, {'_id': 0})
    if not driver:
        raise HTTPException(status_code=404, detail='Driver not found')
    
    # Get settings for working days calculation
    settings = await db.settings.find_one({}, {'_id': 0})
    days_in_month = settings.get('days_in_month', 30) if settings else 30
    working_days_per_week = settings.get('working_days_per_week', 6) if settings else 6
    
    # Calculate expected working days in month (6 days/week * 4.33 weeks avg)
    expected_working_days = (working_days_per_week / 7) * days_in_month
    
    # Pro-rata deduction per day
    daily_salary = driver['base_salary'] / days_in_month
    deduction_amount = daily_salary
    
    leave_id = str(uuid.uuid4())
    leave_doc = {
        'id': leave_id,
        **leave_data.model_dump(),
        'deduction_amount': round(deduction_amount, 2),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.leaves.insert_one(leave_doc)
    
    response = LeaveRecordResponse(**{k: v for k, v in leave_doc.items() if k != '_id'})
    response.driver_name = driver['full_name']
    return response

@router.get('/leaves', response_model=List[LeaveRecordResponse])
async def list_leaves(
    driver_id: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None
):
    query = {}
    if driver_id:
        query['driver_id'] = driver_id
    if month and year:
        start_date = f"{year}-{month:02d}-01"
        last_day = monthrange(year, month)[1]
        end_date = f"{year}-{month:02d}-{last_day}"
        query['date'] = {'$gte': start_date, '$lte': end_date}
    
    leaves = await db.leaves.find(query, {'_id': 0}).to_list(1000)
    
    driver_ids = list(set([l['driver_id'] for l in leaves]))
    drivers = await db.drivers.find({'id': {'$in': driver_ids}}, {'_id': 0}).to_list(1000)
    driver_map = {d['id']: d['full_name'] for d in drivers}
    
    result = []
    for leave in leaves:
        resp = LeaveRecordResponse(**leave)
        resp.driver_name = driver_map.get(leave['driver_id'])
        result.append(resp)
    
    return result

@router.delete('/leaves/{leave_id}')
async def delete_leave(leave_id: str):
    result = await db.leaves.delete_one({'id': leave_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Leave record not found')
    return {'message': 'Leave record deleted successfully'}

# ============ DUTY APPROVAL ROUTES ============

@router.put('/duty-entries/{entry_id}/approve')
async def approve_duty_entry(entry_id: str, approval: DutyApprovalUpdate):
    result = await db.duty_entries.update_one(
        {'id': entry_id},
        {'$set': {'approval_status': approval.approval_status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Duty entry not found')
    
    return {'message': f'Duty entry {approval.approval_status}'}

@router.get('/duty-entries/pending')
async def get_pending_duty_entries():
    entries = await db.duty_entries.find({'approval_status': 'pending'}, {'_id': 0}).to_list(1000)
    
    driver_ids = list(set([e['driver_id'] for e in entries]))
    drivers = await db.drivers.find({'id': {'$in': driver_ids}}, {'_id': 0}).to_list(1000)
    driver_map = {d['id']: d['full_name'] for d in drivers}
    
    for entry in entries:
        entry['driver_name'] = driver_map.get(entry['driver_id'])
    
    return entries
