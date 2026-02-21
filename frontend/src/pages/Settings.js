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
    food_allowance_amount: 100,
    food_trigger_hours_after_standard: 2,
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
            <h1 className="text-xl font-semibold text-zinc-950">Settings</h1>
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
              <div className="space-y-2">
                <Label htmlFor="overtime_per_15min" data-testid="overtime-rate-label">
                  Overtime Rate per 15 Minutes (₹)
                </Label>
                <Input
                  id="overtime_per_15min"
                  data-testid="overtime-rate-input"
                  type="number"
                  step="0.01"
                  value={settings.overtime_per_15min}
                  onChange={(e) => setSettings({ ...settings, overtime_per_15min: parseFloat(e.target.value) })}
                  required
                  className="h-12"
                />
                <p className="text-xs text-zinc-500">Amount paid for every 15 minutes of overtime (rounded up)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="food_allowance_amount" data-testid="food-allowance-label">
                  Food Allowance Amount (₹)
                </Label>
                <Input
                  id="food_allowance_amount"
                  data-testid="food-allowance-input"
                  type="number"
                  step="0.01"
                  value={settings.food_allowance_amount}
                  onChange={(e) => setSettings({ ...settings, food_allowance_amount: parseFloat(e.target.value) })}
                  required
                  className="h-12"
                />
                <p className="text-xs text-zinc-500">Fixed amount provided as food allowance per eligible duty</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="food_trigger_hours_after_standard" data-testid="food-trigger-label">
                  Food Allowance Trigger (Hours After Standard Duty)
                </Label>
                <Input
                  id="food_trigger_hours_after_standard"
                  data-testid="food-trigger-input"
                  type="number"
                  step="0.5"
                  value={settings.food_trigger_hours_after_standard}
                  onChange={(e) => setSettings({ ...settings, food_trigger_hours_after_standard: parseFloat(e.target.value) })}
                  required
                  className="h-12"
                />
                <p className="text-xs text-zinc-500">
                  Food allowance is given after working this many hours beyond standard duty hours<br />
                  Example: If standard duty is 10h and trigger is 2h, food allowance applies after 12h total work
                </p>
              </div>

              <Button
                data-testid="save-settings-button"
                type="submit"
                className="w-full h-12 bg-zinc-900 hover:bg-zinc-800"
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
