import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { ArrowLeft, Plus } from 'lucide-react';

export default function MiscExpenses({ user }) {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [driverId, setDriverId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'parking',
    amount: '',
    description: ''
  });

  useEffect(() => {
    fetchDriver();
  }, []);

  useEffect(() => {
    if (driverId) fetchExpenses();
  }, [driverId]);

  const fetchDriver = async () => {
    const res = await api.get('/drivers');
    const driver = res.data.find(d => d.phone === user.mobile) || res.data[0];
    setDriverId(driver.id);
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/misc-expenses?driver_id=${driverId}`);
      setExpenses(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.category.toLowerCase() === 'travel' || formData.category.toLowerCase() === 'food') {
      toast.error('Travel and Food expenses must use the existing expense system');
      return;
    }

    try {
      await api.post('/misc-expenses', {
        driver_id: driverId,
        date: formData.date,
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description
      });
      
      toast.success('Expense submitted successfully');
      setShowForm(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        category: 'parking',
        amount: '',
        description: ''
      });
      fetchExpenses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit expense');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${styles[status] || styles.pending}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200 sticky top-0 z-10 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/driver')} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-semibold text-emerald-950">Miscellaneous Expenses</h1>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Submit New Expense</CardTitle>
              <p className="text-sm text-zinc-600 mt-2">
                For Parking, Tolls, and other miscellaneous work-related charges.
                <br />
                <span className="text-red-600 font-medium">Note: Travel and Food expenses use separate systems.</span>
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date</Label>
                    <Input 
                      type="date" 
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full border border-zinc-300 rounded-md px-3 py-2"
                      required
                    >
                      <option value="parking">Parking</option>
                      <option value="tolls">Tolls</option>
                      <option value="cleaning">Vehicle Cleaning</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <Label>Amount (₹)</Label>
                  <Input 
                    type="number" 
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    placeholder="Enter amount"
                    required
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Provide details about this expense"
                    rows={3}
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                    Submit Expense
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>My Expense Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8">Loading...</p>
            ) : expenses.length === 0 ? (
              <p className="text-center py-8 text-zinc-500">No expenses submitted yet</p>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div key={expense.id} className="border border-zinc-200 rounded-md p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-emerald-950">{expense.category.toUpperCase()}</p>
                        <p className="text-sm text-zinc-600">{expense.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-emerald-950">₹{expense.amount.toLocaleString('en-IN')}</p>
                        {getStatusBadge(expense.status)}
                      </div>
                    </div>
                    <p className="text-sm text-zinc-700 mt-2">{expense.description}</p>
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
