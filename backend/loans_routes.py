from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4
import os
import sys

# Add parent directory to path to import from server.py
sys.path.append('/app/backend')
from server import db, get_current_user, get_admin_user

router = APIRouter(prefix='/api')

# ============ LOAN MODELS ============

class LoanCreate(BaseModel):
    driver_id: str
    amount: float
    reason: str
    monthly_deduction: float
    start_month: str  # YYYY-MM
    end_month: str  # YYYY-MM

class LoanUpdate(BaseModel):
    monthly_deduction: Optional[float] = None
    end_month: Optional[str] = None

class LoanPaymentCreate(BaseModel):
    amount: float
    payment_screenshot: Optional[str] = None

class LoanResponse(BaseModel):
    id: str
    driver_id: str
    driver_name: Optional[str] = None
    amount: float
    remaining_amount: float
    monthly_deduction: float
    reason: str
    start_month: str
    end_month: str
    status: str  # active, completed
    created_at: str
    payments: List[dict] = []

# ============ LOAN ROUTES ============

@router.post('/loans', response_model=LoanResponse)
async def create_loan(loan_data: LoanCreate, user: dict = Depends(get_admin_user)):
    """Admin creates a new loan for a driver"""
    # Verify driver exists
    driver = await db.drivers.find_one({'id': loan_data.driver_id}, {'_id': 0})
    if not driver:
        raise HTTPException(status_code=404, detail='Driver not found')
    
    loan_doc = {
        'id': str(uuid4()),
        'driver_id': loan_data.driver_id,
        'amount': loan_data.amount,
        'remaining_amount': loan_data.amount,
        'monthly_deduction': loan_data.monthly_deduction,
        'reason': loan_data.reason,
        'start_month': loan_data.start_month,
        'end_month': loan_data.end_month,
        'status': 'active',
        'created_at': datetime.now(timezone.utc).isoformat(),
        'payments': []
    }
    
    await db.loans.insert_one(loan_doc)
    
    response = LoanResponse(**{k: v for k, v in loan_doc.items() if k != '_id'})
    response.driver_name = driver['full_name']
    return response

@router.get('/loans', response_model=List[LoanResponse])
async def list_loans(
    driver_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """List all loans with optional filters"""
    query = {}
    if driver_id:
        query['driver_id'] = driver_id
    if status:
        query['status'] = status
    
    loans = await db.loans.find(query, {'_id': 0}).to_list(1000)
    
    # Add driver names
    driver_ids = list(set([l['driver_id'] for l in loans]))
    drivers = await db.drivers.find({'id': {'$in': driver_ids}}, {'_id': 0}).to_list(1000)
    driver_map = {d['id']: d['full_name'] for d in drivers}
    
    result = []
    for loan in loans:
        resp = LoanResponse(**loan)
        resp.driver_name = driver_map.get(loan['driver_id'])
        result.append(resp)
    
    return result

@router.get('/loans/{loan_id}', response_model=LoanResponse)
async def get_loan(loan_id: str, user: dict = Depends(get_current_user)):
    """Get a single loan by ID"""
    loan = await db.loans.find_one({'id': loan_id}, {'_id': 0})
    if not loan:
        raise HTTPException(status_code=404, detail='Loan not found')
    
    driver = await db.drivers.find_one({'id': loan['driver_id']}, {'_id': 0})
    response = LoanResponse(**loan)
    if driver:
        response.driver_name = driver['full_name']
    return response

@router.post('/loans/{loan_id}/payment', response_model=LoanResponse)
async def add_loan_payment(
    loan_id: str,
    payment_data: LoanPaymentCreate,
    user: dict = Depends(get_admin_user)
):
    """Admin adds a payment to a loan (marks monthly deduction as paid)"""
    loan = await db.loans.find_one({'id': loan_id}, {'_id': 0})
    if not loan:
        raise HTTPException(status_code=404, detail='Loan not found')
    
    if loan['status'] == 'completed':
        raise HTTPException(status_code=400, detail='Loan already completed')
    
    # Create payment record
    payment = {
        'id': str(uuid4()),
        'amount': payment_data.amount,
        'payment_screenshot': payment_data.payment_screenshot,
        'paid_at': datetime.now(timezone.utc).isoformat(),
        'paid_by': user['id']
    }
    
    # Update loan
    new_remaining = loan['remaining_amount'] - payment_data.amount
    new_remaining = max(0, new_remaining)  # Don't go negative
    
    new_status = 'completed' if new_remaining <= 0 else 'active'
    
    await db.loans.update_one(
        {'id': loan_id},
        {
            '$push': {'payments': payment},
            '$set': {
                'remaining_amount': new_remaining,
                'status': new_status
            }
        }
    )
    
    # Fetch updated loan
    updated_loan = await db.loans.find_one({'id': loan_id}, {'_id': 0})
    driver = await db.drivers.find_one({'id': updated_loan['driver_id']}, {'_id': 0})
    
    response = LoanResponse(**updated_loan)
    if driver:
        response.driver_name = driver['full_name']
    return response

@router.get('/drivers/{driver_id}/loans/active', response_model=List[LoanResponse])
async def get_driver_active_loans(driver_id: str, user: dict = Depends(get_current_user)):
    """Get all active loans for a driver"""
    loans = await db.loans.find({
        'driver_id': driver_id,
        'status': 'active'
    }, {'_id': 0}).to_list(1000)
    
    driver = await db.drivers.find_one({'id': driver_id}, {'_id': 0})
    driver_name = driver['full_name'] if driver else None
    
    result = []
    for loan in loans:
        resp = LoanResponse(**loan)
        resp.driver_name = driver_name
        result.append(resp)
    
    return result

@router.get('/drivers/{driver_id}/loans/last', response_model=LoanResponse)
async def get_driver_last_loan(driver_id: str, user: dict = Depends(get_current_user)):
    """Get the last loan taken by a driver"""
    loan = await db.loans.find_one(
        {'driver_id': driver_id},
        {'_id': 0},
        sort=[('created_at', -1)]
    )
    
    if not loan:
        raise HTTPException(status_code=404, detail='No loans found for this driver')
    
    driver = await db.drivers.find_one({'id': driver_id}, {'_id': 0})
    response = LoanResponse(**loan)
    if driver:
        response.driver_name = driver['full_name']
    return response

@router.put('/loans/{loan_id}', response_model=LoanResponse)
async def update_loan(
    loan_id: str,
    loan_data: LoanUpdate,
    user: dict = Depends(get_admin_user)
):
    """Admin updates loan details"""
    loan = await db.loans.find_one({'id': loan_id}, {'_id': 0})
    if not loan:
        raise HTTPException(status_code=404, detail='Loan not found')
    
    update_data = {k: v for k, v in loan_data.model_dump().items() if v is not None}
    if update_data:
        await db.loans.update_one({'id': loan_id}, {'$set': update_data})
    
    updated_loan = await db.loans.find_one({'id': loan_id}, {'_id': 0})
    driver = await db.drivers.find_one({'id': updated_loan['driver_id']}, {'_id': 0})
    
    response = LoanResponse(**updated_loan)
    if driver:
        response.driver_name = driver['full_name']
    return response
