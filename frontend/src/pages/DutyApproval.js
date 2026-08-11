import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { ArrowLeft, Check, X, Edit } from 'lucide-react';

export default function DutyApproval({ user, onLogout }) {
  const [pendingEntries, setPendingEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editOvertimeMinutes, setEditOvertimeMinutes] = useState(0);
  const [editRemarkText, setEditRemarkText] = useState('');
  const [editAdminRemarks, setEditAdminRemarks] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingEntries();
  }, []);

  const fetchPendingEntries = async () => {
    try {
      const response = await api.get('/duty-entries/pending');
      setPendingEntries(response.data);
    } catch (error) {
      toast.error('Failed to fetch pending entries');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (entryId, status) => {
    try {
      await api.put(`/duty-entries/${entryId}/approve`, {
        approval_status: status
      });
      toast.success(`Duty entry ${status}`);
      fetchPendingEntries();
    } catch (error) {
      toast.error('Failed to update approval status');
    }
  };

  const handleBulkApproval = async (status) => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one entry');
      return;
    }

    try {
      await Promise.all(
        selectedIds.map(id => 
          api.put(`/duty-entries/${id}/approve`, { approval_status: status })
        )
      );
      toast.success(`${selectedIds.length} entries ${status}`);
      setSelectedIds([]);
      fetchPendingEntries();
    } catch (error) {
      toast.error('Failed to update approval status');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === pendingEntries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingEntries.map(e => e.id));
    }
  };

  const handleSelectEntry = (entryId) => {
    setSelectedIds(prev => 
      prev.includes(entryId) 
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    );
  };

  const openEditDialog = (entry) => {
    setEditingEntry(entry);
    setEditOvertimeMinutes(entry.overtime_minutes);
    setEditRemarkText(entry.remark_text || '');
    setEditAdminRemarks(entry.admin_remarks || '');
  };

  const handleSaveEdits = async (status) => {
    if (!editingEntry) return;

    try {
      await api.put(`/duty-entries/${editingEntry.id}/approve`, {
        approval_status: status,
        overtime_minutes: editOvertimeMinutes,
        remark_text: editRemarkText,
        admin_remarks: editAdminRemarks
      });
      toast.success(`Duty entry ${status} with modifications`);
      setEditingEntry(null);
      fetchPendingEntries();
    } catch (error) {
      toast.error('Failed to update entry');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Button
              onClick={() => navigate('/admin')}
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-semibold text-zinc-950">Duty Approvals</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-medium">
                Pending Approvals ({pendingEntries.length})
              </CardTitle>
              {pendingEntries.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSelectAll}
                    variant="outline"
                    size="sm"
                  >
                    {selectedIds.length === pendingEntries.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  {selectedIds.length > 0 && (
                    <>
                      <Button
                        onClick={() => handleBulkApproval('approved')}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve ({selectedIds.length})
                      </Button>
                      <Button
                        onClick={() => handleBulkApproval('rejected')}
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 border-red-600"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject ({selectedIds.length})
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-zinc-500">Loading...</p>
            ) : pendingEntries.length === 0 ? (
              <p className="text-center py-8 text-zinc-500">No pending duty entries</p>
            ) : (
              <div className="space-y-4">
                {pendingEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-4 border rounded-md ${
                      selectedIds.includes(entry.id) 
                        ? 'border-zinc-900 bg-zinc-50' 
                        : 'border-zinc-200'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={selectedIds.includes(entry.id)}
                          onCheckedChange={() => handleSelectEntry(entry.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-zinc-950">{entry.driver_name}</h3>
                          <p className="text-sm text-zinc-600 mt-1">Date: {entry.date}</p>
                          <p className="text-sm text-zinc-600">
                            {new Date(entry.in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - 
                            {new Date(entry.out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <div className="mt-2 text-sm">
                            <span className="text-zinc-950 font-medium">Hours: </span>
                            <span className="mono">{entry.hours_worked}h</span>
                            {entry.overtime_minutes > 0 && (
                              <span className="ml-3">
                                <span className="text-zinc-950 font-medium">OT: </span>
                                <span className="mono text-orange-600">{entry.overtime_minutes}m</span>
                              </span>
                            )}
                          </div>
                          
                          {/* Show Details */}
                          {entry.details && (
                            <div className="mt-3 p-2 bg-zinc-50 rounded border border-zinc-200">
                              <p className="text-xs font-medium text-zinc-700">Details:</p>
                              <p className="text-sm text-zinc-600">{entry.details}</p>
                            </div>
                          )}

                          {/* Show Remarks */}
                          {entry.remark_type && (
                            <div className="mt-2">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                entry.remark_type === 'extra_duty_day' 
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                {entry.remark_type === 'extra_duty_day' ? 'Extra Duty Day' : 'Misc'}
                              </span>
                              {entry.remark_text && (
                                <p className="text-sm text-zinc-600 mt-1">{entry.remark_text}</p>
                              )}
                            </div>
                          )}

                          {/* Early Departure Warning */}
                          {entry.early_departure && (
                            <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                              <p className="text-xs font-medium text-red-700">⚠️ Early Departure</p>
                              <p className="text-sm text-red-600">Left {entry.early_departure_minutes} minutes early</p>
                            </div>
                          )}

                          <div className="mt-2 flex gap-2 text-xs">
                            {entry.breakfast_given && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">Breakfast</span>
                            )}
                            {entry.conveyance_given && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Conveyance</span>
                            )}
                            {entry.dinner_given && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">Dinner</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => openEditDialog(entry)}
                          size="sm"
                          variant="outline"
                          className="text-zinc-600 hover:text-zinc-900"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleApproval(entry.id, 'approved')}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleApproval(entry.id, 'rejected')}
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review & Edit Entry</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-4">
              <div className="p-3 bg-zinc-50 rounded">
                <p className="text-sm font-medium">{editingEntry.driver_name}</p>
                <p className="text-xs text-zinc-600">{editingEntry.date}</p>
                <p className="text-xs text-zinc-600">
                  {new Date(editingEntry.in_time).toLocaleTimeString('en-IN')} - 
                  {new Date(editingEntry.out_time).toLocaleTimeString('en-IN')}
                </p>
              </div>

              {editingEntry.details && (
                <div>
                  <Label>Driver Details</Label>
                  <p className="text-sm text-zinc-600 p-2 bg-zinc-50 rounded mt-1">{editingEntry.details}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-overtime">Overtime (minutes)</Label>
                <Input
                  id="edit-overtime"
                  type="number"
                  value={editOvertimeMinutes}
                  onChange={(e) => setEditOvertimeMinutes(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-zinc-500">Modify if needed</p>
              </div>

              {editingEntry.remark_text && (
                <div className="space-y-2">
                  <Label htmlFor="edit-remark">Driver Remark</Label>
                  <Textarea
                    id="edit-remark"
                    value={editRemarkText}
                    onChange={(e) => setEditRemarkText(e.target.value)}
                    rows={2}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="admin-remarks">Admin Remarks</Label>
                <Textarea
                  id="admin-remarks"
                  value={editAdminRemarks}
                  onChange={(e) => setEditAdminRemarks(e.target.value)}
                  placeholder="Add your remarks (optional)"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => handleSaveEdits('approved')}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve with Changes
                </Button>
                <Button
                  onClick={() => handleSaveEdits('rejected')}
                  variant="outline"
                  className="flex-1 text-red-600 hover:text-red-700 border-red-600"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
