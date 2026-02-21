import { jsPDF } from 'jspdf';

export const generateSalarySlipPDF = (payrollData, driverInfo) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SALARY SLIP', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Month: ${getMonthName(payrollData.month)} ${payrollData.year}`, 105, 28, { align: 'center' });
  
  // Horizontal line
  doc.line(20, 32, 190, 32);
  
  // Employee Details
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Details:', 20, 40);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${payrollData.driver_name}`, 20, 48);
  doc.text(`Phone: ${driverInfo.phone}`, 20, 54);
  doc.text(`Aadhaar: ${driverInfo.aadhaar_number}`, 20, 60);
  doc.text(`Job Start Date: ${driverInfo.job_start_date}`, 20, 66);
  
  // Salary Breakdown
  doc.setFont('helvetica', 'bold');
  doc.text('Salary Breakdown:', 20, 78);
  
  let y = 88;
  
  // Table headers
  doc.setFillColor(240, 240, 240);
  doc.rect(20, y - 6, 170, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 22, y);
  doc.text('Amount (₹)', 160, y, { align: 'right' });
  
  y += 10;
  doc.setFont('helvetica', 'normal');
  
  // Base Salary
  doc.text('Base Monthly Salary', 22, y);
  doc.text(payrollData.base_salary.toFixed(2), 188, y, { align: 'right' });
  y += 8;
  
  // Overtime
  doc.text('Overtime Pay', 22, y);
  doc.text(payrollData.total_overtime_amount.toFixed(2), 188, y, { align: 'right' });
  y += 8;
  
  // Food Allowance
  doc.text('Food Allowances', 22, y);
  doc.text(payrollData.total_food_allowances.toFixed(2), 188, y, { align: 'right' });
  y += 8;
  
  // Expenses
  doc.text('Miscellaneous Expenses', 22, y);
  doc.text(payrollData.total_expenses.toFixed(2), 188, y, { align: 'right' });
  y += 8;
  
  // Deductions
  if (payrollData.deductions > 0) {
    doc.text('Deductions', 22, y);
    doc.text(`-${payrollData.deductions.toFixed(2)}`, 188, y, { align: 'right' });
    y += 8;
  }
  
  // Line before total
  y += 2;
  doc.line(20, y, 190, y);
  y += 8;
  
  // Net Pay
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Net Pay', 22, y);
  doc.text(`₹ ${payrollData.net_pay.toFixed(2)}`, 188, y, { align: 'right' });
  
  // Footer
  y += 20;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('This is a system-generated document.', 105, y, { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 105, y + 5, { align: 'center' });
  
  // Save
  doc.save(`salary_slip_${payrollData.driver_name}_${payrollData.month}_${payrollData.year}.pdf`);
};

export const exportToExcel = async (payrollData, driverInfo) => {
  const XLSX = await import('xlsx');
  
  const data = [
    ['SALARY SLIP'],
    [`Month: ${getMonthName(payrollData.month)} ${payrollData.year}`],
    [],
    ['Employee Details'],
    ['Name', payrollData.driver_name],
    ['Phone', driverInfo.phone],
    ['Aadhaar', driverInfo.aadhaar_number],
    ['Job Start Date', driverInfo.job_start_date],
    [],
    ['Salary Breakdown'],
    ['Description', 'Amount (₹)'],
    ['Base Monthly Salary', payrollData.base_salary],
    ['Overtime Pay', payrollData.total_overtime_amount],
    ['Food Allowances', payrollData.total_food_allowances],
    ['Miscellaneous Expenses', payrollData.total_expenses],
    ['Deductions', -payrollData.deductions],
    [],
    ['Net Pay', payrollData.net_pay],
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Salary Slip');
  
  XLSX.writeFile(wb, `salary_slip_${payrollData.driver_name}_${payrollData.month}_${payrollData.year}.xlsx`);
};

const getMonthName = (month) => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1];
};
