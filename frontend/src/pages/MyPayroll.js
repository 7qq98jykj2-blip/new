import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { api } from '../utils/api';
import { ArrowLeft, DollarSign } from 'lucide-react';

export default function MyPayroll({ user }) {
  const navigate = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [payroll, setPayroll] = useState(null);
  const [driverId, setDriverId] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDriver();
  }, []);

  useEffect(() => {
    if (driverId) {
      fetchPayroll();
      fetchDriverInfo();
    }
  }, [driverId, year, month]);

  const fetchDriver = async () => {
    const res = await api.get('/drivers');
    const driver = res.data.find(d => d.phone === user.mobile) || res.data[0];
    setDriverId(driver.id);
  };

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payroll/${driverId}/${year}/${month}`);
      setPayroll(res.data);
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
          <Button onClick={() => navigate('/driver')} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-semibold text-emerald-950">My Payroll</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex gap-4 mb-6">
          <Button onClick={() => navigate('/driver/financial-year')} variant="outline">
            View Financial Year Statement
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Monthly Earnings</CardTitle>
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
            ) : !payroll ? (
              <p className="text-center py-8 text-zinc-500">No payroll data for this month</p>
            ) : (
              <div>
                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 mx-auto mb-4 text-emerald-600" />
                  <h2 className="text-2xl font-semibold text-emerald-950 mb-2">
                    {new Date(year, month-1).toLocaleString('en', {month: 'long', year: 'numeric'})}
                  </h2>
                  <div className="text-5xl font-bold text-emerald-600 mb-4">
                    ₹{payroll.net_pay.toLocaleString('en-IN')}
                  </div>
                  <p className="text-zinc-600">Final Amount Paid</p>
                </div>
                
                {driverInfo && (
                  <div className="flex justify-center mt-6">
                    <Button
                      onClick={handleDownloadPDF}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Salary Slip
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
ssName="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Salary Slip
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
