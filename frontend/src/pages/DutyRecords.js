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
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';

export default function DutyRecords({ user, onLogout }) {
  const [entries, setEntries] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ in_time: '', out_time: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const now = new Date();
    setSelectedMonth((now.getMonth() + 1).toString());
    setSelectedYear(now.getFullYear().toString());
    fetchDrivers();
  }, []);

  useEffect(() => {
    if (selectedMonth && selectedYear) {
      fetchEntries();
    }
  }, [selectedDriver, selectedMonth, selectedYear]);

  const fetchDrivers = async () => {
    try {
      const response = await api.get('/drivers');
      setDrivers(response.data);
    } catch (error) {
      toast.error('Failed to fetch drivers');
    }
  };

  const fetchEntries = async () => {
    try {
      const params = {
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
      };
      if (selectedDriver !== 'all') {
        params.driver_id = selectedDriver;
      }
      const response = await api.get('/duty-entries', { params });
      setEntries(response.data);
    } catch (error) {
      toast.error('Failed to fetch duty entries');
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    const inTime = new Date(entry.in_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const outTime = new Date(entry.out_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setFormData({ in_time: inTime, out_time: outTime });
    setIsDialogOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const date = editingEntry.date;
      await api.put(`/duty-entries/${editingEntry.id}`, {
        in_time: `${date}T${formData.in_time}:00`,
        out_time: `${date}T${formData.out_time}:00`,
      });
      toast.success('Duty entry updated successfully');
      setIsDialogOpen(false);
      fetchEntries();
    } catch (error) {
      toast.error('Failed to update duty entry');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await api.delete(`/duty-entries/${id}`);
      toast.success('Duty entry deleted successfully');
      fetchEntries();
    } catch (error) {
      toast.error('Failed to delete duty entry');
    }
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
            <h1 className="text-xl font-semibold text-emerald-950">Duty Records</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card data-testid="filters-card" className="border-zinc-200 shadow-sm mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            </div>
          </CardContent>
        </Card>

        {/* Entries Table */}
        <Card data-testid="entries-table-card" className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-medium">Entries ({entries.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8">No duty entries found for selected filters</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="text-left p-4 font-medium text-zinc-900">Date</th>
                      <th className="text-left p-4 font-medium text-zinc-900">Driver</th>
                      <th className="text-left p-4 font-medium text-zinc-900">In Time</th>
                      <th className="text-left p-4 font-medium text-zinc-900">Out Time</th>
                      <th className="text-left p-4 font-medium text-zinc-900">Hours</th>
                      <th className="text-left p-4 font-medium text-zinc-900">Overtime</th>
                      <th className="text-left p-4 font-medium text-zinc-900">Food</th>
                      <th className="text-right p-4 font-medium text-zinc-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} data-testid={`entry-row-${entry.id}`} className="border-b border-zinc-200 hover:bg-zinc-50">
                        <td className="p-4 text-zinc-900">{entry.date}</td>
                        <td className="p-4 text-zinc-900">{entry.driver_name}</td>
                        <td className="p-4 text-zinc-600 mono">
                          {new Date(entry.in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-4 text-zinc-600 mono">
                          {new Date(entry.out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-4 text-zinc-900 mono">{entry.hours_worked}h</td>
                        <td className="p-4 text-zinc-900 mono">{entry.overtime_minutes}m</td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded ${entry.food_allowance_given ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
                            {entry.food_allowance_given ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              data-testid={`edit-entry-${entry.id}`}
                              onClick={() => handleEdit(entry)}
                              variant="ghost"
                              size="sm"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              data-testid={`delete-entry-${entry.id}`}
                              onClick={() => handleDelete(entry.id)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Duty Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Date: {editingEntry?.date}</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="in_time">In Time</Label>
                <Input
                  id="in_time"
                  data-testid="edit-in-time-input"
                  type="time"
                  value={formData.in_time}
                  onChange={(e) => setFormData({ ...formData, in_time: e.target.value })}
                  required
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="out_time">Out Time</Label>
                <Input
                  id="out_time"
                  data-testid="edit-out-time-input"
                  type="time"
                  value={formData.out_time}
                  onChange={(e) => setFormData({ ...formData, out_time: e.target.value })}
                  required
                  className="h-12"
                />
              </div>
            </div>
            <Button data-testid="update-entry-button" type="submit" className="w-full h-12 bg-emerald-600 hover:bg-emerald-700">
              Update Entry
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
