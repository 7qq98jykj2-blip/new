import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';

export default function Settings({ user, onLogout }) {
  const [settings, setSettings] = useState({
    overtime_per_15min: 25,
    conveyance_amount: 75,
    dinner_amount: 200,
    breakfast_amount: 100,
    conveyance_trigger_before_time: '08:00',
    conveyance_trigger_after_time: '23:30',
    dinner_trigger_after_time: '23:00',
    breakfast_trigger_before_time: '07:30',
    grace_period_minutes: 15,
    working_days_per_week: 6,
    days_in_month: 30,
    weekly_off_day: 'sunday',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      setSettings(response.data);
    } catch (error) {
      toast.error('Failed to fetch settings');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/settings', settings);
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Button
              data-testid="back-button"
              onClick={() => navigate('/admin')}
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-semibold text-emerald-950">Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card data-testid="settings-card" className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-medium">Payroll Configuration</CardTitle>
            <CardDescription>Configure overtime rates and allowances</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="overtime_per_15min">Overtime Rate per 15 Min (₹)</Label>
                  <Input
                    id="overtime_per_15min"
                    type="number"
                    step="0.01"
                    value={settings.overtime_per_15min}
                    onChange={(e) => setSettings({ ...settings, overtime_per_15min: parseFloat(e.target.value) })}
                    required
                    className="h-12"
                  />
                  <p className="text-xs text-zinc-500">Amount per 15 minutes (rounded up)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grace_period_minutes">Grace Period (Minutes)</Label>
                  <Input
                    id="grace_period_minutes"
                    type="number"
                    value={settings.grace_period_minutes}
                    onChange={(e) => setSettings({ ...settings, grace_period_minutes: parseInt(e.target.value) })}
                    required
                    className="h-12"
                  />
                  <p className="text-xs text-zinc-500">Minutes to ignore before overtime calculation</p>
                </div>
              </div>

              <div className="border-t border-zinc-200 pt-6">
                <h3 className="text-lg font-medium mb-4">Allowances</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="breakfast_amount">Breakfast (₹)</Label>
                    <Input
                      id="breakfast_amount"
                      type="number"
                      step="0.01"
                      value={settings.breakfast_amount}
                      onChange={(e) => setSettings({ ...settings, breakfast_amount: parseFloat(e.target.value) })}
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="conveyance_amount">Conveyance (₹)</Label>
                    <Input
                      id="conveyance_amount"
                      type="number"
                      step="0.01"
                      value={settings.conveyance_amount}
                      onChange={(e) => setSettings({ ...settings, conveyance_amount: parseFloat(e.target.value) })}
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dinner_amount">Dinner (₹)</Label>
                    <Input
                      id="dinner_amount"
                      type="number"
                      step="0.01"
                      value={settings.dinner_amount}
                      onChange={(e) => setSettings({ ...settings, dinner_amount: parseFloat(e.target.value) })}
                      required
                      className="h-12"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-200 pt-6">
                <h3 className="text-lg font-medium mb-4">Allowance Triggers</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="breakfast_trigger_before_time">Breakfast Before</Label>
                    <Input
                      id="breakfast_trigger_before_time"
                      type="time"
                      value={settings.breakfast_trigger_before_time}
                      onChange={(e) => setSettings({ ...settings, breakfast_trigger_before_time: e.target.value })}
                      required
                      className="h-12"
                    />
                    <p className="text-xs text-zinc-500">Give breakfast if in-time before this</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="conveyance_trigger_before_time">Conveyance Before</Label>
                    <Input
                      id="conveyance_trigger_before_time"
                      type="time"
                      value={settings.conveyance_trigger_before_time}
                      onChange={(e) => setSettings({ ...settings, conveyance_trigger_before_time: e.target.value })}
                      required
                      className="h-12"
                    />
                    <p className="text-xs text-zinc-500">Give conveyance if in-time before this</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="conveyance_trigger_after_time">Conveyance After</Label>
                    <Input
                      id="conveyance_trigger_after_time"
                      type="time"
                      value={settings.conveyance_trigger_after_time}
                      onChange={(e) => setSettings({ ...settings, conveyance_trigger_after_time: e.target.value })}
                      required
                      className="h-12"
                    />
                    <p className="text-xs text-zinc-500">Give conveyance if out-time after this</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dinner_trigger_after_time">Dinner After</Label>
                    <Input
                      id="dinner_trigger_after_time"
                      type="time"
                      value={settings.dinner_trigger_after_time}
                      onChange={(e) => setSettings({ ...settings, dinner_trigger_after_time: e.target.value })}
                      required
                      className="h-12"
                    />
                    <p className="text-xs text-zinc-500">Give dinner if out-time after this</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-200 pt-6">
                <h3 className="text-lg font-medium mb-4">Leave Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="working_days_per_week">Working Days per Week</Label>
                    <Input
                      id="working_days_per_week"
                      type="number"
                      value={settings.working_days_per_week}
                      onChange={(e) => setSettings({ ...settings, working_days_per_week: parseInt(e.target.value) })}
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="days_in_month">Days in Month (for calculation)</Label>
                    <Input
                      id="days_in_month"
                      type="number"
                      value={settings.days_in_month}
                      onChange={(e) => setSettings({ ...settings, days_in_month: parseInt(e.target.value) })}
                      required
                      className="h-12"
                    />
                  </div>
                </div>
              </div>

              {/* NEW: Weekly Off Configuration */}
              <div className="pt-6 border-t">
                <h3 className="text-lg font-medium mb-4">Weekly Off Configuration</h3>
                <div className="space-y-2">
                  <Label>Company Weekly Off Day</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="weekly_off_day"
                        value="saturday"
                        checked={settings.weekly_off_day === 'saturday'}
                        onChange={(e) => setSettings({ ...settings, weekly_off_day: e.target.value })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Saturday</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="weekly_off_day"
                        value="sunday"
                        checked={settings.weekly_off_day === 'sunday'}
                        onChange={(e) => setSettings({ ...settings, weekly_off_day: e.target.value })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Sunday</span>
                    </label>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">
                    Selected day will automatically be treated as weekly off for all drivers. No duty-day deduction will be made.
                  </p>
                </div>
              </div>

              <Button
                data-testid="save-settings-button"
                type="submit"
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
                disabled={loading}
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Settings'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
