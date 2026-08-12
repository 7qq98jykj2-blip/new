from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4
import sys
sys.path.append('/app/backend')
from server import db, get_current_user, get_admin_user

router = APIRouter(prefix='/api')

# ============ HOLIDAY MODELS ============

class HolidayCreate(BaseModel):
    name: str
    date: str  # YYYY-MM-DD

class HolidayResponse(BaseModel):
    id: str
    name: str
    date: str
    created_at: str

# ============ MISC EXPENSE MODELS ============

class MiscExpenseCreate(BaseModel):
    driver_id: str
    date: str
    category: str  # parking, tolls, etc (NOT travel, NOT food)
    amount: float
    description: str
    receipt_url: Optional[str] = None

class MiscExpenseResponse(BaseModel):
    id: str
    driver_id: str
    driver_name: Optional[str] = None
    date: str
    category: str
    amount: float
    description: str
    receipt_url: Optional[str] = None
    status: str  # pending, approved, rejected
    created_at: str

# ============ FINANCIAL YEAR STATEMENT ============

class FinancialYearMonth(BaseModel):
    month: str  # "April 2026"
    amount_paid: float

class FinancialYearResponse(BaseModel):
    financial_year: str  # "FY 2026-27"
    start_date: str
    end_date: str
    months: List[FinancialYearMonth]
    total_paid: float

# ============ HOLIDAY ROUTES ============

@router.post('/holidays', response_model=HolidayResponse)
async def create_holiday(holiday_data: HolidayCreate, user: dict = Depends(get_admin_user)):
    holiday_doc = {
        'id': str(uuid4()),
        'name': holiday_data.name,
        'date': holiday_data.date,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.holidays.insert_one(holiday_doc)
    return HolidayResponse(**{k: v for k, v in holiday_doc.items() if k != '_id'})

@router.get('/holidays', response_model=List[HolidayResponse])
async def list_holidays(year: Optional[int] = None, user: dict = Depends(get_current_user)):
    query = {}
    if year:
        query['date'] = {'$regex': f'^{year}'}
    holidays = await db.holidays.find(query, {'_id': 0}).to_list(1000)
    return [HolidayResponse(**h) for h in holidays]

@router.delete('/holidays/{holiday_id}')
async def delete_holiday(holiday_id: str, user: dict = Depends(get_admin_user)):
    result = await db.holidays.delete_one({'id': holiday_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Holiday not found')
    return {'message': 'Holiday deleted'}

# ============ MISC EXPENSE ROUTES ============

@router.post('/misc-expenses', response_model=MiscExpenseResponse)
async def create_misc_expense(expense_data: MiscExpenseCreate, user: dict = Depends(get_current_user)):
    # Validate: Not travel or food
    if expense_data.category.lower() in ['travel', 'food', 'meal', 'meals']:
        raise HTTPException(
            status_code=400,
            detail='Travel and Food expenses must use existing expense system'
        )
    
    expense_doc = {
        'id': str(uuid4()),
        'driver_id': expense_data.driver_id,
        'date': expense_data.date,
        'category': expense_data.category,
        'amount': expense_data.amount,
        'description': expense_data.description,
        'receipt_url': expense_data.receipt_url,
        'status': 'pending',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.misc_expenses.insert_one(expense_doc)
    
    driver = await db.drivers.find_one({'id': expense_data.driver_id}, {'_id': 0})
    response = MiscExpenseResponse(**{k: v for k, v in expense_doc.items() if k != '_id'})
    if driver:
        response.driver_name = driver['full_name']
    return response

@router.get('/misc-expenses', response_model=List[MiscExpenseResponse])
async def list_misc_expenses(driver_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if driver_id:
        query['driver_id'] = driver_id
    
    expenses = await db.misc_expenses.find(query, {'_id': 0}).to_list(1000)
    
    driver_ids = list(set([e['driver_id'] for e in expenses]))
    drivers = await db.drivers.find({'id': {'$in': driver_ids}}, {'_id': 0}).to_list(1000)
    driver_map = {d['id']: d['full_name'] for d in drivers}
    
    result = []
    for expense in expenses:
        resp = MiscExpenseResponse(**expense)
        resp.driver_name = driver_map.get(expense['driver_id'])
        result.append(resp)
    
    return result

@router.put('/misc-expenses/{expense_id}/approve')
async def approve_misc_expense(expense_id: str, status: str, user: dict = Depends(get_admin_user)):
    if status not in ['approved', 'rejected']:
        raise HTTPException(status_code=400, detail='Status must be approved or rejected')
    
    result = await db.misc_expenses.update_one(
        {'id': expense_id},
        {'$set': {'status': status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Expense not found')
    
    return {'message': f'Expense {status}'}

# ============ FINANCIAL YEAR STATEMENT ============

@router.get('/drivers/{driver_id}/financial-year/{fy_year}', response_model=FinancialYearResponse)
async def get_financial_year_statement(driver_id: str, fy_year: int, user: dict = Depends(get_current_user)):
    """
    Get financial year statement (April YYYY to March YYYY+1)
    fy_year: 2026 means FY 2026-27 (April 2026 to March 2027)
    """
    from calendar import month_name
    from server import calculate_payroll
    
    # Financial year months
    months_data = []
    total_paid = 0.0
    
    # April to December of fy_year
    for month in range(4, 13):
        try:
            payroll_data = await calculate_payroll(driver_id, fy_year, month, user)
            amount = payroll_data.get('net_pay', 0.0)
        except Exception:
            amount = 0.0
        
        months_data.append(FinancialYearMonth(
            month=f"{month_name[month]} {fy_year}",
            amount_paid=amount
        ))
        total_paid += amount
    
    # January to March of fy_year+1
    for month in range(1, 4):
        try:
            payroll_data = await calculate_payroll(driver_id, fy_year+1, month, user)
            amount = payroll_data.get('net_pay', 0.0)
        except Exception:
            amount = 0.0
        
        months_data.append(FinancialYearMonth(
            month=f"{month_name[month]} {fy_year+1}",
            amount_paid=amount
        ))
        total_paid += amount
    
    return FinancialYearResponse(
        financial_year=f"FY {fy_year}-{str(fy_year+1)[-2:]}",
        start_date=f"{fy_year}-04-01",
        end_date=f"{fy_year+1}-03-31",
        months=months_data,
        total_paid=total_paid
    )

# ============ MY ATTENDANCE (MONTH VIEW) ============

@router.get('/drivers/{driver_id}/attendance/{year}/{month}')
async def get_monthly_attendance(driver_id: str, year: int, month: int, user: dict = Depends(get_current_user)):
    """Get driver's attendance for a specific month"""
    from calendar import monthrange
    
    start_date = f"{year}-{month:02d}-01"
    last_day = monthrange(year, month)[1]
    end_date = f"{year}-{month:02d}-{last_day}"
    
    # Get all duty entries for the month
    entries = await db.duty_entries.find({
        'driver_id': driver_id,
        'date': {'$gte': start_date, '$lte': end_date}
    }, {'_id': 0}).sort('date', 1).to_list(100)
    
    # Get holidays for the month
    holidays = await db.holidays.find({
        'date': {'$gte': start_date, '$lte': end_date}
    }, {'_id': 0}).to_list(100)
    holiday_dates = {h['date']: h['name'] for h in holidays}
    
    # Get settings for weekly off
    settings = await db.settings.find_one({}, {'_id': 0})
    weekly_off_day = settings.get('weekly_off_day', 'sunday') if settings else 'sunday'
    
    return {
        'driver_id': driver_id,
        'year': year,
        'month': month,
        'entries': entries,
        'holidays': holiday_dates,
        'weekly_off_day': weekly_off_day
    }


# ============ ADMIN PAYROLL CORRECTION & AUDIT TRAIL ============

class PayrollCorrectionRequest(BaseModel):
    work_status: Optional[str] = None
    outstation_city: Optional[str] = None
    in_time: Optional[str] = None
    out_time: Optional[str] = None
    reason: str

class AuditLogResponse(BaseModel):
    id: str
    admin_user: str
    driver_id: str
    entry_date: str
    field_changed: str
    old_value: str
    new_value: str
    reason: str
    corrected_at: str

@router.put('/duty-entries/{entry_id}/correct')
async def correct_duty_entry(entry_id: str, correction: PayrollCorrectionRequest, user: dict = Depends(get_admin_user)):
    """Admin correction of duty entry with audit trail"""
    
    # Get existing entry
    entry = await db.duty_entries.find_one({'id': entry_id}, {'_id': 0})
    if not entry:
        raise HTTPException(status_code=404, detail='Duty entry not found')
    
    # Build update document and audit logs
    update_doc = {}
    audit_logs = []
    
    if correction.work_status is not None and correction.work_status != entry.get('work_status'):
        old_val = entry.get('work_status', 'present')
        update_doc['work_status'] = correction.work_status
        audit_logs.append({
            'id': str(uuid4()),
            'admin_user': user.get('mobile', user.get('username', 'admin')),
            'driver_id': entry['driver_id'],
            'entry_date': entry['date'],
            'field_changed': 'work_status',
            'old_value': old_val,
            'new_value': correction.work_status,
            'reason': correction.reason,
            'corrected_at': datetime.now(timezone.utc).isoformat()
        })
    
    if correction.outstation_city is not None and correction.outstation_city != entry.get('outstation_city'):
        old_val = entry.get('outstation_city') or ''
        update_doc['outstation_city'] = correction.outstation_city
        audit_logs.append({
            'id': str(uuid4()),
            'admin_user': user.get('mobile', user.get('username', 'admin')),
            'driver_id': entry['driver_id'],
            'entry_date': entry['date'],
            'field_changed': 'outstation_city',
            'old_value': old_val,
            'new_value': correction.outstation_city,
            'reason': correction.reason,
            'corrected_at': datetime.now(timezone.utc).isoformat()
        })
    
    if correction.in_time is not None and correction.in_time != entry.get('in_time'):
        old_val = entry.get('in_time', '')
        update_doc['in_time'] = correction.in_time
        audit_logs.append({
            'id': str(uuid4()),
            'admin_user': user.get('mobile', user.get('username', 'admin')),
            'driver_id': entry['driver_id'],
            'entry_date': entry['date'],
            'field_changed': 'in_time',
            'old_value': old_val,
            'new_value': correction.in_time,
            'reason': correction.reason,
            'corrected_at': datetime.now(timezone.utc).isoformat()
        })
    
    if correction.out_time is not None and correction.out_time != entry.get('out_time'):
        old_val = entry.get('out_time', '')
        update_doc['out_time'] = correction.out_time
        audit_logs.append({
            'id': str(uuid4()),
            'admin_user': user.get('mobile', user.get('username', 'admin')),
            'driver_id': entry['driver_id'],
            'entry_date': entry['date'],
            'field_changed': 'out_time',
            'old_value': old_val,
            'new_value': correction.out_time,
            'reason': correction.reason,
            'corrected_at': datetime.now(timezone.utc).isoformat()
        })
    
    if not update_doc:
        raise HTTPException(status_code=400, detail='No changes detected')
    
    # Update duty entry
    await db.duty_entries.update_one(
        {'id': entry_id},
        {'$set': update_doc}
    )
    
    # Insert audit logs
    if audit_logs:
        await db.payroll_audit_logs.insert_many(audit_logs)
    
    return {'message': 'Duty entry corrected successfully', 'audit_logs_created': len(audit_logs)}

@router.get('/audit-logs', response_model=List[AuditLogResponse])
async def get_audit_logs(driver_id: Optional[str] = None, user: dict = Depends(get_admin_user)):
    """Get payroll correction audit logs"""
    query = {}
    if driver_id:
        query['driver_id'] = driver_id
    
    logs = await db.payroll_audit_logs.find(query, {'_id': 0}).sort('corrected_at', -1).to_list(500)
    return [AuditLogResponse(**log) for log in logs]

@router.get('/duty-entries/{entry_id}/audit-logs', response_model=List[AuditLogResponse])
async def get_entry_audit_logs(entry_id: str, user: dict = Depends(get_current_user)):
    """Get audit logs for a specific duty entry"""
    # Get entry to find its date
    entry = await db.duty_entries.find_one({'id': entry_id}, {'_id': 0})
    if not entry:
        raise HTTPException(status_code=404, detail='Duty entry not found')
    
    logs = await db.payroll_audit_logs.find({
        'driver_id': entry['driver_id'],
        'entry_date': entry['date']
    }, {'_id': 0}).sort('corrected_at', -1).to_list(100)
    
    return [AuditLogResponse(**log) for log in logs]

    weekly_off_day = settings.get('weekly_off_day', 'sunday') if settings else 'sunday'
    
    return {
        'driver_id': driver_id,
        'year': year,
        'month': month,
        'entries': entries,
        'holidays': holiday_dates,
        'weekly_off_day': weekly_off_day
    }
