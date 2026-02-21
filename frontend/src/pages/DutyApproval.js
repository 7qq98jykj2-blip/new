import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { ArrowLeft, Check, X } from 'lucide-react';

export default function DutyApproval({ user, onLogout }) {
  const [pendingEntries, setPendingEntries] = useState([]);
  const [loading, setLoading] = useState(true);
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
            <h1 className="text-xl font-semibold text-zinc-950">Duty Approvals</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-medium">
              Pending Approvals ({pendingEntries.length})
            </CardTitle>
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
                    className="p-4 border border-zinc-200 rounded-md"
                  >
                    <div className="flex justify-between items-start">
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
                              <span className="mono">{entry.overtime_minutes}m</span>
                            </span>
                          )}
                        </div>
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
                      <div className="flex gap-2 ml-4">
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
    </div>
  );
}
