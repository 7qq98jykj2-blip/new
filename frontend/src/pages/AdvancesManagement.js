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
import { ArrowLeft, Plus, DollarSign } from 'lucide-react';

export default function AdvancesManagement({ user, onLogout }) {
  const [advances, setAdvances] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    driver_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    reason: '',
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchDrivers();
    fetchAdvances();
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

  const fetchAdvances = async () => {
    try {
      const response = await api.get('/advances');
      setAdvances(response.data);
    } catch (error) {
      toast.error('Failed to fetch advances');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/advances', formData);
      toast.success('Advance added successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchAdvances();
    } catch (error) {
      toast.error('Failed to add advance');
    }
  };

  const handleSettle = async (advanceId) => {
    const amount = prompt('Enter settlement amount:');
    if (!amount || isNaN(amount)) return;

    try {
      await api.put(`/advances/${advanceId}/settle`, {
        amount: parseFloat(amount)
      });
      toast.success('Advance settled successfully');
      fetchAdvances();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to settle advance');
    }
  };

  const resetForm = () => {
    setFormData({
      driver_id: drivers[0]?.id || '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      reason: '',
    });
  };

  const getPendingAmount = (advance) => {
    return advance.amount - advance.settled_amount;
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
              <h1 className="text-xl font-semibold text-zinc-950">Advances Management</h1>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-zinc-900 hover:bg-zinc-800">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Advance
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Advance Payment</DialogTitle>
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
                    <Label htmlFor="date">Date</Label>
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
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 bg-zinc-900 hover:bg-zinc-800">
                    Add Advance
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {advances.map((advance) => (
            <Card key={advance.id} className="border-zinc-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium">{advance.driver_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="text-zinc-600"><span className="font-medium text-zinc-900">Date:</span> {advance.date}</p>
                  <p className="text-zinc-600"><span className="font-medium text-zinc-900">Total:</span> <span className="mono">₹{advance.amount.toLocaleString('en-IN')}</span></p>
                  <p className="text-zinc-600"><span className="font-medium text-zinc-900">Settled:</span> <span className="mono">₹{advance.settled_amount.toLocaleString('en-IN')}</span></p>
                  <p className={`font-semibold mono ${getPendingAmount(advance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    Pending: ₹{getPendingAmount(advance).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">{advance.reason}</p>
                </div>
                {getPendingAmount(advance) > 0 && (
                  <Button
                    onClick={() => handleSettle(advance.id)}
                    variant="outline"
                    size="sm"
                    className="w-full mt-4"
                  >
                    <DollarSign className="w-4 h-4 mr-1" />
                    Settle Amount
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {advances.length === 0 && (
          <Card className="border-zinc-200">
            <CardContent className="py-12 text-center">
              <p className="text-zinc-500">No advances found. Add your first advance to get started.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
