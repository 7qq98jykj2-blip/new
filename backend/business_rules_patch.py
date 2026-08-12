# Final Business Rules Patch - Implementation Notes
# 1. Driver weekly_off_day: Add to driver schema
# 2. Normal duty auto-approval: Update approval logic
# 3. Delete duty: Soft delete with is_deleted flag
# 4. One submission per day: Unique constraint driver_id + date
# 5. Driver payroll: Filter only generated payroll records
# 6. Misc expense rules: Update validation
# 7. Fix expense approval: Debug API
# 8. Admin edit duty: Use correction endpoint
# 9. Admin edit expense amount: Add amount field
# 10. Accumulated salary: Sum captured payroll
