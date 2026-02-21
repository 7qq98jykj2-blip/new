import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Edit, Trash2, Eye } from 'lucide-react';

export default function DriverManagement({ user, onLogout }) {
  const [drivers, setDrivers] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    aadhaar_number: '',
    address: '',
    phone: '',
    job_start_date: '',
    base_salary: '',
    standard_hours: '10',
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await api.get('/drivers');
      setDrivers(response.data);
    } catch (error) {
      toast.error('Failed to fetch drivers');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDriver) {
        await api.put(`/drivers/${editingDriver.id}`, formData);
        toast.success('Driver updated successfully');
      } else {
        await api.post('/drivers', formData);
        toast.success('Driver created successfully');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchDrivers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (driver) => {
    setEditingDriver(driver);
    setFormData({
      full_name: driver.full_name,
      aadhaar_number: driver.aadhaar_number,
      address: driver.address,
      phone: driver.phone,
      job_start_date: driver.job_start_date,
      base_salary: driver.base_salary.toString(),
      standard_hours: driver.standard_hours.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this driver?')) return;
    try {
      await api.delete(`/drivers/${id}`);
      toast.success('Driver deleted successfully');
      fetchDrivers();
    } catch (error) {
      toast.error('Failed to delete driver');
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      aadhaar_number: '',
      address: '',
      phone: '',
      job_start_date: '',
      base_salary: '',
      standard_hours: '10',
    });
    setEditingDriver(null);
  };

  const viewPayroll = (driver) => {
    const now = new Date();
    navigate(`/payroll/${driver.id}/${now.getFullYear()}/${now.getMonth() + 1}`);
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
            <h1 className="text-xl font-semibold text-zinc-950">Driver Management</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-medium">Drivers</h2>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-driver-button" className="bg-zinc-900 hover:bg-zinc-800">
                <Plus className="w-4 h-4 mr-2" />
                Add Driver
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingDriver ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      data-testid="driver-full-name-input"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aadhaar_number">Aadhaar Number</Label>
                    <Input
                      id="aadhaar_number"
                      data-testid="driver-aadhaar-input"
                      value={formData.aadhaar_number}
                      onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    data-testid="driver-address-input"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      data-testid="driver-phone-input"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job_start_date">Job Start Date</Label>
                    <Input
                      id="job_start_date"
                      data-testid="driver-job-start-input"
                      type="date"
                      value={formData.job_start_date}
                      onChange={(e) => setFormData({ ...formData, job_start_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="base_salary">Base Monthly Salary (₹)</Label>
                    <Input
                      id="base_salary"
                      data-testid="driver-salary-input"
                      type="number"
                      value={formData.base_salary}
                      onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="standard_hours">Standard Duty Hours/Day</Label>
                    <Input
                      id="standard_hours"
                      data-testid="driver-hours-input"
                      type="number"
                      step="0.5"
                      value={formData.standard_hours}
                      onChange={(e) => setFormData({ ...formData, standard_hours: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="submit" data-testid="driver-form-submit" className="flex-1 bg-zinc-900 hover:bg-zinc-800">
                    {editingDriver ? 'Update Driver' : 'Create Driver'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setIsDialogOpen(false); resetForm(); }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map((driver) => (
            <Card key={driver.id} data-testid={`driver-card-${driver.id}`} className="border-zinc-200 shadow-sm card-hover">
              <CardHeader>
                <CardTitle className="text-lg font-medium">{driver.full_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="text-zinc-600"><span className="font-medium text-zinc-900">Phone:</span> {driver.phone}</p>
                  <p className="text-zinc-600"><span className="font-medium text-zinc-900">Aadhaar:</span> {driver.aadhaar_number}</p>
                  <p className="text-zinc-600"><span className="font-medium text-zinc-900">Base Salary:</span> <span className="mono">₹{driver.base_salary.toLocaleString('en-IN')}</span></p>
                  <p className="text-zinc-600"><span className="font-medium text-zinc-900">Standard Hours:</span> <span className="mono">{driver.standard_hours}h</span></p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    data-testid={`view-payroll-${driver.id}`}
                    onClick={() => viewPayroll(driver)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Payroll
                  </Button>
                  <Button
                    data-testid={`edit-driver-${driver.id}`}
                    onClick={() => handleEdit(driver)}
                    variant="outline"
                    size="sm"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    data-testid={`delete-driver-${driver.id}`}
                    onClick={() => handleDelete(driver.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {drivers.length === 0 && (
          <Card className="border-zinc-200">
            <CardContent className="py-12 text-center">
              <p className="text-zinc-500">No drivers found. Add your first driver to get started.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
