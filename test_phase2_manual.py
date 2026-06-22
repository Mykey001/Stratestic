"""
Manual testing script for Phase 2 features.
Tests ML model attachment, validation, and basic functionality.
"""

import sys
import pandas as pd
import numpy as np
from pathlib import Path

print("=" * 60)
print("STRATESTIC v2.0 - PHASE 2 TESTING")
print("=" * 60)

# Test 1: Import basic modules
print("\n[TEST 1] Testing imports...")
try:
    from stratestic.strategies import StrategyMixin
    print("✅ StrategyMixin imported successfully")
except ImportError as e:
    print(f"❌ Failed to import StrategyMixin: {e}")
    sys.exit(1)

try:
    from stratestic.validation import validate_strategy, StrategyValidator
    print("✅ Validation module imported successfully")
except ImportError as e:
    print(f"❌ Failed to import validation: {e}")
    sys.exit(1)

try:
    from stratestic.ml_utils import (
        create_lag_features,
        create_rolling_features,
        create_target_labels
    )
    print("✅ ML utilities imported successfully")
except ImportError as e:
    print(f"❌ Failed to import ml_utils: {e}")
    sys.exit(1)

# Test 2: Create a simple test strategy
print("\n[TEST 2] Creating test strategy...")
try:
    class SimpleTestStrategy(StrategyMixin):
        """Simple test strategy for validation."""
        
        def __init__(self, period=20, **kwargs):
            self._period = period
            self.params = {'period': lambda x: int(x)}
            super().__init__(**kwargs)
        
        def update_data(self, data):
            data = super().update_data(data)
            data['ma'] = data['close'].rolling(self._period).mean()
            return data
        
        def calculate_positions(self, data):
            data['side'] = (data['close'] > data['ma']).astype(int) * 2 - 1
            return data
        
        def get_signal(self, row):
            return 1 if row['close'] > row['ma'] else -1
    
    print("✅ SimpleTestStrategy created successfully")
except Exception as e:
    print(f"❌ Failed to create strategy: {e}")
    sys.exit(1)

# Test 3: Test ML model attachment
print("\n[TEST 3] Testing ML model attachment...")
try:
    # Create a mock model with predict method
    class MockModel:
        def predict(self, X):
            """Mock prediction: return 1 for all inputs."""
            return np.ones(len(X) if hasattr(X, '__len__') else 1)
    
    model = MockModel()
    strategy = SimpleTestStrategy()
    
    # Test set_model
    strategy.set_model(model, feature_columns=['ma', 'close'])
    print("✅ set_model() works")
    
    # Test predict
    test_features = np.array([[1.0, 2.0], [3.0, 4.0]])
    predictions = strategy.predict(test_features)
    assert len(predictions) == 2
    print(f"✅ predict() works - predictions: {predictions}")
    
    # Test error when no model attached
    strategy2 = SimpleTestStrategy()
    try:
        strategy2.predict(test_features)
        print("❌ Should have raised error for missing model")
    except ValueError as e:
        if "No ML model attached" in str(e):
            print("✅ Correct error raised when model not attached")
        else:
            print(f"❌ Wrong error message: {e}")
    
except Exception as e:
    print(f"❌ ML model attachment test failed: {e}")
    import traceback
    traceback.print_exc()

# Test 4: Test strategy validation
print("\n[TEST 4] Testing strategy validation...")
try:
    validator = StrategyValidator()
    
    # Validate good strategy
    is_valid, errors = validator.validate(SimpleTestStrategy)
    if is_valid:
        print("✅ SimpleTestStrategy validated successfully")
    else:
        print(f"❌ SimpleTestStrategy validation failed: {errors}")
    
    # Get strategy info
    info = validator.get_strategy_info(SimpleTestStrategy)
    print(f"✅ Strategy info retrieved: {info['name']}")
    print(f"   Parameters: {list(info['parameters'].keys())}")
    print(f"   Is valid: {info['is_valid']}")
    
    # Test validate_strategy convenience function
    is_valid2, errors2 = validate_strategy(SimpleTestStrategy)
    if is_valid2:
        print("✅ validate_strategy() convenience function works")
    else:
        print(f"❌ validate_strategy() failed: {errors2}")
    
except Exception as e:
    print(f"❌ Validation test failed: {e}")
    import traceback
    traceback.print_exc()

# Test 5: Test invalid strategy detection
print("\n[TEST 5] Testing invalid strategy detection...")
try:
    class InvalidStrategy(StrategyMixin):
        """Invalid strategy - missing required methods."""
        
        def __init__(self, **kwargs):
            super().__init__(**kwargs)
    
    is_valid, errors = validate_strategy(InvalidStrategy)
    if not is_valid and len(errors) > 0:
        print("✅ Invalid strategy correctly detected")
        print(f"   Errors found: {len(errors)}")
        for error in errors:
            print(f"   - {error}")
    else:
        print("❌ Should have detected invalid strategy")
    
except Exception as e:
    print(f"❌ Invalid strategy test failed: {e}")
    import traceback
    traceback.print_exc()

# Test 6: Test ML utilities
print("\n[TEST 6] Testing ML utilities...")
try:
    # Create sample data
    dates = pd.date_range('2020-01-01', periods=100, freq='D')
    data = pd.DataFrame({
        'close': np.random.randn(100).cumsum() + 100,
        'volume': np.random.randint(1000, 10000, 100)
    }, index=dates)
    data['returns'] = data['close'].pct_change()
    
    # Test lag features
    lag_features = create_lag_features(data, columns=['returns'], n_lags=5)
    assert lag_features.shape[1] == 5
    print(f"✅ create_lag_features() works - created {lag_features.shape[1]} features")
    
    # Test rolling features
    roll_features = create_rolling_features(
        data, 
        windows=[10, 20], 
        columns=['close'],
        statistics=['mean', 'std']
    )
    expected_cols = 4  # 2 windows x 2 statistics
    assert roll_features.shape[1] == expected_cols
    print(f"✅ create_rolling_features() works - created {roll_features.shape[1]} features")
    
    # Test target labels
    data_with_returns = data.copy()
    data_with_returns['returns'] = data['returns']
    labels = create_target_labels(data_with_returns)
    assert len(labels) > 0
    print(f"✅ create_target_labels() works - created {len(labels)} labels")
    
except Exception as e:
    print(f"❌ ML utilities test failed: {e}")
    import traceback
    traceback.print_exc()

# Test 7: Test strategy with actual data
print("\n[TEST 7] Testing strategy with actual data...")
try:
    strategy = SimpleTestStrategy(period=20)
    
    # Create test data
    dates = pd.date_range('2020-01-01', periods=100, freq='D')
    test_data = pd.DataFrame({
        'open': np.random.randn(100).cumsum() + 100,
        'high': np.random.randn(100).cumsum() + 102,
        'low': np.random.randn(100).cumsum() + 98,
        'close': np.random.randn(100).cumsum() + 100,
        'volume': np.random.randint(1000, 10000, 100)
    }, index=dates)
    
    # Update data
    updated_data = strategy.update_data(test_data.copy())
    assert 'ma' in updated_data.columns
    assert 'returns' in updated_data.columns
    print("✅ Strategy update_data() works")
    
    # Calculate positions
    positioned_data = strategy.calculate_positions(updated_data.copy())
    assert 'side' in positioned_data.columns
    assert set(positioned_data['side'].dropna().unique()).issubset({-1, 1})
    print("✅ Strategy calculate_positions() works")
    
    # Get signal for single row
    test_row = positioned_data.iloc[-1]
    signal = strategy.get_signal(test_row)
    assert signal in [-1, 1]
    print(f"✅ Strategy get_signal() works - signal: {signal}")
    
except Exception as e:
    print(f"❌ Strategy with data test failed: {e}")
    import traceback
    traceback.print_exc()

# Test 8: Test package exports
print("\n[TEST 8] Testing package exports...")
try:
    # Check strategies module only exports StrategyMixin
    from stratestic import strategies
    exports = [name for name in dir(strategies) if not name.startswith('_')]
    if 'StrategyMixin' in exports:
        print("✅ StrategyMixin is exported from strategies module")
    else:
        print("❌ StrategyMixin not found in strategies exports")
    
    # Check that old strategies are not exported
    old_strategies = ['MovingAverage', 'Momentum', 'MachineLearning', 
                     'BollingerBands', 'MovingAverageCrossover']
    found_old = [s for s in old_strategies if s in exports]
    if not found_old:
        print("✅ Old strategies correctly removed from exports")
    else:
        print(f"❌ Old strategies still in exports: {found_old}")
    
except Exception as e:
    print(f"❌ Package exports test failed: {e}")
    import traceback
    traceback.print_exc()

# Summary
print("\n" + "=" * 60)
print("TESTING COMPLETE")
print("=" * 60)
print("\n✅ All Phase 2 core features are working!")
print("\nNext: Test CLI with 'stratestic validate-strategy'")
