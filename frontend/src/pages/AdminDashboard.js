import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { Users, IndianRupee, Calendar, LogOut, Settings as SettingsIcon, FileText, Wallet } from 'lucide-react';

export default function AdminDashboard({ user, onLogout }) {
  const [stats, setStats] = useState(null);
  const [expiringLicenses, setExpiringLicenses] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    fetchExpiringLicenses();
    fetchPendingApprovals();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/stats/dashboard');
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to fetch dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpiringLicenses = async () => {
    try {
      const response = await api.get('/drivers/expiring-licenses');
      setExpiringLicenses(response.data);
    } catch (error) {
      console.error('Failed to fetch expiring licenses');
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const response = await api.get('/duty-entries/pending');
      setPendingApprovals(response.data.length);
    } catch (error) {
      console.error('Failed to fetch pending approvals');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-zinc-950">Taurani Staff Admin</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-600">{user.name}</span>
              <Button
                data-testid="admin-logout-button"
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card data-testid="stat-card-drivers" className="border-zinc-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-600">Active Drivers</CardTitle>
                <Users className="w-5 h-5 text-zinc-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-zinc-950 mono">
                {loading ? '...' : stats?.total_drivers || 0}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-card-payroll" className="border-zinc-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-600">Current Month Payroll</CardTitle>
                <DollarSign className="w-5 h-5 text-zinc-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-zinc-950 mono">
                ₹{loading ? '...' : (stats?.current_month_payroll || 0).toLocaleString('en-IN')}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-card-entries" className="border-zinc-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-600">Today's Entries</CardTitle>
                <Calendar className="w-5 h-5 text-zinc-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-zinc-950 mono">
                {loading ? '...' : stats?.today_entries || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {(expiringLicenses.length > 0 || pendingApprovals > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {pendingApprovals > 0 && (
              <Card className="border-orange-200 bg-orange-50 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-900">Pending Duty Approvals</p>
                      <p className="text-2xl font-semibold text-orange-950 mt-1">{pendingApprovals}</p>
                    </div>
                    <Button onClick={() => navigate('/duty-approvals')} size="sm">
                      Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {expiringLicenses.length > 0 && (
              <Card className="border-red-200 bg-red-50 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-900">Licenses Expiring Soon</p>
                      <p className="text-2xl font-semibold text-red-950 mt-1">{expiringLicenses.length}</p>
                      <p className="text-xs text-red-700 mt-1">
                        {expiringLicenses[0]?.full_name} - {expiringLicenses[0]?.days_until_expiry} days
                      </p>
                    </div>
                    <Button onClick={() => navigate('/drivers')} size="sm">
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                data-testid="nav-drivers-button"
                onClick={() => navigate('/drivers')}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 hover:border-zinc-300"
              >
                <Users className="w-6 h-6" />
                <span className="text-sm font-medium">Manage Drivers</span>
              </Button>

              <Button
                data-testid="nav-duty-records-button"
                onClick={() => navigate('/duty-records')}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 hover:border-zinc-300"
              >
                <Calendar className="w-6 h-6" />
                <span className="text-sm font-medium">Duty Records</span>
              </Button>

              <Button
                data-testid="nav-expenses-button"
                onClick={() => navigate('/expenses')}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 hover:border-zinc-300"
              >
                <Wallet className="w-6 h-6" />
                <span className="text-sm font-medium">Expenses</span>
              </Button>

              <Button
                data-testid="nav-approvals-button"
                onClick={() => navigate('/duty-approvals')}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 hover:border-zinc-300 relative"
              >
                {pendingApprovals > 0 && (
                  <span className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {pendingApprovals}
                  </span>
                )}
                <FileText className="w-6 h-6" />
                <span className="text-sm font-medium">Approvals</span>
              </Button>

              <Button
                data-testid="nav-advances-button"
                onClick={() => navigate('/advances')}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 hover:border-zinc-300"
              >
                <DollarSign className="w-6 h-6" />
                <span className="text-sm font-medium">Advances</span>
              </Button>

              <Button
                data-testid="nav-bonuses-button"
                onClick={() => navigate('/bonuses')}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 hover:border-zinc-300"
              >
                <FileText className="w-6 h-6" />
                <span className="text-sm font-medium">Bonuses</span>
              </Button>

              <Button
                data-testid="nav-leaves-button"
                onClick={() => navigate('/leaves')}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 hover:border-zinc-300"
              >
                <Calendar className="w-6 h-6" />
                <span className="text-sm font-medium">Leaves</span>
              </Button>

              <Button
                data-testid="nav-settings-button"
                onClick={() => navigate('/settings')}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 hover:border-zinc-300"
              >
                <SettingsIcon className="w-6 h-6" />
                <span className="text-sm font-medium">Settings</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
