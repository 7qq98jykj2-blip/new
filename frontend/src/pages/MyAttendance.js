import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { api } from '../utils/api';
import { ArrowLeft } from 'lucide-react';

export default function MyAttendance({ user }) {
  const navigate = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [attendance, setAttendance] = useState([]);
  const [driverId, setDriverId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDriver();
  }, []);

  useEffect(() => {
    if (driverId) fetchAttendance();
  }, [driverId, year, month]);

  const fetchDriver = async () => {
    const res = await api.get('/drivers');
    const driver = res.data.find(d => d.phone === user.mobile) || res.data[0];
    setDriverId(driver.id);
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/drivers/${driverId}/attendance/${year}/${month}`);
      setAttendance(res.data.entries);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const format12Hour = (isoTime) => {
    const date = new Date(isoTime);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getStatusDisplay = (entry) => {
    const statusMap = {
      'present': 'Present',
      'vacation': 'Vacation',
      'outstation': 'Outstation',
      'holiday_worked': 'Holiday Worked',
      'weekly_off_worked': 'Weekly Off Worked'
    };
    return statusMap[entry.work_status] || 'Present';
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200 sticky top-0 z-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button onClick={() => navigate('/driver')} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-semibold text-emerald-950">My Attendance</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Monthly Attendance</CardTitle>
              <div className="flex gap-2">
                <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="border rounded px-3 py-2">
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{new Date(2000, m-1).toLocaleString('en', {month: 'long'})}</option>
                  ))}
                </select>
                <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="border rounded px-3 py-2">
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8">Loading...</p>
            ) : attendance.length === 0 ? (
              <p className="text-center py-8 text-zinc-500">No attendance records for this month</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">City</th>
                      <th className="text-left py-3 px-4">Login</th>
                      <th className="text-left py-3 px-4">Logout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((entry) => (
                      <tr key={entry.id} className="border-b">
                        <td className="py-3 px-4">{entry.date}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            entry.work_status === 'vacation' ? 'bg-blue-100 text-blue-700' :
                            entry.work_status === 'holiday_worked' ? 'bg-orange-100 text-orange-700' :
                            entry.work_status === 'weekly_off_worked' ? 'bg-purple-100 text-purple-700' :
                            entry.work_status === 'outstation' ? 'bg-teal-100 text-teal-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {getStatusDisplay(entry)}
                          </span>
                        </td>
                        <td className="py-3 px-4">{entry.outstation_city || '—'}</td>
                        <td className="py-3 px-4">{format12Hour(entry.in_time)}</td>
                        <td className="py-3 px-4">{format12Hour(entry.out_time)}</td>
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
