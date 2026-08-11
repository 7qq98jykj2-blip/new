import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

export default function ExpenseManagement({ user, onLogout }) {
  const [expenses, setExpenses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [formData, setFormData] = useState({
    driver_id: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    category: 'fuel',
  });
  const navigate = useNavigate();

  useEffect(() => {
    const now = new Date();
    setSelectedMonth((now.getMonth() + 1).toString());
    setSelectedYear(now.getFullYear().toString());
    fetchDrivers();
  }, []);

  useEffect(() => {
    if (selectedMonth && selectedYear) {
      fetchExpenses();
    }
  }, [selectedDriver, selectedMonth, selectedYear]);

  const fetchDrivers = async () => {
    try {
      const response = await api.get('/drivers');
      setDrivers(response.data);
      if (response.data.length > 0) {
        setFormData((prev) => ({ ...prev, driver_id: response.data[0].id }));
      }
    } catch (error) {
      toast.error('Failed to fetch drivers');
    }
  };

  const fetchExpenses = async () => {
    try {
      const params = {
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
      };
      if (selectedDriver !== 'all') {
        params.driver_id = selectedDriver;
      }
      const response = await api.get('/expenses', { params });
      setExpenses(response.data);
    } catch (error) {
      toast.error('Failed to fetch expenses');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/expenses', formData);
      toast.success('Expense added successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchExpenses();
    } catch (error) {
      toast.error('Failed to add expense');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Expense deleted successfully');
      fetchExpenses();
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const resetForm = () => {
    setFormData({
      driver_id: drivers[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      amount: '',
      description: '',
      category: 'fuel',
    });
  };

  const getTotalExpenses = () => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Button
              data-testid="back-button"
              onClick={() => navigate('/admin')}
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-semibold text-emerald-950">Expense Management</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card data-testid="filters-card" className="border-zinc-200 shadow-sm mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Driver</Label>
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger data-testid="filter-driver-select" className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Drivers</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger data-testid="filter-month-select" className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger data-testid="filter-year-select" className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-expense-button" className="w-full h-12 bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Expense
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Expense</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="driver_id">Driver</Label>
                        <Select value={formData.driver_id} onValueChange={(value) => setFormData({ ...formData, driver_id: value })}>
                          <SelectTrigger data-testid="expense-driver-select" className="h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {drivers.map((driver) => (
                              <SelectItem key={driver.id} value={driver.id}>
                                {driver.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          data-testid="expense-date-input"
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          required
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                          <SelectTrigger data-testid="expense-category-select" className="h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fuel">Fuel</SelectItem>
                            <SelectItem value="toll">Toll</SelectItem>
                            <SelectItem value="misc">Miscellaneous</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount (₹)</Label>
                        <Input
                          id="amount"
                          data-testid="expense-amount-input"
                          type="number"
                          step="0.01"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          required
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          data-testid="expense-description-input"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          required
                          className="h-12"
                        />
                      </div>
                      <Button data-testid="expense-form-submit" type="submit" className="w-full h-12 bg-emerald-600 hover:bg-emerald-700">
                        Add Expense
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total */}
        <Card className="border-zinc-200 shadow-sm mb-6">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-zinc-600 mb-1">Total Expenses</p>
              <p className="text-3xl font-semibold text-emerald-950 mono">₹{getTotalExpenses().toLocaleString('en-IN')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Expenses List */}
        <Card data-testid="expenses-list-card" className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-medium">Expenses ({expenses.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8">No expenses found for selected filters</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="text-left p-4 font-medium text-zinc-900">Date</th>
                      <th className="text-left p-4 font-medium text-zinc-900">Driver</th>
                      <th className="text-left p-4 font-medium text-zinc-900">Category</th>
                      <th className="text-left p-4 font-medium text-zinc-900">Description</th>
                      <th className="text-right p-4 font-medium text-zinc-900">Amount</th>
                      <th className="text-right p-4 font-medium text-zinc-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id} data-testid={`expense-row-${expense.id}`} className="border-b border-zinc-200 hover:bg-zinc-50">
                        <td className="p-4 text-zinc-900">{expense.date}</td>
                        <td className="p-4 text-zinc-900">{expense.driver_name}</td>
                        <td className="p-4">
                          <span className="text-xs px-2 py-1 rounded bg-zinc-100 text-zinc-700 capitalize">
                            {expense.category}
                          </span>
                        </td>
                        <td className="p-4 text-zinc-600">{expense.description}</td>
                        <td className="p-4 text-right text-zinc-900 mono font-medium">₹{expense.amount.toLocaleString('en-IN')}</td>
                        <td className="p-4 text-right">
                          <Button
                            data-testid={`delete-expense-${expense.id}`}
                            onClick={() => handleDelete(expense.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
