# Strategy Creation Guide

## Complete Guide to Creating Trading Strategies with Stratestic

This guide teaches you how to create custom trading strategies from scratch, whether rule-based or ML-powered.

---

## Table of Contents

1. [Strategy Interface Requirements](#strategy-interface-requirements)
2. [Creating Rule-Based Strategies](#creating-rule-based-strategies)
3. [Creating ML-Based Strategies](#creating-ml-based-strategies)
4. [Best Practices](#best-practices)
5. [Testing Your Strategy](#testing-your-strategy)
6. [Common Patterns](#common-patterns)
7. [Troubleshooting](#troubleshooting)

---

## Strategy Interface Requirements

All strategies MUST inherit from `StrategyMixin` and implement three methods:

### Required Methods

```python
from stratestic.strategies import StrategyMixin

class MyStrategy(StrategyMixin):
    
    def update_data(self, data):
        """
        Add indicators/features to the data.
        Called once when data is loaded.
        
        MUST call super().update_data(data) first!
        """
        data = super().update_data(data)
        # Add your indicators here
        return data
    
    def calculate_positions(self, data):
        """
        Vectorized: Calculate ALL positions at once.
        Used by VectorizedBacktester.
        
        MUST add 'side' column with values:
        - 1 for long
        - -1 for short  
        - 0 for neutral
        """
        data['side'] = ...  # Your logic
        return data
    
    def get_signal(self, row):
        """
        Iterative: Calculate signal for ONE bar.
        Used by IterativeBacktester and live trading.
        
        MUST return:
        - 1 for long
        - -1 for short
        - 0 for neutral
        """
        return ...  # Your logic
```

### Required Attributes

```python
def __init__(self, param1, param2=default_value, **kwargs):
    # 1. Store parameters with underscore prefix
    self._param1 = param1
    self._param2 = param2
    
    # 2. Define params dict for optimization
    self.params = {
        'param1': lambda x: int(x),    # Converter function
        'param2': lambda x: float(x)
    }
    
    # 3. Call parent init
    super().__init__(**kwargs)
```

---

## Creating Rule-Based Strategies

### Example 1: Simple Moving Average

```python
from stratestic.strategies import StrategyMixin
import pandas as pd

class SimpleMA(StrategyMixin):
    """
    Simple strategy: Long when price > MA, short when price < MA.
    
    Parameters
    ----------
    period : int
        Moving average period.
    """
    
    def __init__(self, period=20, **kwargs):
        self._period = period
        self.params = {'period': lambda x: int(x)}
        super().__init__(**kwargs)
    
    def update_data(self, data):
        """Calculate moving average indicator."""
        data = super().update_data(data)
        data['ma'] = data['close'].rolling(self._period).mean()
        return data
    
    def calculate_positions(self, data):
        """Vectorized: All positions at once."""
        # Long when close > MA, short when close < MA
        data['side'] = (data['close'] > data['ma']).astype(int) * 2 - 1
        return data
    
    def get_signal(self, row):
        """Iterative: Single bar signal."""
        if row['close'] > row['ma']:
            return 1   # Long
        elif row['close'] < row['ma']:
            return -1  # Short
        else:
            return 0   # Neutral
```

**Usage:**
```python
from stratestic.backtesting import VectorizedBacktester

strategy = SimpleMA(period=50)
bt = VectorizedBacktester(strategy, symbol="BTCUSDT", amount=10000)
bt.load_data()
bt.run()

# Optimize
bt.optimize({'period': (10, 100, 5)})
```

### Example 2: Moving Average Crossover

```python
class MACrossover(StrategyMixin):
    """
    Dual moving average crossover strategy.
    Long when fast MA crosses above slow MA.
    Short when fast MA crosses below slow MA.
    """
    
    def __init__(self, fast=20, slow=50, **kwargs):
        self._fast = fast
        self._slow = slow
        self.params = {
            'fast': lambda x: int(x),
            'slow': lambda x: int(x)
        }
        super().__init__(**kwargs)
    
    def update_data(self, data):
        data = super().update_data(data)
        data['ma_fast'] = data['close'].rolling(self._fast).mean()
        data['ma_slow'] = data['close'].rolling(self._slow).mean()
        return data
    
    def calculate_positions(self, data):
        # Simple: Long when fast > slow, short otherwise
        data['side'] = (data['ma_fast'] > data['ma_slow']).astype(int) * 2 - 1
        return data
    
    def get_signal(self, row):
        return 1 if row['ma_fast'] > row['ma_slow'] else -1
```

### Example 3: RSI Mean Reversion

```python
class RSIStrategy(StrategyMixin):
    """
    RSI-based mean reversion strategy.
    Long when RSI < oversold, short when RSI > overbought.
    """
    
    def __init__(self, period=14, oversold=30, overbought=70, **kwargs):
        self._period = period
        self._oversold = oversold
        self._overbought = overbought
        self.params = {
            'period': lambda x: int(x),
            'oversold': lambda x: float(x),
            'overbought': lambda x: float(x)
        }
        super().__init__(**kwargs)
    
    def update_data(self, data):
        data = super().update_data(data)
        
        # Calculate RSI
        delta = data['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(self._period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(self._period).mean()
        rs = gain / loss
        data['rsi'] = 100 - (100 / (1 + rs))
        
        return data
    
    def calculate_positions(self, data):
        # Long when oversold, short when overbought, neutral otherwise
        conditions = [
            data['rsi'] < self._oversold,
            data['rsi'] > self._overbought
        ]
        choices = [1, -1]
        data['side'] = pd.Series(
            index=data.index,
            data=0  # Default neutral
        )
        data.loc[conditions[0], 'side'] = 1
        data.loc[conditions[1], 'side'] = -1
        return data
    
    def get_signal(self, row):
        if row['rsi'] < self._oversold:
            return 1
        elif row['rsi'] > self._overbought:
            return -1
        else:
            return 0
```

### Example 4: Multi-Indicator Strategy

```python
class MultiIndicator(StrategyMixin):
    """
    Combines multiple indicators with weights.
    """
    
    def __init__(self, ma_period=20, rsi_period=14, **kwargs):
        self._ma_period = ma_period
        self._rsi_period = rsi_period
        self.params = {
            'ma_period': lambda x: int(x),
            'rsi_period': lambda x: int(x)
        }
        super().__init__(**kwargs)
    
    def update_data(self, data):
        data = super().update_data(data)
        
        # Moving average
        data['ma'] = data['close'].rolling(self._ma_period).mean()
        
        # RSI
        delta = data['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(self._rsi_period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(self._rsi_period).mean()
        rs = gain / loss
        data['rsi'] = 100 - (100 / (1 + rs))
        
        return data
    
    def calculate_positions(self, data):
        # Combine signals
        ma_signal = (data['close'] > data['ma']).astype(int)  # 1 or 0
        rsi_signal = (data['rsi'] < 50).astype(int)  # 1 or 0
        
        # Both signals must agree
        combined = ma_signal + rsi_signal
        data['side'] = 0
        data.loc[combined == 2, 'side'] = 1   # Both bullish
        data.loc[combined == 0, 'side'] = -1  # Both bearish
        
        return data
    
    def get_signal(self, row):
        ma_bullish = row['close'] > row['ma']
        rsi_bullish = row['rsi'] < 50
        
        if ma_bullish and rsi_bullish:
            return 1
        elif not ma_bullish and not rsi_bullish:
            return -1
        else:
            return 0
```

---

## Creating ML-Based Strategies

### Example 1: Scikit-learn Random Forest

```python
from stratestic.strategies import StrategyMixin
from stratestic.ml_utils import (
    create_lag_features,
    create_rolling_features,
    create_target_labels,
    combine_features_and_labels,
    train_model
)

class MLRandomForest(StrategyMixin):
    """
    Machine learning strategy using Random Forest classifier.
    """
    
    def __init__(self, model=None, feature_cols=None, n_lags=10, **kwargs):
        self._n_lags = n_lags
        self._feature_cols = feature_cols or []
        super().__init__(**kwargs)
        
        if model is not None:
            self.set_model(model, feature_columns=feature_cols)
    
    def update_data(self, data):
        """Generate ML features."""
        data = super().update_data(data)
        
        # Create lag features
        lag_feats = create_lag_features(
            data,
            columns=['returns', 'volume'],
            n_lags=self._n_lags
        )
        
        # Create rolling features
        roll_feats = create_rolling_features(
            data,
            windows=[10, 20, 50],
            columns=['close'],
            statistics=('mean', 'std')
        )
        
        # Combine
        result = data.join(lag_feats, how='inner').join(roll_feats, how='inner')
        
        # Store feature columns if not set
        if not self._feature_cols:
            self._feature_cols = [col for col in result.columns 
                                   if col not in data.columns]
        
        return result
    
    def calculate_positions(self, data):
        """Predict using ML model."""
        if self._ml_model is None:
            raise ValueError("No model attached! Train and attach a model first.")
        
        predictions = self.predict(data[self._feature_cols])
        data['side'] = predictions
        return data
    
    def get_signal(self, row):
        """Single row prediction."""
        features = row[self._feature_cols].values.reshape(1, -1)
        return int(self.predict(features)[0])


# Training and usage
import pandas as pd

# Step 1: Load data
data = pd.read_csv("btc_data.csv", index_col=0, parse_dates=True)

# Step 2: Prepare strategy (without model)
temp_strategy = MLRandomForest(n_lags=10)
data_with_features = temp_strategy.update_data(data.copy())

# Step 3: Train model
from stratestic.ml_utils import create_target_labels, combine_features_and_labels

labels = create_target_labels(data_with_features)
feature_cols = [col for col in data_with_features.columns 
                if col not in data.columns]

X = data_with_features[feature_cols]
X, y = X.align(labels, join='inner', axis=0)

model, results, X_train, X_test, y_train, y_test = train_model(
    'Random Forest',
    X, y,
    model_type='classification',
    test_size=0.2
)

print(f"Model Accuracy: {results['accuracy']:.2%}")

# Step 4: Create strategy with trained model
strategy = MLRandomForest(
    model=model,
    feature_cols=feature_cols,
    n_lags=10
)

# Step 5: Backtest
from stratestic.backtesting import IterativeBacktester

bt = IterativeBacktester(strategy, symbol="BTCUSDT", amount=10000)
bt.load_data(data)
bt.run()
```

### Example 2: Custom PyTorch Neural Network

```python
import torch
import torch.nn as nn
import numpy as np

class NeuralNetStrategy(StrategyMixin):
    """
    Strategy using a custom PyTorch neural network.
    """
    
    def __init__(self, model=None, feature_cols=None, device='cpu', **kwargs):
        self._device = device
        self._feature_cols = feature_cols or []
        super().__init__(**kwargs)
        
        if model is not None:
            # Wrap PyTorch model to have predict() method
            class PyTorchWrapper:
                def __init__(self, model, device):
                    self.model = model
                    self.device = device
                    self.model.eval()
                
                def predict(self, X):
                    with torch.no_grad():
                        X_tensor = torch.FloatTensor(X).to(self.device)
                        outputs = self.model(X_tensor)
                        predictions = torch.sign(outputs).cpu().numpy().flatten()
                    return predictions
            
            wrapped_model = PyTorchWrapper(model, device)
            self.set_model(wrapped_model, feature_columns=feature_cols)
    
    def update_data(self, data):
        data = super().update_data(data)
        
        # Simple features for demo
        data['returns_lag1'] = data['returns'].shift(1)
        data['returns_lag2'] = data['returns'].shift(2)
        data['ma_10'] = data['close'].rolling(10).mean()
        data['ma_20'] = data['close'].rolling(20).mean()
        
        if not self._feature_cols:
            self._feature_cols = ['returns_lag1', 'returns_lag2', 'ma_10', 'ma_20']
        
        return data
    
    def calculate_positions(self, data):
        predictions = self.predict(data[self._feature_cols].values)
        data['side'] = predictions
        return data
    
    def get_signal(self, row):
        features = row[self._feature_cols].values.reshape(1, -1)
        return int(self.predict(features)[0])


# Define and train PyTorch model
class SimpleNN(nn.Module):
    def __init__(self, input_size):
        super().__init__()
        self.fc1 = nn.Linear(input_size, 64)
        self.fc2 = nn.Linear(64, 32)
        self.fc3 = nn.Linear(32, 1)
        self.relu = nn.ReLU()
        self.tanh = nn.Tanh()
    
    def forward(self, x):
        x = self.relu(self.fc1(x))
        x = self.relu(self.fc2(x))
        x = self.tanh(self.fc3(x))
        return x

# Training code (simplified)
# ... train your model ...

# Use with strategy
strategy = NeuralNetStrategy(model=trained_model, feature_cols=feature_cols)
```

---

## Best Practices

### 1. Always Call super().update_data()

```python
def update_data(self, data):
    # ✅ CORRECT
    data = super().update_data(data)
    data['my_indicator'] = ...
    return data

    # ❌ WRONG - Missing super() call
    data['my_indicator'] = ...
    return data
```

### 2. Handle NaN Values

```python
def update_data(self, data):
    data = super().update_data(data)
    data['ma'] = data['close'].rolling(20).mean()
    
    # Option 1: Drop NaN rows
    data = data.dropna()
    
    # Option 2: Forward fill
    data = data.fillna(method='ffill')
    
    return data
```

### 3. Use Consistent Logic

```python
# ✅ CORRECT - Logic matches in both methods
def calculate_positions(self, data):
    data['side'] = (data['close'] > data['ma']).astype(int) * 2 - 1
    return data

def get_signal(self, row):
    return 1 if row['close'] > row['ma'] else -1

# ❌ WRONG - Inconsistent logic
def calculate_positions(self, data):
    data['side'] = (data['close'] > data['ma']).astype(int) * 2 - 1
    return data

def get_signal(self, row):
    return 1 if row['close'] < row['ma'] else -1  # Opposite!
```

### 4. Validate Parameters

```python
def __init__(self, period, threshold=0.5, **kwargs):
    # Validate inputs
    if period < 1:
        raise ValueError("period must be >= 1")
    if not 0 <= threshold <= 1:
        raise ValueError("threshold must be between 0 and 1")
    
    self._period = period
    self._threshold = threshold
    self.params = {
        'period': lambda x: int(x),
        'threshold': lambda x: float(x)
    }
    super().__init__(**kwargs)
```

### 5. Document Your Strategy

```python
class MyStrategy(StrategyMixin):
    """
    Brief description of what the strategy does.
    
    Parameters
    ----------
    param1 : int
        Description of param1.
    param2 : float, optional
        Description of param2. Default is 0.5.
    
    Examples
    --------
    >>> strategy = MyStrategy(param1=20, param2=0.6)
    >>> bt = VectorizedBacktester(strategy, symbol="BTCUSDT")
    >>> bt.run()
    """
```

---

## Testing Your Strategy

### 1. Validate Interface

```python
from stratestic.validation import validate_strategy

is_valid, errors = validate_strategy(MyStrategy)
if not is_valid:
    for error in errors:
        print(f"❌ {error}")
else:
    print("✅ Strategy is valid!")
```

### 2. Test with Sample Data

```python
# Test indicator calculation
data = pd.DataFrame({
    'close': [100, 101, 102, 103, 104]
}, index=pd.date_range('2024-01-01', periods=5))

strategy = MyStrategy(period=3)
data_with_indicators = strategy.update_data(data)
print(data_with_indicators)
```

### 3. Verify Consistency

```python
# Check that both methods produce same result
strategy = MyStrategy(period=20)
data = strategy.update_data(test_data.copy())
data = strategy.calculate_positions(data)

for idx in data.index:
    row = data.loc[idx]
    vectorized_signal = row['side']
    iterative_signal = strategy.get_signal(row)
    
    assert vectorized_signal == iterative_signal, \
        f"Mismatch at {idx}: {vectorized_signal} != {iterative_signal}"

print("✅ Methods are consistent!")
```

### 4. Small Backtest First

```python
# Test on small dataset first
small_data = full_data.iloc[:100]  # First 100 rows

strategy = MyStrategy()
bt = VectorizedBacktester(strategy, symbol="BTCUSDT", amount=1000)
bt.load_data(small_data)
bt.run()
```

---

## Common Patterns

### Pattern 1: Threshold-Based Strategy

```python
class ThresholdStrategy(StrategyMixin):
    def __init__(self, threshold=0.02, **kwargs):
        self._threshold = threshold
        self.params = {'threshold': lambda x: float(x)}
        super().__init__(**kwargs)
    
    def update_data(self, data):
        data = super().update_data(data)
        data['price_change'] = data['close'].pct_change()
        return data
    
    def calculate_positions(self, data):
        data['side'] = 0
        data.loc[data['price_change'] > self._threshold, 'side'] = 1
        data.loc[data['price_change'] < -self._threshold, 'side'] = -1
        return data
    
    def get_signal(self, row):
        if row['price_change'] > self._threshold:
            return 1
        elif row['price_change'] < -self._threshold:
            return -1
        return 0
```

### Pattern 2: State Machine Strategy

```python
class StateMachine(StrategyMixin):
    def __init__(self, **kwargs):
        self._state = 'neutral'
        super().__init__(**kwargs)
    
    def get_signal(self, row):
        # State transitions based on conditions
        if self._state == 'neutral':
            if row['some_condition']:
                self._state = 'long'
                return 1
        elif self._state == 'long':
            if row['exit_condition']:
                self._state = 'neutral'
                return 0
        
        # Maintain current state
        return 1 if self._state == 'long' else 0
    
    def calculate_positions(self, data):
        # For vectorized, simulate state machine
        # (more complex - iterate if needed)
        positions = []
        state = 'neutral'
        
        for idx, row in data.iterrows():
            # State logic here
            positions.append(1 if state == 'long' else 0)
        
        data['side'] = positions
        return data
```

### Pattern 3: Ensemble Strategy

```python
class EnsembleStrategy(StrategyMixin):
    def __init__(self, models=None, **kwargs):
        self._models = models or []
        super().__init__(**kwargs)
    
    def calculate_positions(self, data):
        # Get predictions from all models
        predictions = []
        for model in self._models:
            pred = model.predict(data[feature_cols])
            predictions.append(pred)
        
        # Average predictions
        avg_predictions = np.mean(predictions, axis=0)
        data['side'] = np.sign(avg_predictions)
        return data
    
    def get_signal(self, row):
        predictions = [model.predict(row[feature_cols].values.reshape(1, -1))[0]
                      for model in self._models]
        return int(np.sign(np.mean(predictions)))
```

---

## Troubleshooting

### Error: "NotImplementedError"

**Cause:** Forgot to implement required methods.

**Solution:**
```python
# Implement all three methods:
def update_data(self, data): ...
def calculate_positions(self, data): ...
def get_signal(self, row): ...
```

### Error: "No ML model attached"

**Cause:** Using `predict()` without calling `set_model()`.

**Solution:**
```python
model = train_model(...)
strategy.set_model(model, feature_columns=feature_cols)
```

### Different Results: Vectorized vs Iterative

**Cause:** Logic mismatch between `calculate_positions()` and `get_signal()`.

**Solution:** Ensure both methods implement identical logic.

### Performance Issues

**Cause:** Inefficient calculations in `update_data()`.

**Solution:** Use vectorized pandas operations, avoid loops.

---

**Next Steps:**
- See `QUICK_START_V2.md` for complete working examples
- Check `MIGRATION_GUIDE_v1_to_v2.md` if migrating from v1.x
- Use `stratestic validate-strategy` CLI to validate your strategy

*Strategy Guide v1.0*  
*Last Updated: June 20, 2026*
