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
import { ArrowLeft, Plus, Calendar } from 'lucide-react';

export default function LeaveManagement({ user, onLogout }) {
  const [leaves, setLeaves] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    driver_id: '',
    date: new Date().toISOString().split('T')[0],
    reason: '',
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchDrivers();
    fetchLeaves();
  }, []);

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

  const fetchLeaves = async () => {
    try {
      const response = await api.get('/leaves');
      setLeaves(response.data);
    } catch (error) {
      toast.error('Failed to fetch leaves');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leaves', formData);
      toast.success('Leave recorded successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchLeaves();
    } catch (error) {
      toast.error('Failed to record leave');
    }
  };

  const handleDelete = async (leaveId) => {
    if (!window.confirm('Are you sure you want to delete this leave record?')) return;
    try {
      await api.delete(`/leaves/${leaveId}`);
      toast.success('Leave deleted successfully');
      fetchLeaves();
    } catch (error) {
      toast.error('Failed to delete leave');
    }
  };

  const resetForm = () => {
    setFormData({
      driver_id: drivers[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      reason: '',
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button onClick={() => navigate('/admin')} variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-xl font-semibold text-emerald-950">Leave Management</h1>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Mark Leave
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Mark Leave</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Driver</Label>
                    <Select value={formData.driver_id} onValueChange={(value) => setFormData({ ...formData, driver_id: value })}>
                      <SelectTrigger className="h-12">
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
                    <Label htmlFor="date">Leave Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason</Label>
                    <Input
                      id="reason"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      required
                      className="h-12"
                      placeholder="e.g., Sick leave, Personal"
                    />
                  </div>
                  <div className="p-3 bg-zinc-100 rounded-md text-sm text-zinc-600">
                    <p className="font-medium text-zinc-900 mb-1">Pro-rata deduction</p>
                    <p className="text-xs">Deduction will be calculated based on daily salary (Base salary ÷ 30 days)</p>
                  </div>
                  <Button type="submit" className="w-full h-12 bg-emerald-600 hover:bg-emerald-700">
                    Mark Leave
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-medium">Leave Records ({leaves.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {leaves.length === 0 ? (
              <p className="text-center py-8 text-zinc-500">No leave records found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="text-left p-4 font-medium text-zinc-900">Driver</th>
                      <th className="text-left p-4 font-medium text-zinc-900">Date</th>
                      <th className="text-left p-4 font-medium text-zinc-900">Reason</th>
                      <th className="text-right p-4 font-medium text-zinc-900">Deduction</th>
                      <th className="text-right p-4 font-medium text-zinc-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((leave) => (
                      <tr key={leave.id} className="border-b border-zinc-200 hover:bg-zinc-50">
                        <td className="p-4 text-zinc-900">{leave.driver_name}</td>
                        <td className="p-4 text-zinc-900">{leave.date}</td>
                        <td className="p-4 text-zinc-600">{leave.reason}</td>
                        <td className="p-4 text-right text-red-600 font-medium mono">
                          -₹{leave.deduction_amount.toLocaleString('en-IN')}
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            onClick={() => handleDelete(leave.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
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
