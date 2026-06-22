# Stratestic 2.0 Quick Start Guide

## 🎯 New Philosophy: Bring Your Own Strategy (BYOS)

Stratestic is now a **universal backtesting framework**. You bring the strategy, we provide the tools.

---

## 📦 What's Available

### Core Backtesting
- ✅ **VectorizedBacktester** - Fast vectorized backtesting
- ✅ **IterativeBacktester** - Flexible bar-by-bar backtesting
- ✅ **Optimization** - Brute force + genetic algorithms
- ✅ **Multi-Symbol** - Portfolio backtesting
- ✅ **Leverage & Margin** - Realistic position modeling

### ML Utilities (NEW)
- ✅ **Feature Engineering** - Lag features, rolling features
- ✅ **Training Utilities** - Model training pipelines
- ✅ **Evaluation** - Performance metrics & learning curves
- ✅ **Pipeline Components** - Custom sklearn transformers

### Strategy Framework
- ✅ **StrategyMixin** - Base class for all strategies
- ✅ **StrategyCombiner** - Combine multiple strategies
- ✅ **Multi-Symbol Support** - Cross-sectional strategies

---

## 🚀 Quick Examples

### 1. Create a Simple Rule-Based Strategy

```python
from stratestic.strategies import StrategyMixin
from stratestic.backtesting import VectorizedBacktester
import pandas as pd

class SimpleMAStrategy(StrategyMixin):
    """Moving average crossover strategy."""
    
    def __init__(self, fast=10, slow=30, **kwargs):
        self._fast = fast
        self._slow = slow
        self.params = {
            'fast': lambda x: int(x),
            'slow': lambda x: int(x)
        }
        super().__init__(**kwargs)
    
    def update_data(self, data):
        """Calculate indicators."""
        data = super().update_data(data)
        data['ma_fast'] = data['close'].rolling(self._fast).mean()
        data['ma_slow'] = data['close'].rolling(self._slow).mean()
        return data
    
    def calculate_positions(self, data):
        """Vectorized position calculation."""
        data['side'] = (data['ma_fast'] > data['ma_slow']).astype(int) * 2 - 1
        return data
    
    def get_signal(self, row):
        """Iterative signal calculation."""
        return 1 if row['ma_fast'] > row['ma_slow'] else -1

# Backtest it
strategy = SimpleMAStrategy(fast=20, slow=50)
bt = VectorizedBacktester(strategy, symbol="BTCUSDT", amount=10000)
bt.load_data("btc_data.csv")  # or bt.load_data() for sample data
bt.run()

# Optimize it
best_params, best_return = bt.optimize({
    'fast': (10, 30, 5),
    'slow': (40, 80, 10)
})
print(f"Best parameters: {best_params}")
```

---

### 2. Create an ML-Based Strategy

```python
from stratestic.strategies import StrategyMixin
from stratestic.backtesting import IterativeBacktester
from stratestic.ml_utils import (
    create_lag_features,
    create_rolling_features,
    create_target_labels,
    combine_features_and_labels,
    train_model
)
import pandas as pd

class MLStrategy(StrategyMixin):
    """Machine learning strategy using sklearn."""
    
    def __init__(self, model=None, feature_cols=None, **kwargs):
        self.model = model
        self.feature_cols = feature_cols or []
        super().__init__(**kwargs)
    
    def update_data(self, data):
        """Generate ML features."""
        data = super().update_data(data)
        
        # Create features
        lag_feats = create_lag_features(
            data, 
            columns=['close', 'volume'], 
            n_lags=10
        )
        roll_feats = create_rolling_features(
            data,
            windows=[20, 50],
            columns=['close']
        )
        
        # Combine
        labels = create_target_labels(data)
        X, y = combine_features_and_labels(lag_feats, roll_feats, labels)
        
        # Store for prediction
        self._features = X
        
        return data.join(X, how='inner')
    
    def calculate_positions(self, data):
        """Predict positions using ML model."""
        if self.model is None:
            raise ValueError("No model attached! Train a model first.")
        
        predictions = self.model.predict(self._features)
        data['side'] = predictions
        return data
    
    def get_signal(self, row):
        """Single-row prediction."""
        features = row[self.feature_cols].values.reshape(1, -1)
        return int(self.model.predict(features)[0])

# Train a model
import pandas as pd

# Load and prepare data
data = pd.read_csv("btc_data.csv", index_col=0, parse_dates=True)

# Create features
from stratestic.ml_utils import create_lag_features, create_target_labels

X = create_lag_features(data, columns=['returns'], n_lags=5)
y = create_target_labels(data)
X, y = X.align(y, join='inner', axis=0)

# Train model
model, results, X_train, X_test, y_train, y_test = train_model(
    'Random Forest',
    X, y,
    model_type='classification',
    test_size=0.2
)

print(f"Model accuracy: {results['accuracy']:.2%}")

# Backtest with trained model
strategy = MLStrategy(model=model, feature_cols=X.columns)
bt = IterativeBacktester(strategy, symbol="BTCUSDT", amount=10000)
bt.load_data(data)
bt.run()
```

---

### 3. Combine Multiple Strategies

```python
from stratestic.strategies import StrategyMixin
from stratestic.backtesting import VectorizedBacktester
from stratestic.backtesting.combining import StrategyCombiner

# Define your strategies
class Strategy1(StrategyMixin):
    # Your implementation
    pass

class Strategy2(StrategyMixin):
    # Your implementation
    pass

# Combine them
combined = StrategyCombiner(
    [Strategy1(param1=10), Strategy2(param2=20)],
    method='Majority'  # or 'Unanimous'
)

# Backtest the combination
bt = VectorizedBacktester(combined, symbol="BTCUSDT")
bt.load_data()
bt.run()

# Optimize all strategies together
bt.optimize([
    {'param1': (5, 20)},   # Strategy1 parameters
    {'param2': (10, 30)}   # Strategy2 parameters
])
```

---

### 4. Multi-Symbol Portfolio

```python
from stratestic.utils.panel import build_panel
from stratestic.strategies.multi import BroadcastStrategy
from stratestic.backtesting import VectorizedBacktester

# Load data for multiple symbols
btc_data = pd.read_csv("btc.csv", index_col=0, parse_dates=True)
eth_data = pd.read_csv("eth.csv", index_col=0, parse_dates=True)

# Build panel
panel = build_panel({
    "BTCUSDT": btc_data,
    "ETHUSDT": eth_data
})

# Apply your strategy to all symbols
strategy = BroadcastStrategy(
    SimpleMAStrategy(fast=20, slow=50),
    data=panel
)

# Backtest portfolio
bt = VectorizedBacktester(strategy, amount=10000)
bt.run()

# Results show per-symbol performance + portfolio
```

---

## 📚 Required Strategy Interface

All strategies must inherit from `StrategyMixin` and implement:

### Required Methods

```python
class MyStrategy(StrategyMixin):
    
    def calculate_positions(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Vectorized: Calculate all positions at once.
        
        Must add 'side' column to data:
        - 1 for long
        - -1 for short
        - 0 for neutral
        """
        data['side'] = ...  # Your logic here
        return data
    
    def get_signal(self, row: pd.Series) -> int:
        """
        Iterative: Calculate signal for single bar.
        
        Returns:
        - 1 for long
        - -1 for short
        - 0 for neutral
        """
        return ...  # Your logic here
```

### Optional Methods

```python
    def update_data(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Add indicators/features to data.
        Always call super().update_data(data) first!
        """
        data = super().update_data(data)
        # Add your indicators
        data['my_indicator'] = ...
        return data
```

### Required Attributes

```python
    def __init__(self, param1, param2=default, **kwargs):
        # Store parameters with underscore prefix
        self._param1 = param1
        self._param2 = param2
        
        # Define params dict for optimization
        self.params = {
            'param1': lambda x: int(x),      # Converter function
            'param2': lambda x: float(x)
        }
        
        # Call parent init
        super().__init__(**kwargs)
```

---

## 🔧 ML Utilities Reference

### Feature Engineering

```python
from stratestic.ml_utils import (
    create_lag_features,
    create_rolling_features,
    create_target_labels,
    combine_features_and_labels
)

# Lag features (past values)
lag_feats = create_lag_features(
    data,
    columns=['close', 'volume'],
    n_lags=10  # Use past 10 bars
)

# Rolling features (moving averages, etc.)
roll_feats = create_rolling_features(
    data,
    windows=[20, 50],
    columns=['close'],
    statistics=('mean', 'std')  # Calculate mean and std
)

# Target labels (next bar return)
labels = create_target_labels(data, returns_col='returns')

# Combine all features
X, y = combine_features_and_labels(lag_feats, roll_feats, labels)
```

### Model Training

```python
from stratestic.ml_utils import train_model

model, results, X_train, X_test, y_train, y_test = train_model(
    estimator='Random Forest',      # or 'Decision Tree', 'Neural Net', etc.
    X=X,
    y=y,
    model_type='classification',    # or 'regression'
    test_size=0.2,
    polynomial_degree=1,
    verbose=True
)

# View results
print(f"Accuracy: {results['accuracy']}")
print(f"F1 Score: {results['f1']}")
```

### Available Estimators

**Classification:**
- Linear, Nearest Neighbors, Linear SVM, RBF SVM
- Gaussian Process, Decision Tree, Random Forest
- Neural Net, AdaBoost, Gradient Boosting

**Regression:**
- Same options configured for regression tasks

---

## 🎓 Where to Find Examples

Since built-in strategies were removed, check:

1. **Examples Repository:** `stratestic-examples` (coming soon)
   - Rule-based strategies
   - ML strategies
   - Converted MT5 strategies

2. **This Guide:** Complete working examples above

3. **Tests:** `tests/` directory has test strategies

---

## 🆘 Migration from v1.x

### If you used built-in strategies:

```python
# v1.x (NO LONGER WORKS)
from stratestic.strategies import MovingAverageCrossover
strategy = MovingAverageCrossover(50, 200)

# v2.0 (TWO OPTIONS)

# Option 1: Copy from examples repo
from stratestic_examples import MovingAverageCrossover
strategy = MovingAverageCrossover(50, 200)

# Option 2: Create your own (see examples above)
```

### If you created custom strategies:

**No changes needed!** Your strategies still work if you:
- Inherited from `StrategyMixin`
- Implemented `calculate_positions()` and `get_signal()`

---

## 💡 Tips & Best Practices

### 1. Use Vectorized Backtester When Possible
- Much faster than iterative
- Good for most strategies

```python
# Fast
bt = VectorizedBacktester(strategy, ...)

# Slower but more flexible
bt = IterativeBacktester(strategy, ...)
```

### 2. Optimize with Genetic Algorithms for Large Spaces
```python
# Many parameter combinations? Use gen_alg
bt.optimize(
    {'param1': (1, 100), 'param2': (0.01, 1.0)},
    optimizer='gen_alg',
    pop_size=20,
    max_gen=30
)
```

### 3. Test ML Models Before Backtesting
```python
# Train and evaluate first
model, results, *_ = train_model('Random Forest', X, y)
print(f"Test accuracy: {results['accuracy']}")

# Then backtest
strategy = MyMLStrategy(model=model)
bt.run()
```

### 4. Use Leverage Carefully
```python
# Check maximum safe leverage first
max_lev = bt.maximum_leverage(margin_threshold=0.8)
print(f"Max safe leverage: {max_lev}x")

# Then use it
bt.set_leverage(max_lev)
bt.run()
```

---

## 📖 Next Steps

1. **Create your first strategy** using examples above
2. **Backtest it** with your data
3. **Optimize parameters** to improve performance
4. **Analyze results** with built-in metrics
5. **Iterate and refine** your approach

---

*Quick Start Guide for Stratestic v2.0*  
*Updated: June 20, 2026*
