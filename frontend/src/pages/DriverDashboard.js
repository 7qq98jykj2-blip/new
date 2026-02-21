import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { LogOut, Clock, Calendar } from 'lucide-react';

export default function DriverDashboard({ user, onLogout }) {
  const [driverProfile, setDriverProfile] = useState(null);
  const [inTime, setInTime] = useState('');
  const [outTime, setOutTime] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [recentEntries, setRecentEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDriverProfile();
    fetchRecentEntries();
  }, []);

  const fetchDriverProfile = async () => {
    try {
      const response = await api.get('/drivers');
      // Find driver by matching phone number with user's mobile
      const driver = response.data.find(d => d.phone === user.mobile) || response.data[0];
      if (driver) {
        setDriverProfile(driver);
      } else {
        toast.error('Driver profile not found. Please contact admin.');
      }
    } catch (error) {
      toast.error('Failed to fetch driver profile');
    }
  };

  const fetchRecentEntries = async () => {
    try {
      const response = await api.get('/duty-entries');
      setRecentEntries(response.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch recent entries');
    }
  };

  const handleSubmitDuty = async (e) => {
    e.preventDefault();
    if (!driverProfile) {
      toast.error('Driver profile not found');
      return;
    }

    setLoading(true);
    try {
      await api.post('/duty-entries', {
        driver_id: driverProfile.id,
        date: selectedDate,
        in_time: `${selectedDate}T${inTime}:00`,
        out_time: `${selectedDate}T${outTime}:00`,
      });

      toast.success('Duty entry submitted successfully');
      setInTime('');
      setOutTime('');
      setSelectedDate(new Date().toISOString().split('T')[0]);
      fetchRecentEntries();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit duty entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-zinc-950">Taurani Staff Driver</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-600">{user.name}</span>
              <Button
                data-testid="driver-logout-button"
                onClick={onLogout}
                variant="outline"
                size="sm"
                className="h-9"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Duty Entry Form */}
        <Card data-testid="duty-entry-card" className="border-zinc-200 shadow-sm mb-8">
          <CardHeader>
            <CardTitle className="text-xl font-medium flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Log Duty Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitDuty} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="date" data-testid="duty-date-label">Date</Label>
                <Input
                  id="date"
                  data-testid="duty-date-input"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inTime" data-testid="duty-in-time-label">In Time</Label>
                  <Input
                    id="inTime"
                    data-testid="duty-in-time-input"
                    type="time"
                    value={inTime}
                    onChange={(e) => setInTime(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="outTime" data-testid="duty-out-time-label">Out Time</Label>
                  <Input
                    id="outTime"
                    data-testid="duty-out-time-input"
                    type="time"
                    value={outTime}
                    onChange={(e) => setOutTime(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
              </div>

              <Button
                data-testid="duty-submit-button"
                type="submit"
                className="w-full h-12 bg-zinc-900 hover:bg-zinc-800"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Duty Entry'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Entries */}
        <Card data-testid="recent-entries-card" className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-medium flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Recent Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentEntries.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8">No duty entries yet</p>
            ) : (
              <div className="space-y-3">
                {recentEntries.map((entry) => (
                  <div
                    key={entry.id}
                    data-testid={`recent-entry-${entry.id}`}
                    className="flex justify-between items-center p-4 border border-zinc-200 rounded-md"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-950">{entry.date}</p>
                      <p className="text-xs text-zinc-600 mt-1">
                        {new Date(entry.in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - {new Date(entry.out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium mono text-zinc-950">{entry.hours_worked}h</p>
                      {entry.overtime_minutes > 0 && (
                        <p className="text-xs text-zinc-600 mt-1">OT: {entry.overtime_minutes}m</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
