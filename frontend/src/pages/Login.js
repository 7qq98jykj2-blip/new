import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { API_BASE } from '../utils/api';
import { Truck } from 'lucide-react';

export default function Login({ onLogin }) {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        mobile,
        password,
      });

      onLogin(response.data.user, response.data.token);
      toast.success('Login successful');
      
      if (response.data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/driver');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-zinc-900 rounded-md flex items-center justify-center mb-3">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Taurani Staff</h1>
          <p className="text-sm text-zinc-600 mt-1">Driver Duty & Payroll Management</p>
        </div>

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-medium">Sign In</CardTitle>
            <CardDescription>Enter your mobile number and password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mobile" data-testid="login-mobile-label">Mobile Number</Label>
                <Input
                  id="mobile"
                  data-testid="login-mobile-input"
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" data-testid="login-password-label">Password</Label>
                <Input
                  id="password"
                  data-testid="login-password-input"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <Button
                data-testid="login-submit-button"
                type="submit"
                className="w-full h-12 bg-zinc-900 hover:bg-zinc-800"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
