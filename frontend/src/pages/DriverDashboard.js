import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { LogOut, Clock } from 'lucide-react';

export default function DriverDashboard({ user, onLogout }) {
  const [driverProfile, setDriverProfile] = useState(null);
  const [inTime, setInTime] = useState('');
  const [outTime, setOutTime] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [details, setDetails] = useState('');
  const [showRemarks, setShowRemarks] = useState(false);
  const [remarkType, setRemarkType] = useState('');
  const [remarkText, setRemarkText] = useState('');
  const [recentEntries, setRecentEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [overtimeMinutes, setOvertimeMinutes] = useState(0);

  useEffect(() => {
    fetchDriverProfile();
    fetchRecentEntries();
  }, []);

  useEffect(() => {
    // Calculate overtime when times change
    if (inTime && outTime && driverProfile) {
      const inDateTime = new Date(`${selectedDate}T${inTime}`);
      const outDateTime = new Date(`${selectedDate}T${outTime}`);
      const hoursWorked = (outDateTime - inDateTime) / (1000 * 60 * 60);
      const ot = Math.max(0, hoursWorked - driverProfile.standard_hours);
      setOvertimeMinutes(Math.round(ot * 60));
    } else {
      setOvertimeMinutes(0);
    }
  }, [inTime, outTime, driverProfile, selectedDate]);

  const fetchDriverProfile = async () => {
    try {
      const response = await api.get('/drivers');
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

    // Validate: Details mandatory if overtime
    if (overtimeMinutes > 0 && !details.trim()) {
      toast.error('Please provide details when submitting overtime');
      return;
    }

    setLoading(true);
    try {
      await api.post('/duty-entries', {
        driver_id: driverProfile.id,
        date: selectedDate,
        in_time: `${selectedDate}T${inTime}:00`,
        out_time: `${selectedDate}T${outTime}:00`,
        details: details.trim() || null,
        remark_type: showRemarks ? remarkType : null,
        remark_text: showRemarks && remarkType === 'misc' ? remarkText : null,
      });

      toast.success('Duty entry submitted successfully');
      setInTime('');
      setOutTime('');
      setDetails('');
      setShowRemarks(false);
      setRemarkType('');
      setRemarkText('');
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
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-zinc-950">Taurani Staff Driver</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-600">{user.name}</span>
              <Button
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-zinc-200 shadow-sm mb-8">
          <CardHeader>
            <CardTitle className="text-xl font-medium flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Log Duty Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitDuty} className="space-y-6">
              {/* Timing Entry (Existing) */}
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="in-time">In Time</Label>
                  <Input
                    id="in-time"
                    type="time"
                    value={inTime}
                    onChange={(e) => setInTime(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="out-time">Out Time</Label>
                  <Input
                    id="out-time"
                    type="time"
                    value={outTime}
                    onChange={(e) => setOutTime(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
              </div>

              {overtimeMinutes > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <p className="text-sm text-orange-800">
                    <strong>Overtime Detected:</strong> {overtimeMinutes} minutes
                  </p>
                </div>
              )}

              {/* NEW: Details Section */}
              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="details">
                  Details {overtimeMinutes > 0 && <span className="text-red-600">*</span>}
                </Label>
                <Textarea
                  id="details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder={overtimeMinutes > 0 ? "Please explain the overtime work (mandatory)" : "Optional details about your duty"}
                  rows={3}
                  className="resize-none"
                  required={overtimeMinutes > 0}
                />
                {overtimeMinutes > 0 && (
                  <p className="text-xs text-orange-600">
                    Details are mandatory when overtime is worked
                  </p>
                )}
              </div>

              {/* NEW: Remarks Section */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-remarks"
                    checked={showRemarks}
                    onCheckedChange={setShowRemarks}
                  />
                  <Label htmlFor="show-remarks" className="cursor-pointer">
                    Add Remarks
                  </Label>
                </div>

                {showRemarks && (
                  <div className="space-y-4 pl-6">
                    <div className="space-y-2">
                      <Label>Remark Type</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="misc"
                            name="remarkType"
                            value="misc"
                            checked={remarkType === 'misc'}
                            onChange={(e) => setRemarkType(e.target.value)}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="misc" className="cursor-pointer font-normal">
                            Misc.
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="extra_duty_day"
                            name="remarkType"
                            value="extra_duty_day"
                            checked={remarkType === 'extra_duty_day'}
                            onChange={(e) => setRemarkType(e.target.value)}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="extra_duty_day" className="cursor-pointer font-normal">
                            Extra Duty Day
                          </Label>
                        </div>
                      </div>
                    </div>

                    {remarkType === 'misc' && (
                      <div className="space-y-2">
                        <Label htmlFor="remark-text">Remark Details</Label>
                        <Textarea
                          id="remark-text"
                          value={remarkText}
                          onChange={(e) => setRemarkText(e.target.value)}
                          placeholder="Where you were, what you were doing, etc."
                          rows={3}
                          className="resize-none"
                        />
                      </div>
                    )}

                    {remarkType === 'extra_duty_day' && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800">
                          This will be marked as an Extra Duty Day and linked to pro-rata daily amount
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-zinc-950 hover:bg-zinc-800"
              >
                {loading ? 'Submitting...' : 'Submit Duty Entry'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Entries */}
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-medium">Recent Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {recentEntries.length === 0 ? (
              <p className="text-center py-8 text-zinc-500">No recent entries</p>
            ) : (
              <div className="space-y-3">
                {recentEntries.map((entry) => (
                  <div key={entry.id} className="p-4 border border-zinc-200 rounded-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-zinc-950">{entry.date}</p>
                        <p className="text-sm text-zinc-600 mt-1">
                          {new Date(entry.in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - 
                          {new Date(entry.out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-sm text-zinc-600">Hours: {entry.hours_worked}h</p>
                        {entry.overtime_minutes > 0 && (
                          <p className="text-sm text-orange-600">OT: {entry.overtime_minutes}m</p>
                        )}
                        {entry.early_departure && (
                          <p className="text-sm text-red-600">Early departure: {entry.early_departure_minutes}m</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded text-xs font-medium ${
                        entry.approval_status === 'approved' ? 'bg-green-100 text-green-700' :
                        entry.approval_status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {entry.approval_status}
                      </span>
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
