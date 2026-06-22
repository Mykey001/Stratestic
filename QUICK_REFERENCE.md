# Stratestic Quick Reference

Quick cheatsheet for common Stratestic operations.

---

## Installation

```bash
pip install stratestic
```

---

## Strategy Template

```python
from stratestic.strategies import StrategyMixin

class MyStrategy(StrategyMixin):
    def __init__(self, param1=10, param2=20, **kwargs):
        self._param1 = param1
        self._param2 = param2
        self.params = {
            'param1': lambda x: int(x),
            'param2': lambda x: int(x)
        }
        super().__init__(**kwargs)
    
    def update_data(self, data):
        data = super().update_data(data)
        # Add indicators
        data['indicator'] = data['close'].rolling(self._param1).mean()
        return data
    
    def calculate_positions(self, data):
        # Vectorized: return 1 (long), -1 (short), 0 (neutral)
        data['side'] = ...
        return data
    
    def get_signal(self, row):
        # Iterative: return 1, -1, or 0
        return ...
```

---

## Backtesting

### Vectorized (Fast)

```python
from stratestic.backtesting import VectorizedBacktester

strategy = MyStrategy(param1=20, param2=50)
bt = VectorizedBacktester(strategy, symbol="BTCUSDT", amount=10000)

# Load data
bt.load_data()  # Sample data
# or
bt.load_data(data=my_dataframe)  # Your data

# Run backtest
results = bt.run()

# Print results
bt.show_results()

# Plot
bt.plot()
```

### Iterative (Flexible)

```python
from stratestic.backtesting import IterativeBacktester

bt = IterativeBacktester(strategy, symbol="BTCUSDT", amount=10000)
bt.load_data()
results = bt.run()
```

### With Leverage

```python
bt = VectorizedBacktester(strategy, leverage=5, margin_threshold=0.8)
bt.run()

# Check max safe leverage
max_lev = bt.maximum_leverage(margin_threshold=0.8)
```

---

## Optimization

### Brute Force

```python
best_params, best_metric = bt.optimize(
    params_dict={
        'param1': (10, 100, 10),  # start, stop, step
        'param2': (20, 200, 20)
    },
    optimization_metric='Sharpe Ratio',
    n_jobs=-1  # Use all CPU cores
)

print(f"Best params: {best_params}")
print(f"Best metric: {best_metric}")
```

### Genetic Algorithm

```python
best_params, best_metric = bt.optimize(
    params_dict={
        'param1': (10, 100),  # min, max (no step)
        'param2': (20, 200)
    },
    optimizer='gen_alg',
    pop_size=20,
    max_gen=30,
    optimization_metric='Total Return [%]'
)
```

### Custom Metric

```python
def my_metric(results):
    """Custom optimization metric."""
    return results['Sharpe Ratio'] * results['Total Return [%]']

bt.optimize(params_dict, optimization_function=my_metric)
```

---

## Multi-Symbol Portfolio

```python
from stratestic.utils.panel import build_panel
from stratestic.strategies.multi import BroadcastStrategy

# Build panel
panel = build_panel({
    "BTCUSDT": btc_data,
    "ETHUSDT": eth_data,
    "BNBUSDT": bnb_data
})

# Apply strategy to all symbols
strategy = BroadcastStrategy(MyStrategy(param1=50), data=panel)

# Backtest
bt = VectorizedBacktester(strategy, amount=10000)
bt.load_data(data=panel)
results = bt.run()  # Shows per-symbol and portfolio metrics
```

---

## ML Utilities

### Feature Engineering

```python
from stratestic.ml_utils import (
    create_lag_features,
    create_rolling_features,
    create_target_labels
)

# Lag features (past values)
lag_df = create_lag_features(data, columns=['close', 'volume'], n_lags=10)

# Rolling features (moving averages, std, etc.)
roll_df = create_rolling_features(
    data, 
    windows=[20, 50], 
    columns=['close'],
    functions=['mean', 'std']
)

# Target labels
labels = create_target_labels(
    data['returns'], 
    threshold=0.001,  # 0.1%
    mode='classification'  # or 'regression'
)
```

### Model Training

```python
from stratestic.ml_utils import train_model

model, results, X_train, X_test, y_train, y_test = train_model(
    estimator='Random Forest',  # or 'Logistic Regression', 'XGBoost', etc.
    X=features,
    y=labels,
    model_type='classification',  # or 'regression'
    test_size=0.2,
    random_state=42
)

print(f"Accuracy: {results['test_score']:.2%}")
```

### Model Evaluation

```python
from stratestic.ml_utils import evaluate_model

metrics = evaluate_model(
    model, 
    X_test, 
    y_test, 
    model_type='classification'
)

print(f"Precision: {metrics['precision']:.2%}")
print(f"Recall: {metrics['recall']:.2%}")
print(f"F1 Score: {metrics['f1_score']:.2%}")
```

### Use Model in Strategy

```python
class MLStrategy(StrategyMixin):
    def __init__(self, model, feature_cols, **kwargs):
        super().__init__(**kwargs)
        self.set_model(model, feature_columns=feature_cols)
        self._feature_cols = feature_cols
    
    def update_data(self, data):
        data = super().update_data(data)
        # Add features
        lag_df = create_lag_features(data, columns=['returns'], n_lags=10)
        return data.join(lag_df, how='inner')
    
    def calculate_positions(self, data):
        predictions = self.predict(data[self._feature_cols])
        data['side'] = predictions
        return data
    
    def get_signal(self, row):
        features = row[self._feature_cols].values.reshape(1, -1)
        return int(self.predict(features)[0])
```

---

## Strategy Combining

```python
from stratestic.backtesting.combining import StrategyCombiner

# Create individual strategies
s1 = Strategy1(param=10)
s2 = Strategy2(param=20)
s3 = Strategy3(param=30)

# Combine with majority vote
combined = StrategyCombiner([s1, s2, s3], method='Majority')

# Or require unanimous agreement
combined = StrategyCombiner([s1, s2, s3], method='Unanimous')

# Backtest
bt = VectorizedBacktester(combined, symbol="BTCUSDT")
bt.run()
```

---

## Strategy Validation

### CLI

```bash
# Validate strategy file
stratestic validate-strategy my_strategy.py

# Show help
stratestic help
```

### Python API

```python
from stratestic.validation import validate_strategy, StrategyValidator

# Quick validation
is_valid, errors = validate_strategy(MyStrategy)
if not is_valid:
    for error in errors:
        print(f"❌ {error}")

# Detailed validation
validator = StrategyValidator()
info = validator.get_strategy_info(MyStrategy)
print(f"Strategy: {info['name']}")
print(f"Parameters: {info['parameters']}")
print(f"Valid: {info['is_valid']}")
```

---

## Data Loading

### From DataFrame

```python
import pandas as pd

# Your DataFrame must have: open, high, low, close, volume
data = pd.read_csv('price_data.csv', index_col=0, parse_dates=True)

strategy = MyStrategy()
bt = VectorizedBacktester(strategy, symbol="BTCUSDT")
bt.load_data(data=data)
bt.run()
```

### From CSV

```python
data = pd.read_csv(
    'price_data.csv',
    index_col=0,
    parse_dates=True
)

bt.load_data(data=data)
```

### Sample Data (Built-in)

```python
# Load sample Bitcoin data
bt.load_data()  # No arguments = sample data
```

---

## Performance Metrics

Available metrics in results:

- **Total Return [%]** - Overall percentage return
- **Annualized Return [%]** - Yearly return
- **Sharpe Ratio** - Risk-adjusted return
- **Sortino Ratio** - Downside risk-adjusted return
- **Calmar Ratio** - Return vs max drawdown
- **Max Drawdown [%]** - Worst peak-to-trough decline
- **Win Rate [%]** - Percentage of winning trades
- **Profit Factor** - Gross profit / gross loss
- **Expectancy** - Average trade expectation
- **Total Trades** - Number of trades
- **Avg Trade Duration** - Average holding period
- **Volatility** - Annualized return volatility
- **SQN** - System Quality Number

---

## Common Patterns

### Moving Average Crossover

```python
class MACrossover(StrategyMixin):
    def __init__(self, fast=20, slow=50, **kwargs):
        self._fast = fast
        self._slow = slow
        self.params = {'fast': int, 'slow': int}
        super().__init__(**kwargs)
    
    def update_data(self, data):
        data = super().update_data(data)
        data['ma_fast'] = data['close'].rolling(self._fast).mean()
        data['ma_slow'] = data['close'].rolling(self._slow).mean()
        return data
    
    def calculate_positions(self, data):
        data['side'] = (data['ma_fast'] > data['ma_slow']).astype(int) * 2 - 1
        return data
    
    def get_signal(self, row):
        return 1 if row['ma_fast'] > row['ma_slow'] else -1
```

### RSI Mean Reversion

```python
class RSI(StrategyMixin):
    def __init__(self, period=14, oversold=30, overbought=70, **kwargs):
        self._period = period
        self._oversold = oversold
        self._overbought = overbought
        self.params = {'period': int, 'oversold': float, 'overbought': float}
        super().__init__(**kwargs)
    
    def update_data(self, data):
        data = super().update_data(data)
        delta = data['close'].diff()
        gain = delta.where(delta > 0, 0).rolling(self._period).mean()
        loss = -delta.where(delta < 0, 0).rolling(self._period).mean()
        rs = gain / loss
        data['rsi'] = 100 - (100 / (1 + rs))
        return data
    
    def calculate_positions(self, data):
        data['side'] = 0
        data.loc[data['rsi'] < self._oversold, 'side'] = 1
        data.loc[data['rsi'] > self._overbought, 'side'] = -1
        return data
    
    def get_signal(self, row):
        if row['rsi'] < self._oversold:
            return 1
        elif row['rsi'] > self._overbought:
            return -1
        return 0
```

### Bollinger Bands Breakout

```python
class BollingerBands(StrategyMixin):
    def __init__(self, period=20, std=2, **kwargs):
        self._period = period
        self._std = std
        self.params = {'period': int, 'std': float}
        super().__init__(**kwargs)
    
    def update_data(self, data):
        data = super().update_data(data)
        data['bb_mid'] = data['close'].rolling(self._period).mean()
        data['bb_std'] = data['close'].rolling(self._period).std()
        data['bb_upper'] = data['bb_mid'] + (self._std * data['bb_std'])
        data['bb_lower'] = data['bb_mid'] - (self._std * data['bb_std'])
        return data
    
    def calculate_positions(self, data):
        data['side'] = 0
        data.loc[data['close'] > data['bb_upper'], 'side'] = 1
        data.loc[data['close'] < data['bb_lower'], 'side'] = -1
        return data
    
    def get_signal(self, row):
        if row['close'] > row['bb_upper']:
            return 1
        elif row['close'] < row['bb_lower']:
            return -1
        return 0
```

---

## Troubleshooting

### "NotImplementedError: must implement calculate_positions"

You forgot to implement required methods. All strategies need:
- `calculate_positions(data)`
- `get_signal(row)`

### "KeyError: 'side'"

`calculate_positions()` must create a 'side' column with values 1, -1, or 0.

### "ValueError: No ML model attached"

Call `strategy.set_model(model)` before using `strategy.predict()`.

### Strategy validation fails

```bash
stratestic validate-strategy my_strategy.py
```

Check the error messages and fix issues.

### Optimization is slow

- Use fewer parameters or smaller ranges
- Use genetic algorithm instead of brute force
- Increase `n_jobs` for parallel processing

---

## More Resources

- **[README.md](README.md)** - Full documentation
- **[STRATEGY_GUIDE.md](STRATEGY_GUIDE.md)** - Complete strategy guide
- **[QUICK_START_V2.md](QUICK_START_V2.md)** - Detailed examples
- **[MIGRATION_GUIDE_v1_to_v2.md](MIGRATION_GUIDE_v1_to_v2.md)** - Migrating from v1.x

---

*Last Updated: June 2026*
