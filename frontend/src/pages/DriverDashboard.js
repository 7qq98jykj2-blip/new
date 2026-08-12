import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { LogOut, Clock, Calendar, DollarSign, Receipt } from 'lucide-react';

export default function DriverDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [driverProfile, setDriverProfile] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [inTime, setInTime] = useState({ hour: '09', minute: '00', period: 'AM' });
  const [outTime, setOutTime] = useState({ hour: '06', minute: '00', period: 'PM' });
  const [workStatus, setWorkStatus] = useState('present');
  const [outstationCity, setOutstationCity] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDriverProfile();
  }, []);

  const fetchDriverProfile = async () => {
    try {
      const response = await api.get('/drivers');
      const driver = response.data.find(d => d.phone === user.mobile) || response.data[0];
      if (driver) {
        setDriverProfile(driver);
      }
    } catch (error) {
      toast.error('Failed to fetch driver profile');
    }
  };

  const formatTime24 = (timeObj) => {
    let hour = parseInt(timeObj.hour);
    if (timeObj.period === 'PM' && hour !== 12) hour += 12;
    if (timeObj.period === 'AM' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${timeObj.minute}:00`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (workStatus === 'outstation' && !outstationCity.trim()) {
      toast.error('City is mandatory for outstation work');
      return;
    }

    setLoading(true);
    try {
      const inTime24 = formatTime24(inTime);
      const outTime24 = formatTime24(outTime);
      
      await api.post('/duty-entries', {
        driver_id: driverProfile.id,
        date: selectedDate,
        in_time: `${selectedDate}T${inTime24}`,
        out_time: `${selectedDate}T${outTime24}`,
        work_status: workStatus,
        outstation_city: workStatus === 'outstation' ? outstationCity : null,
        details: details.trim() || null
      });

      toast.success('Duty entry submitted successfully');
      setInTime({ hour: '09', minute: '00', period: 'AM' });
      setOutTime({ hour: '06', minute: '00', period: 'PM' });
      setWorkStatus('present');
      setOutstationCity('');
      setDetails('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit duty entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200 sticky top-0 z-10 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-emerald-950">Taurani Staff Driver</h1>
          <div className="flex gap-4 items-center">
            <Button onClick={() => navigate('/driver/attendance')} variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              My Attendance
            </Button>
            <Button onClick={() => navigate('/driver/payroll')} variant="outline" size="sm">
              <DollarSign className="w-4 h-4 mr-2" />
              My Payroll
            </Button>
            <Button onClick={onLogout} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Log Duty Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label>Date</Label>
                <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} required />
              </div>

              <div>
                <Label>Work Status</Label>
                <select 
                  value={workStatus} 
                  onChange={(e) => setWorkStatus(e.target.value)}
                  className="w-full border border-zinc-300 rounded-md px-3 py-2"
                >
                  <option value="present">Present / Normal Working</option>
                  <option value="vacation">Vacation / Leave</option>
                  <option value="outstation">Outstation</option>
                  <option value="holiday_worked">Holiday Worked</option>
                  <option value="weekly_off_worked">Weekly Off Worked / Extra Day</option>
                </select>
              </div>

              {workStatus === 'outstation' && (
                <div>
                  <Label>City <span className="text-red-600">*</span></Label>
                  <Input 
                    value={outstationCity} 
                    onChange={(e) => setOutstationCity(e.target.value)}
                    placeholder="Enter city name"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>In Time</Label>
                  <div className="flex gap-2">
                    <select value={inTime.hour} onChange={(e) => setInTime({...inTime, hour: e.target.value})} className="border rounded px-2 py-2">
                      {Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <select value={inTime.minute} onChange={(e) => setInTime({...inTime, minute: e.target.value})} className="border rounded px-2 py-2">
                      {Array.from({length: 60}, (_, i) => String(i).padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={inTime.period} onChange={(e) => setInTime({...inTime, period: e.target.value})} className="border rounded px-2 py-2">
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Out Time</Label>
                  <div className="flex gap-2">
                    <select value={outTime.hour} onChange={(e) => setOutTime({...outTime, hour: e.target.value})} className="border rounded px-2 py-2">
                      {Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <select value={outTime.minute} onChange={(e) => setOutTime({...outTime, minute: e.target.value})} className="border rounded px-2 py-2">
                      {Array.from({length: 60}, (_, i) => String(i).padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={outTime.period} onChange={(e) => setOutTime({...outTime, period: e.target.value})} className="border rounded px-2 py-2">
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <Label>Details</Label>
                <Textarea 
                  value={details} 
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Optional details about your duty"
                  rows={3}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {loading ? 'Submitting...' : 'Submit Duty Entry'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6">
          <Button 
            onClick={() => navigate('/driver/expenses')} 
            variant="outline" 
            className="w-full"
          >
            <Receipt className="w-4 h-4 mr-2" />
            Submit Miscellaneous Expenses (Parking, Tolls, etc.)
          </Button>
        </div>
      </main>
    </div>
  );
}
