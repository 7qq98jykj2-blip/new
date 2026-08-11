import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { api } from '../utils/api';
import { generateSalarySlipPDF, exportToExcel } from '../utils/pdfGenerator';
import { toast } from 'sonner';
import { ArrowLeft, Download, FileSpreadsheet } from 'lucide-react';

export default function PayrollView({ user, onLogout }) {
  const { driverId, year, month } = useParams();
  const [payrollData, setPayrollData] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPayrollData();
    fetchDriverInfo();
  }, [driverId, year, month]);

  const fetchPayrollData = async () => {
    try {
      const response = await api.get(`/payroll/${driverId}/${year}/${month}`);
      setPayrollData(response.data);
    } catch (error) {
      toast.error('Failed to fetch payroll data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDriverInfo = async () => {
    try {
      const response = await api.get(`/drivers/${driverId}`);
      setDriverInfo(response.data);
    } catch (error) {
      toast.error('Failed to fetch driver info');
    }
  };

  const handleDownloadPDF = () => {
    if (payrollData && driverInfo) {
      generateSalarySlipPDF(payrollData, driverInfo);
      toast.success('PDF downloaded successfully');
    }
  };

  const handleExportExcel = () => {
    if (payrollData && driverInfo) {
      exportToExcel(payrollData, driverInfo);
      toast.success('Excel exported successfully');
    }
  };

  const getMonthName = (monthNum) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthNum - 1];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-zinc-600">Loading payroll data...</p>
      </div>
    );
  }

  if (!payrollData || !driverInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-zinc-600">Payroll data not available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Button
              data-testid="back-button"
              onClick={() => navigate(user.role === 'admin' ? '/drivers' : '/driver')}
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-semibold text-emerald-950">Salary Slip</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Info */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold text-emerald-950 mb-2">SALARY SLIP</h2>
          <p className="text-zinc-600">{getMonthName(payrollData.month)} {payrollData.year}</p>
        </div>

        {/* Employee Details */}
        <Card data-testid="employee-details-card" className="border-zinc-200 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Employee Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-zinc-600 mb-1">Name</p>
                <p className="text-emerald-950 font-medium">{payrollData.driver_name}</p>
              </div>
              <div>
                <p className="text-zinc-600 mb-1">Phone</p>
                <p className="text-emerald-950 font-medium">{driverInfo.phone}</p>
              </div>
              <div>
                <p className="text-zinc-600 mb-1">Aadhaar Number</p>
                <p className="text-emerald-950 font-medium mono">{driverInfo.aadhaar_number}</p>
              </div>
              <div>
                <p className="text-zinc-600 mb-1">Job Start Date</p>
                <p className="text-emerald-950 font-medium">{driverInfo.job_start_date}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Salary Breakdown */}
        <Card data-testid="salary-breakdown-card" className="border-zinc-200 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Salary Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-zinc-200">
                <span className="text-zinc-900">Base Monthly Salary</span>
                <span className="text-emerald-950 font-medium mono">₹{payrollData.base_salary.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-200">
                <span className="text-zinc-900">Overtime Pay</span>
                <span className="text-emerald-950 font-medium mono">₹{payrollData.total_overtime_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-200">
                <span className="text-zinc-900">Conveyance</span>
                <span className="text-emerald-950 font-medium mono">₹{payrollData.total_conveyance.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-200">
                <span className="text-zinc-900">Breakfast Allowance</span>
                <span className="text-emerald-950 font-medium mono">₹{payrollData.total_breakfast.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-200">
                <span className="text-zinc-900">Dinner Allowance</span>
                <span className="text-emerald-950 font-medium mono">₹{payrollData.total_dinner.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-200">
                <span className="text-zinc-900">Bonuses</span>
                <span className="text-emerald-950 font-medium mono">₹{payrollData.total_bonuses.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-200">
                <span className="text-zinc-900">Miscellaneous Expenses</span>
                <span className="text-emerald-950 font-medium mono">₹{payrollData.total_expenses.toLocaleString('en-IN')}</span>
              </div>
              {payrollData.total_advances > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-zinc-200">
                  <span className="text-zinc-900">Advances</span>
                  <span className="text-red-600 font-medium mono">-₹{payrollData.total_advances.toLocaleString('en-IN')}</span>
                </div>
              )}
              {payrollData.leave_deductions > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-zinc-200">
                  <span className="text-zinc-900">Leave Deductions</span>
                  <span className="text-red-600 font-medium mono">-₹{payrollData.leave_deductions.toLocaleString('en-IN')}</span>
                </div>
              )}
              {payrollData.loan_deductions > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-zinc-200">
                  <span className="text-zinc-900">Loan Deductions</span>
                  <span className="text-red-600 font-medium mono">-₹{payrollData.loan_deductions.toLocaleString('en-IN')}</span>
                </div>
              )}
              {payrollData.deductions > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-zinc-200">
                  <span className="text-zinc-900">Other Deductions</span>
                  <span className="text-red-600 font-medium mono">-₹{payrollData.deductions.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-4 bg-zinc-50 -mx-6 px-6 rounded-md">
                <span className="text-lg font-semibold text-emerald-950">Net Pay</span>
                <span className="text-2xl font-bold text-emerald-950 mono">₹{payrollData.net_pay.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Duty Summary */}
        <Card data-testid="duty-summary-card" className="border-zinc-200 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Duty Summary ({payrollData.duty_entries.length} days)</CardTitle>
          </CardHeader>
          <CardContent>
            {payrollData.duty_entries.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">No duty entries for this month</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {payrollData.duty_entries.map((entry, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border border-zinc-200 rounded-md text-sm">
                    <span className="text-zinc-900">{entry.date}</span>
                    <div className="flex gap-4 text-zinc-600">
                      <span className="mono">{entry.hours_worked}h worked</span>
                      {entry.overtime_minutes > 0 && (
                        <span className="mono text-orange-600">{entry.overtime_minutes}m OT</span>
                      )}
                      <div className="flex gap-1">
                        {entry.breakfast_given && <span className="text-orange-600" title="Breakfast">🍳</span>}
                        {entry.conveyance_given && <span className="text-blue-600" title="Conveyance">🚗</span>}
                        {entry.dinner_given && <span className="text-purple-600" title="Dinner">🍽️</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses */}
        {payrollData.expenses.length > 0 && (
          <Card data-testid="expenses-summary-card" className="border-zinc-200 shadow-sm mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Expenses ({payrollData.expenses.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {payrollData.expenses.map((expense, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border border-zinc-200 rounded-md text-sm">
                    <div>
                      <p className="text-zinc-900 font-medium">{expense.description}</p>
                      <p className="text-xs text-zinc-500">{expense.date} • {expense.category}</p>
                    </div>
                    <span className="text-emerald-950 font-medium mono">₹{expense.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Download Buttons */}
        <div className="flex gap-4">
          <Button
            data-testid="download-pdf-button"
            onClick={handleDownloadPDF}
            className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button
            data-testid="export-excel-button"
            onClick={handleExportExcel}
            variant="outline"
            className="flex-1 h-12"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-zinc-500 italic">
            This is a system-generated document.<br />
            Generated on: {new Date().toLocaleDateString('en-IN')}
          </p>
        </div>
      </main>
    </div>
  );
}
