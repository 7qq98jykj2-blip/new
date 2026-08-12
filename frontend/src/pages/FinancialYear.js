import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { api } from '../utils/api';
import { ArrowLeft } from 'lucide-react';

export default function FinancialYear({ user }) {
  const navigate = useNavigate();
  const [fyYear, setFyYear] = useState(2026);
  const [statement, setStatement] = useState(null);
  const [driverId, setDriverId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDriver();
  }, []);

  useEffect(() => {
    if (driverId) fetchStatement();
  }, [driverId, fyYear]);

  const fetchDriver = async () => {
    const res = await api.get('/drivers');
    const driver = res.data.find(d => d.phone === user.mobile) || res.data[0];
    setDriverId(driver.id);
  };

  const fetchStatement = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/drivers/${driverId}/financial-year/${fyYear}`);
      setStatement(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200 sticky top-0 z-10 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button onClick={() => navigate('/driver/payroll')} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-semibold text-emerald-950">Financial Year Statement</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>FY {fyYear}-{String(fyYear+1).slice(-2)}</CardTitle>
              <select value={fyYear} onChange={(e) => setFyYear(parseInt(e.target.value))} className="border rounded px-3 py-2">
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>FY {y}-{String(y+1).slice(-2)}</option>
                ))}
              </select>
            </div>
            <p className="text-sm text-zinc-600">
              {statement?.start_date} to {statement?.end_date}
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8">Loading...</p>
            ) : !statement ? (
              <p className="text-center py-8 text-zinc-500">No data available</p>
            ) : (
              <div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Month</th>
                      <th className="text-right py-3 px-4">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.months.map((m, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-3 px-4">{m.month}</td>
                        <td className="py-3 px-4 text-right font-mono">
                          ₹{m.amount_paid.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold">
                      <td className="py-4 px-4">TOTAL PAID DURING FINANCIAL YEAR</td>
                      <td className="py-4 px-4 text-right font-mono text-emerald-600 text-lg">
                        ₹{statement.total_paid.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
