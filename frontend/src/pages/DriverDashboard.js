import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { LogOut, Clock, Edit, Eye } from 'lucide-react';

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
  
  // Edit/View modal state
  const [viewingEntry, setViewingEntry] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editInTime, setEditInTime] = useState('');
  const [editOutTime, setEditOutTime] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [editShowRemarks, setEditShowRemarks] = useState(false);
  const [editRemarkType, setEditRemarkType] = useState('');
  const [editRemarkText, setEditRemarkText] = useState('');

  useEffect(() => {
    fetchDriverProfile();
    fetchRecentEntries();
  }, []);

  useEffect(() => {
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
      const myEntries = driverProfile 
        ? response.data.filter(e => e.driver_id === driverProfile.id)
        : response.data;
      setRecentEntries(myEntries.slice(0, 10));
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

  const openViewDialog = (entry) => {
    setViewingEntry(entry);
    setIsEditing(false);
    
    // Pre-fill edit fields
    const inTime = new Date(entry.in_time);
    const outTime = new Date(entry.out_time);
    setEditInTime(inTime.toTimeString().substring(0, 5));
    setEditOutTime(outTime.toTimeString().substring(0, 5));
    setEditDetails(entry.details || '');
    setEditShowRemarks(!!entry.remark_type);
    setEditRemarkType(entry.remark_type || '');
    setEditRemarkText(entry.remark_text || '');
  };

  const handleSaveEdit = async () => {
    if (!viewingEntry || !driverProfile) return;

    // Calculate overtime for validation
    const inDateTime = new Date(`${viewingEntry.date}T${editInTime}`);
    const outDateTime = new Date(`${viewingEntry.date}T${editOutTime}`);
    const hoursWorked = (outDateTime - inDateTime) / (1000 * 60 * 60);
    const ot = Math.max(0, hoursWorked - driverProfile.standard_hours);
    const otMinutes = Math.round(ot * 60);

    if (otMinutes > 0 && !editDetails.trim()) {
      toast.error('Details are mandatory when overtime is worked');
      return;
    }

    setLoading(true);
    try {
      await api.put(`/duty-entries/${viewingEntry.id}/driver-edit`, {
        in_time: `${viewingEntry.date}T${editInTime}:00`,
        out_time: `${viewingEntry.date}T${editOutTime}:00`,
        details: editDetails.trim() || null,
        remark_type: editShowRemarks ? editRemarkType : null,
        remark_text: editShowRemarks && editRemarkType === 'misc' ? editRemarkText : null,
      });

      toast.success('Entry updated successfully');
      setViewingEntry(null);
      setIsEditing(false);
      fetchRecentEntries();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update entry');
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
              <Button onClick={onLogout} variant="outline" size="sm" className="h-9">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Log Duty Form - Same as before */}
        <Card className="border-zinc-200 shadow-sm mb-8">
          <CardHeader>
            <CardTitle className="text-xl font-medium flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Log Duty Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitDuty} className="space-y-6">
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
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-remarks"
                    checked={showRemarks}
                    onCheckedChange={setShowRemarks}
                  />
                  <Label htmlFor="show-remarks" className="cursor-pointer">Add Remarks</Label>
                </div>

                {showRemarks && (
                  <div className="space-y-4 pl-6">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input type="radio" id="misc" name="remarkType" value="misc"
                          checked={remarkType === 'misc'} onChange={(e) => setRemarkType(e.target.value)} className="w-4 h-4" />
                        <Label htmlFor="misc" className="cursor-pointer font-normal">Misc.</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="radio" id="extra_duty_day" name="remarkType" value="extra_duty_day"
                          checked={remarkType === 'extra_duty_day'} onChange={(e) => setRemarkType(e.target.value)} className="w-4 h-4" />
                        <Label htmlFor="extra_duty_day" className="cursor-pointer font-normal">Extra Duty Day</Label>
                      </div>
                    </div>

                    {remarkType === 'misc' && (
                      <Textarea id="remark-text" value={remarkText} onChange={(e) => setRemarkText(e.target.value)}
                        placeholder="Where you were, what you were doing, etc." rows={3} className="resize-none" />
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

              <Button type="submit" disabled={loading} className="w-full h-12 bg-zinc-950 hover:bg-zinc-800">
                {loading ? 'Submitting...' : 'Submit Duty Entry'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Entries with Edit/View */}
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
                          <p className="text-sm text-red-600">Early: {entry.early_departure_minutes}m</p>
                        )}
                        {entry.edit_count > 0 && (
                          <p className="text-xs text-zinc-500 mt-1">Edited once</p>
                        )}
                      </div>
                      <div className="flex gap-2 items-start">
                        <span className={`px-3 py-1 rounded text-xs font-medium ${
                          entry.approval_status === 'approved' ? 'bg-green-100 text-green-700' :
                          entry.approval_status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {entry.approval_status}
                        </span>
                        {entry.can_edit ? (
                          <Button onClick={() => { openViewDialog(entry); setIsEditing(true); }} size="sm" variant="outline">
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        ) : (
                          <Button onClick={() => openViewDialog(entry)} size="sm" variant="outline">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* View/Edit Dialog */}
      <Dialog open={!!viewingEntry} onOpenChange={() => { setViewingEntry(null); setIsEditing(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Entry' : 'View Entry'}</DialogTitle>
          </DialogHeader>
          {viewingEntry && (
            <div className="space-y-4">
              <div className="p-3 bg-zinc-50 rounded">
                <p className="text-sm font-medium">{viewingEntry.date}</p>
                <span className={`inline-block mt-1 px-2 py-1 rounded text-xs ${
                  viewingEntry.approval_status === 'approved' ? 'bg-green-100 text-green-700' :
                  viewingEntry.approval_status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {viewingEntry.approval_status}
                </span>
              </div>

              {isEditing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>In Time</Label>
                      <Input type="time" value={editInTime} onChange={(e) => setEditInTime(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label>Out Time</Label>
                      <Input type="time" value={editOutTime} onChange={(e) => setEditOutTime(e.target.value)} className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label>Details</Label>
                    <Textarea value={editDetails} onChange={(e) => setEditDetails(e.target.value)} rows={3} className="mt-1" />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSaveEdit} disabled={loading} className="flex-1 bg-zinc-950 hover:bg-zinc-800">
                      Save Changes
                    </Button>
                    <Button onClick={() => { setViewingEntry(null); setIsEditing(false); }} variant="outline" className="flex-1">
                      Cancel
                    </Button>
                  </div>
                  {!viewingEntry.can_edit && (
                    <p className="text-xs text-red-600 text-center">
                      {viewingEntry.edit_count >= 1 
                        ? 'This entry has already been edited once' 
                        : 'Edit window expired (entries can only be edited within 2 days)'}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-zinc-500">In Time</p>
                      <p className="font-medium">
                        {new Date(viewingEntry.in_time).toLocaleTimeString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Out Time</p>
                      <p className="font-medium">
                        {new Date(viewingEntry.out_time).toLocaleTimeString('en-IN')}
                      </p>
                    </div>
                  </div>
                  {viewingEntry.details && (
                    <div>
                      <p className="text-sm text-zinc-500">Details</p>
                      <p className="text-sm mt-1">{viewingEntry.details}</p>
                    </div>
                  )}
                  {viewingEntry.admin_remarks && (
                    <div className="p-3 bg-blue-50 rounded">
                      <p className="text-sm font-medium text-blue-900">Admin Remarks</p>
                      <p className="text-sm text-blue-800 mt-1">{viewingEntry.admin_remarks}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
