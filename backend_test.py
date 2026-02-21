import requests
import json
import sys
from datetime import datetime, timedelta

class DriverPayrollAPITester:
    def __init__(self, base_url="https://fleet-pay-manager-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.driver_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_driver_id = None
        self.created_duty_entry_id = None
        self.created_expense_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.text else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self, mobile, password, user_type):
        """Test login and get token"""
        success, response = self.run_test(
            f"Login ({user_type})",
            "POST",
            "auth/login",
            200,
            data={"mobile": mobile, "password": password}
        )
        if success and 'token' in response:
            if user_type == 'admin':
                self.admin_token = response['token']
            else:
                self.driver_token = response['token']
            return True, response['user']
        return False, {}

    def get_auth_header(self, user_type='admin'):
        """Get authorization header"""
        token = self.admin_token if user_type == 'admin' else self.driver_token
        return {'Authorization': f'Bearer {token}'} if token else {}

    def test_create_driver(self):
        """Test driver creation"""
        driver_data = {
            "full_name": "Test Driver",
            "aadhaar_number": "123456789012",
            "address": "123 Test Street",
            "phone": "9876543210",
            "job_start_date": "2024-01-01",
            "base_salary": 20000.0,
            "standard_hours": 8.0
        }
        
        success, response = self.run_test(
            "Create Driver",
            "POST",
            "drivers",
            200,
            data=driver_data,
            headers=self.get_auth_header('admin')
        )
        
        if success and 'id' in response:
            self.created_driver_id = response['id']
            print(f"Created driver ID: {self.created_driver_id}")
        
        return success

    def test_list_drivers(self):
        """Test driver listing"""
        success, response = self.run_test(
            "List Drivers",
            "GET",
            "drivers",
            200,
            headers=self.get_auth_header('admin')
        )
        return success

    def test_create_duty_entry(self):
        """Test duty entry creation"""
        if not self.created_driver_id:
            print("❌ Cannot create duty entry - no driver ID available")
            return False
            
        today = datetime.now().strftime('%Y-%m-%d')
        in_time = f"{today}T09:00:00"
        out_time = f"{today}T19:30:00"  # 10.5 hours - should trigger overtime and food allowance
        
        duty_data = {
            "driver_id": self.created_driver_id,
            "date": today,
            "in_time": in_time,
            "out_time": out_time
        }
        
        success, response = self.run_test(
            "Create Duty Entry",
            "POST",
            "duty-entries",
            201,
            data=duty_data,
            headers=self.get_auth_header('admin')
        )
        
        if success and 'id' in response:
            self.created_duty_entry_id = response['id']
            # Check overtime calculation (10.5 - 8 = 2.5 hours = 150 minutes, rounded up to nearest 15min = 150)
            if response.get('overtime_minutes') == 150:
                print("✅ Overtime calculation correct: 150 minutes")
            else:
                print(f"⚠️ Overtime calculation issue: got {response.get('overtime_minutes')} minutes, expected 150")
                
            # Check food allowance (should be True for 10.5 hours > 8 + 2 = 10 hours)
            if response.get('food_allowance_given') == True:
                print("✅ Food allowance triggered correctly")
            else:
                print(f"⚠️ Food allowance issue: got {response.get('food_allowance_given')}, expected True")
        
        return success

    def test_create_expense(self):
        """Test expense creation"""
        if not self.created_driver_id:
            print("❌ Cannot create expense - no driver ID available")
            return False
            
        today = datetime.now().strftime('%Y-%m-%d')
        expense_data = {
            "driver_id": self.created_driver_id,
            "date": today,
            "amount": 500.0,
            "description": "Fuel expense",
            "category": "fuel"
        }
        
        success, response = self.run_test(
            "Create Expense",
            "POST",
            "expenses",
            201,
            data=expense_data,
            headers=self.get_auth_header('admin')
        )
        
        if success and 'id' in response:
            self.created_expense_id = response['id']
        
        return success

    def test_payroll_calculation(self):
        """Test payroll calculation"""
        if not self.created_driver_id:
            print("❌ Cannot calculate payroll - no driver ID available")
            return False
            
        now = datetime.now()
        year = now.year
        month = now.month
        
        success, response = self.run_test(
            "Calculate Payroll",
            "GET",
            f"payroll/{self.created_driver_id}/{year}/{month}",
            200,
            headers=self.get_auth_header('admin')
        )
        
        if success:
            # Check payroll calculation
            base_salary = response.get('base_salary', 0)
            overtime_amount = response.get('total_overtime_amount', 0)
            food_allowances = response.get('total_food_allowances', 0)
            expenses = response.get('total_expenses', 0)
            net_pay = response.get('net_pay', 0)
            
            print(f"Payroll Details:")
            print(f"  Base Salary: ₹{base_salary}")
            print(f"  Overtime: ₹{overtime_amount}")
            print(f"  Food Allowances: ₹{food_allowances}")
            print(f"  Expenses: ₹{expenses}")
            print(f"  Net Pay: ₹{net_pay}")
            
            # Expected: 20000 + (150/15)*25 + 100 + 500 = 20000 + 250 + 100 + 500 = 20850
            expected_net = base_salary + overtime_amount + food_allowances + expenses
            if abs(net_pay - expected_net) < 0.01:
                print("✅ Payroll calculation appears correct")
            else:
                print(f"⚠️ Payroll calculation issue: expected ~₹{expected_net}, got ₹{net_pay}")
        
        return success

    def test_settings(self):
        """Test settings endpoints"""
        # Get settings
        success, response = self.run_test(
            "Get Settings",
            "GET",
            "settings",
            200,
            headers=self.get_auth_header('admin')
        )
        
        if not success:
            return False
        
        # Update settings
        update_data = {
            "overtime_per_15min": 30.0,
            "food_allowance_amount": 120.0
        }
        
        success, response = self.run_test(
            "Update Settings",
            "PUT",
            "settings",
            200,
            data=update_data,
            headers=self.get_auth_header('admin')
        )
        
        if success:
            if response.get('overtime_per_15min') == 30.0 and response.get('food_allowance_amount') == 120.0:
                print("✅ Settings updated correctly")
            else:
                print("⚠️ Settings update issue")
        
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "stats/dashboard",
            200,
            headers=self.get_auth_header('admin')
        )
        
        if success:
            stats = ['total_drivers', 'current_month_payroll', 'today_entries']
            for stat in stats:
                if stat in response:
                    print(f"  {stat}: {response[stat]}")
                else:
                    print(f"⚠️ Missing stat: {stat}")
        
        return success

    def test_filtering(self):
        """Test filtering functionality"""
        if not self.created_driver_id:
            return False
            
        now = datetime.now()
        
        # Test duty entries filtering
        success, response = self.run_test(
            "Filter Duty Entries by Month",
            "GET",
            f"duty-entries?driver_id={self.created_driver_id}&month={now.month}&year={now.year}",
            200,
            headers=self.get_auth_header('admin')
        )
        
        if not success:
            return False
        
        # Test expenses filtering
        success, response = self.run_test(
            "Filter Expenses by Month",
            "GET",
            f"expenses?driver_id={self.created_driver_id}&month={now.month}&year={now.year}",
            200,
            headers=self.get_auth_header('admin')
        )
        
        return success

def main():
    print("🚀 Starting Driver Payroll API Tests...")
    print("=" * 50)
    
    tester = DriverPayrollAPITester()
    
    # Test admin login
    print("\n📝 AUTHENTICATION TESTS")
    print("-" * 30)
    
    admin_login_success, admin_user = tester.test_login("9999999999", "admin123", "admin")
    if not admin_login_success:
        print("❌ Admin login failed, stopping tests")
        return 1

    # Test driver login
    driver_login_success, driver_user = tester.test_login("8888888888", "driver123", "driver")
    if not driver_login_success:
        print("❌ Driver login failed")
    else:
        print("✅ Both user types can login")

    # Test driver management
    print("\n👥 DRIVER MANAGEMENT TESTS")
    print("-" * 30)
    
    if not tester.test_create_driver():
        print("❌ Driver creation failed")
        return 1

    if not tester.test_list_drivers():
        print("❌ Driver listing failed")

    # Test duty entries
    print("\n⏰ DUTY ENTRY TESTS")
    print("-" * 30)
    
    if not tester.test_create_duty_entry():
        print("❌ Duty entry creation failed")

    # Test expenses
    print("\n💰 EXPENSE TESTS")
    print("-" * 30)
    
    if not tester.test_create_expense():
        print("❌ Expense creation failed")

    # Test payroll calculation
    print("\n📊 PAYROLL CALCULATION TESTS")
    print("-" * 30)
    
    if not tester.test_payroll_calculation():
        print("❌ Payroll calculation failed")

    # Test settings
    print("\n⚙️ SETTINGS TESTS")
    print("-" * 30)
    
    if not tester.test_settings():
        print("❌ Settings tests failed")

    # Test dashboard stats
    print("\n📈 DASHBOARD TESTS")
    print("-" * 30)
    
    if not tester.test_dashboard_stats():
        print("❌ Dashboard stats failed")

    # Test filtering
    print("\n🔍 FILTERING TESTS")
    print("-" * 30)
    
    if not tester.test_filtering():
        print("❌ Filtering tests failed")

    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())