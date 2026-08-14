from fastapi import APIRouter, Depends, HTTPException
from typing import List
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from server import db, get_current_user

router = APIRouter(prefix='/api')

@router.get('/payroll/driver/{driver_id}/history')
async def get_driver_payroll_history(driver_id: str, user: dict = Depends(get_current_user)):
    """Get only actual captured payroll records for driver"""
    payrolls = await db.payroll_records.find(
        {'driver_id': driver_id},
        {'_id': 0}
    ).sort([('year', -1), ('month', -1)]).to_list(100)
    
    return payrolls

@router.get('/drivers/{driver_id}/accumulated-salary')
async def get_accumulated_salary(driver_id: str, user: dict = Depends(get_current_user)):
    """Get accumulated salary from actual payroll records"""
    payrolls = await db.payroll_records.find(
        {'driver_id': driver_id},
        {'_id': 0, 'net_pay': 1}
    ).to_list(1000)
    
    total = sum(p.get('net_pay', 0) for p in payrolls)
    return {'driver_id': driver_id, 'accumulated_salary': total, 'payroll_count': len(payrolls)}
