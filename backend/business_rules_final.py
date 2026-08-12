# FINAL BUSINESS RULES IMPLEMENTATION
# This file documents all changes needed for the final business rules patch

CHANGES_REQUIRED = {
    "1_driver_weekly_off": {
        "file": "server.py",
        "change": "Add weekly_off_day field to Driver schema",
        "models": ["DriverCreate", "DriverUpdate", "DriverResponse"],
        "default": "sunday"
    },
    
    "2_normal_duty_auto_approval": {
        "file": "server.py",
        "change": "Auto-approve normal duty (present/outstation), require approval for holiday_worked/weekly_off_worked",
        "logic": "If work_status in ['present', 'outstation', 'vacation']: auto-approve"
    },
    
    "3_soft_delete_duty": {
        "file": "server.py",
        "change": "Add is_deleted field, filter deleted entries everywhere",
        "queries": "All duty_entries queries must include {'is_deleted': {'$ne': True}}"
    },
    
    "4_one_duty_per_day": {
        "file": "server.py",
        "change": "Check existing duty before creating new",
        "validation": "Reject if duty exists for driver_id + date"
    },
    
    "5_driver_payroll_actual_only": {
        "file": "MyPayroll.js",
        "change": "Fetch actual payroll records, don't show empty months",
        "endpoint": "GET /api/payroll/driver/{driver_id}/history - returns only generated payroll"
    },
    
    "6_misc_expense_validation": {
        "file": "MiscExpenses.js + attendance_enhancements.py",
        "changes": {
            "categories": ["parking", "tolls", "other"],
            "parking": "receipt_url REQUIRED, description optional",
            "tolls": "receipt_url REQUIRED, description optional",
            "other": "description REQUIRED, receipt_url optional"
        }
    },
    
    "7_fix_expense_approval": {
        "file": "attendance_enhancements.py",
        "issue": "PUT /api/misc-expenses/{id}/approve endpoint error",
        "fix": "Check expense ID format, update query, test status update"
    },
    
    "8_admin_edit_duty": {
        "file": "PayrollView.js + attendance_enhancements.py",
        "change": "Admin can edit all duty fields via correction modal",
        "exists": "Already implemented - verify works end-to-end"
    },
    
    "9_admin_edit_expense_amount": {
        "file": "ExpenseManagement.js + attendance_enhancements.py",
        "change": "Add amount field to approval, save corrected_amount",
        "audit": "Keep original_amount for history"
    },
    
    "10_accumulated_salary": {
        "file": "AdminDashboard.js",
        "change": "Show sum of actual net_pay from generated payroll records",
        "calculation": "SUM(payroll.net_pay WHERE driver_id AND status='finalized')"
    }
}
