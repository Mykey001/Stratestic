"""
Test script for Stratestic Flask Backend
Tests all API endpoints to ensure proper functionality.
"""

import requests
import json
import time

BASE_URL = 'http://localhost:5000/api'

def print_section(title):
    """Print a formatted section header."""
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70 + "\n")

def test_health_check():
    """Test the health check endpoint."""
    print_section("Testing Health Check Endpoint")
    
    try:
        response = requests.get(f'{BASE_URL}/health')
        result = response.json()
        
        print("✅ Health check successful!")
        print(f"   Status: {result.get('status')}")
        print(f"   Version: {result.get('version')}")
        print(f"   Timestamp: {result.get('timestamp')}")
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_list_strategies():
    """Test the list strategies endpoint."""
    print_section("Testing List Strategies Endpoint")
    
    try:
        response = requests.get(f'{BASE_URL}/strategies')
        result = response.json()
        
        print(f"✅ Found {result.get('count')} strategies:")
        for strategy_id, info in result.get('strategies', {}).items():
            print(f"\n   • {strategy_id}")
            print(f"     Name: {info.get('name')}")
            print(f"     Description: {info.get('description')}")
            print(f"     Parameters: {', '.join(info.get('parameters', []))}")
        return True
    except Exception as e:
        print(f"❌ List strategies failed: {e}")
        return False

def test_backtest():
    """Test the backtest endpoint."""
    print_section("Testing Backtest Endpoint")
    
    test_params = {
        'strategy': 'moving_average_crossover',
        'symbol': 'BTCUSDT',
        'capital': 10000,
        'commission': 0.001,
        'leverage': 1,
        'backtester': 'vectorized',
        'strategy_params': {
            'sma_s': 20,
            'sma_l': 150
        }
    }
    
    print("Request parameters:")
    print(json.dumps(test_params, indent=2))
    
    try:
        print("\n⏳ Running backtest (this may take a few seconds)...")
        start_time = time.time()
        
        response = requests.post(f'{BASE_URL}/backtest', json=test_params)
        result = response.json()
        
        elapsed = time.time() - start_time
        
        if result.get('success'):
            print(f"\n✅ Backtest completed in {elapsed:.2f}s!")
            
            results = result.get('results', {})
            print("\nResults:")
            print(f"   Total Return: {results.get('total_return', 'N/A')}%")
            print(f"   Sharpe Ratio: {results.get('sharpe_ratio', 'N/A')}")
            print(f"   Max Drawdown: {results.get('max_drawdown_pct', 'N/A')}%")
            print(f"   Total Trades: {results.get('total_trades', 'N/A')}")
            print(f"   Win Rate: {results.get('win_rate_pct', 'N/A')}%")
            
            equity_curve = result.get('equity_curve', [])
            print(f"\n   Equity Curve Length: {len(equity_curve)} points")
            print(f"   Final Equity: ${equity_curve[-1] if equity_curve else 'N/A'}")
            
            return True
        else:
            print(f"❌ Backtest failed: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"❌ Backtest failed: {e}")
        return False

def test_backtest_iterative():
    """Test the backtest endpoint with iterative backtester."""
    print_section("Testing Iterative Backtest")
    
    test_params = {
        'strategy': 'macd_trend',
        'symbol': 'ETHUSDT',
        'capital': 5000,
        'commission': 0.002,
        'leverage': 2,
        'backtester': 'iterative',
        'strategy_params': {
            'fast': 12,
            'slow': 26,
            'signal': 9
        }
    }
    
    print("Request parameters:")
    print(json.dumps(test_params, indent=2))
    
    try:
        print("\n⏳ Running iterative backtest...")
        start_time = time.time()
        
        response = requests.post(f'{BASE_URL}/backtest', json=test_params)
        result = response.json()
        
        elapsed = time.time() - start_time
        
        if result.get('success'):
            print(f"\n✅ Iterative backtest completed in {elapsed:.2f}s!")
            
            results = result.get('results', {})
            print("\nResults:")
            print(f"   Total Return: {results.get('total_return', 'N/A')}%")
            print(f"   Sharpe Ratio: {results.get('sharpe_ratio', 'N/A')}")
            
            return True
        else:
            print(f"❌ Iterative backtest failed: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"❌ Iterative backtest failed: {e}")
        return False

def test_optimization():
    """Test the optimization endpoint."""
    print_section("Testing Optimization Endpoint (Brute Force)")
    
    test_params = {
        'strategy': 'moving_average_crossover',
        'symbol': 'BTCUSDT',
        'capital': 10000,
        'commission': 0.001,
        'leverage': 1,
        'param_ranges': {
            'sma_s': {'min': 10, 'max': 30, 'step': 10},
            'sma_l': {'min': 100, 'max': 150, 'step': 25}
        },
        'optimizer': 'brute_force',
        'metric': 'Sharpe Ratio'
    }
    
    print("Request parameters:")
    print(json.dumps(test_params, indent=2))
    
    try:
        print("\n⏳ Running optimization (this may take longer)...")
        start_time = time.time()
        
        response = requests.post(f'{BASE_URL}/optimize', json=test_params, timeout=120)
        result = response.json()
        
        elapsed = time.time() - start_time
        
        if result.get('success'):
            print(f"\n✅ Optimization completed in {elapsed:.2f}s!")
            
            print(f"\nBest Parameters: {result.get('best_params')}")
            print(f"Best {result.get('metric_name')}: {result.get('best_metric'):.2f}")
            
            return True
        else:
            print(f"❌ Optimization failed: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"❌ Optimization failed: {e}")
        return False

def test_validation():
    """Test the strategy validation endpoint."""
    print_section("Testing Strategy Validation Endpoint")
    
    valid_strategy = """
from stratestic.strategies import StrategyMixin
import numpy as np

class TestStrategy(StrategyMixin):
    '''Test strategy for validation.'''
    
    def __init__(self, period=20, **kwargs):
        self._period = period
        self.params = {'period': lambda x: int(x)}
        super().__init__(**kwargs)
    
    def update_data(self, data):
        data = super().update_data(data)
        data['sma'] = data['close'].rolling(self._period).mean()
        return data
    
    def calculate_positions(self, data):
        data['side'] = np.where(data['close'] > data['sma'], 1, -1)
        return data
    
    def get_signal(self, row):
        return 1 if row['close'] > row['sma'] else -1
"""
    
    try:
        print("⏳ Validating strategy...")
        
        response = requests.post(f'{BASE_URL}/validate', json={'code': valid_strategy})
        result = response.json()
        
        if result.get('success'):
            print("✅ Validation successful!")
            
            strategies = result.get('strategies', [])
            for strat in strategies:
                print(f"\n   Strategy: {strat.get('name')}")
                print(f"   Valid: {strat.get('is_valid')}")
                
                if strat.get('errors'):
                    print(f"   Errors: {strat.get('errors')}")
                else:
                    print("   ✅ No errors found")
                    
                info = strat.get('info', {})
                print(f"   Parameters: {info.get('parameters')}")
                print(f"   Methods: {info.get('methods')}")
            
            return True
        else:
            print(f"❌ Validation failed: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"❌ Validation failed: {e}")
        return False

def test_mql5_conversion():
    """Test the MQL5 conversion endpoint."""
    print_section("Testing MQL5 Conversion Endpoint")
    
    mql5_code = """
//+------------------------------------------------------------------+
//|                                          TestStrategy.mq5        |
//+------------------------------------------------------------------+
input int MAPeriod = 20;
input double RiskPercent = 1.0;

int MAHandle;

int OnInit()
{
   MAHandle = iMA(_Symbol, _Period, MAPeriod, 0, MODE_SMA, PRICE_CLOSE);
   return(INIT_SUCCEEDED);
}

void OnTick()
{
   double ma[];
   CopyBuffer(MAHandle, 0, 0, 1, ma);
   
   if(Close[0] > ma[0]) {
      Trade.Buy(RiskPercent);
   } else {
      Trade.Sell(RiskPercent);
   }
}
"""
    
    try:
        print("⏳ Converting MQL5 code to Python...")
        
        response = requests.post(f'{BASE_URL}/convert/mql5', json={'code': mql5_code})
        result = response.json()
        
        if result.get('success'):
            print("✅ Conversion successful!")
            
            print("\nGenerated Python Code Preview:")
            python_code = result.get('python_code', '')
            lines = python_code.split('\n')
            for i, line in enumerate(lines[:15], 1):
                print(f"   {i:2d}: {line}")
            
            if len(lines) > 15:
                print(f"   ... ({len(lines) - 15} more lines)")
            
            print("\nConversion Logs:")
            for log in result.get('logs', []):
                print(f"   {log}")
            
            return True
        else:
            print(f"❌ Conversion failed: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"❌ Conversion failed: {e}")
        return False

def run_all_tests():
    """Run all tests and print summary."""
    print("\n" + "="*70)
    print("  STRATESTIC FLASK BACKEND TEST SUITE")
    print("="*70)
    print("\nTesting backend at:", BASE_URL)
    print("Make sure the Flask server is running (python app.py)\n")
    
    tests = [
        ("Health Check", test_health_check),
        ("List Strategies", test_list_strategies),
        ("Backtest (Vectorized)", test_backtest),
        ("Backtest (Iterative)", test_backtest_iterative),
        ("Optimization", test_optimization),
        ("Strategy Validation", test_validation),
        ("MQL5 Conversion", test_mql5_conversion)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            success = test_func()
            results.append((test_name, success))
        except KeyboardInterrupt:
            print("\n\n⚠️ Tests interrupted by user")
            break
        except Exception as e:
            print(f"\n❌ Unexpected error in {test_name}: {e}")
            results.append((test_name, False))
    
    # Print summary
    print_section("TEST SUMMARY")
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"   {status}  {test_name}")
    
    print(f"\n   Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Backend is working correctly.")
    else:
        print(f"\n⚠️ {total - passed} test(s) failed. Check the output above for details.")
    
    print("\n" + "="*70 + "\n")

if __name__ == '__main__':
    run_all_tests()
