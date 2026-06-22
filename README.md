# Stratestic 2.0 📈📊🛠️

[![codecov](https://codecov.io/gh/diogomatoschaves/stratestic/graph/badge.svg?token=4E2B0ZOH1K)](https://codecov.io/gh/diogomatoschaves/stratestic)
![tests_badge](https://github.com/diogomatoschaves/stratestic/actions/workflows/run-tests.yml/badge.svg)
[![PyPI version](https://badge.fury.io/py/stratestic.svg)](https://badge.fury.io/py/stratestic)

**Universal backtesting framework for Python trading strategies**

Stratestic is a powerful Python framework for backtesting, analyzing, and optimizing trading strategies. Bring your own strategy—whether rule-based or ML-powered—and leverage professional-grade backtesting infrastructure.

## 🎯 Philosophy: Bring Your Own Strategy (BYOS)

Stratestic 2.0 is a **framework, not a library**. You define the strategy logic, we provide:

✅ **Fast Backtesting** - Vectorized and iterative engines  
✅ **Advanced Optimization** - Brute force and genetic algorithms  
✅ **ML Utilities** - Feature engineering, training, evaluation  
✅ **Multi-Symbol** - Portfolio backtesting with shared capital  
✅ **Leverage & Margin** - Realistic position modeling (Binance rules)  
✅ **Comprehensive Metrics** - 20+ performance indicators  
✅ **Strategy Validation** - CLI tool to verify implementations

---

## 🚀 Quick Start

### Installation

```bash
pip install stratestic
```

### Create Your First Strategy

```python
from stratestic.strategies import StrategyMixin
from stratestic.backtesting import VectorizedBacktester

class SimpleMA(StrategyMixin):
    """Long when price > MA, short when price < MA"""
    
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

# Backtest it
strategy = SimpleMA(period=50)
bt = VectorizedBacktester(strategy, symbol="BTCUSDT", amount=10000)
bt.load_data()  # Load sample data
bt.run()        # Run backtest

# Optimize it
best_params, best_return = bt.optimize({'period': (10, 100, 5)})
print(f"Best period: {best_params['period']}")
```

---

## 📚 Documentation

- **[Quick Start Guide](QUICK_START_V2.md)** - Complete examples (rule-based, ML, multi-symbol)
- **[Strategy Guide](STRATEGY_GUIDE.md)** - How to create strategies from scratch
- **[Migration Guide](MIGRATION_GUIDE_v1_to_v2.md)** - Migrating from v1.x
- **[Codebase Index](CODEBASE_INDEX.md)** - Architecture and API reference

---

## 🎓 What You Can Build

### Rule-Based Strategies
- Moving average crossovers
- RSI mean reversion
- Bollinger Bands breakouts
- Custom technical indicators
- Multi-indicator combinations

### ML-Based Strategies
- scikit-learn classifiers/regressors
- PyTorch neural networks
- TensorFlow models
- XGBoost, LightGBM
- Custom ensemble methods

### Advanced Strategies
- Multi-symbol portfolios
- Pairs trading
- Statistical arbitrage
- Combined strategy ensembles

---

## ✨ Key Features

### 1. Dual Backtesting Engines

**Vectorized Backtester** (Fast)
```python
from stratestic.backtesting import VectorizedBacktester

bt = VectorizedBacktester(strategy, symbol="BTCUSDT", amount=10000)
bt.run()  # Full backtest in milliseconds
```

**Iterative Backtester** (Flexible)
```python
from stratestic.backtesting import IterativeBacktester

bt = IterativeBacktester(strategy, symbol="BTCUSDT", amount=10000)
bt.run()  # Bar-by-bar simulation for complex logic
```

### 2. Powerful Optimization

**Brute Force** - Exhaustive search
```python
bt.optimize({
    'param1': (10, 50, 5),
    'param2': (0.1, 1.0, 0.1)
}, optimization_metric='Sharpe Ratio')
```

**Genetic Algorithm** - Fast for large spaces
```python
bt.optimize(
    {'param1': (1, 100), 'param2': (0.01, 1.0)},
    optimizer='gen_alg',
    pop_size=20,
    max_gen=30
)
```

### 3. ML Utilities

```python
from stratestic.ml_utils import (
    create_lag_features,      # Past values as features
    create_rolling_features,  # Moving averages, std, etc.
    train_model,              # Train sklearn models
    evaluate_model            # Performance metrics
)

# Feature engineering
lag_feats = create_lag_features(data, columns=['close'], n_lags=10)
roll_feats = create_rolling_features(data, windows=[20, 50], columns=['close'])

# Train model
model, results, X_train, X_test, y_train, y_test = train_model(
    'Random Forest', X, y, model_type='classification'
)

# Use in strategy
strategy.set_model(model, feature_columns=X.columns)
```

### 4. Multi-Symbol Portfolio Backtesting

```python
from stratestic.utils.panel import build_panel
from stratestic.strategies.multi import BroadcastStrategy

# Build panel from multiple symbols
panel = build_panel({"BTCUSDT": btc_df, "ETHUSDT": eth_df})

# Apply strategy to all symbols
strategy = BroadcastStrategy(SimpleMA(period=50), data=panel)

# Backtest portfolio
bt = VectorizedBacktester(strategy, amount=10000)
bt.run()  # Shows per-symbol and portfolio performance
```

### 5. Leverage & Margin Modeling

```python
# Set leverage
bt = VectorizedBacktester(strategy, leverage=5, margin_threshold=0.8)
bt.run()

# Calculate maximum safe leverage
max_leverage = bt.maximum_leverage(margin_threshold=0.8)
print(f"Max safe leverage: {max_leverage}x")
```

### 6. Strategy Validation

```bash
# Validate strategy file
stratestic validate-strategy my_strategy.py
```

```python
# Or in code
from stratestic.validation import validate_strategy

is_valid, errors = validate_strategy(MyStrategy)
if not is_valid:
    for error in errors:
        print(f"❌ {error}")
```

### 7. Strategy Combination

```python
from stratestic.backtesting.combining import StrategyCombiner

# Combine multiple strategies
combined = StrategyCombiner(
    [Strategy1(), Strategy2(), Strategy3()],
    method='Majority'  # or 'Unanimous'
)

bt = VectorizedBacktester(combined, symbol="BTCUSDT")
bt.run()
```

---

## 📊 Comprehensive Performance Metrics

### Returns
- Total Return, Annualized Return, Volatility
- Buy & Hold Comparison

### Risk Metrics
- Sharpe Ratio, Sortino Ratio, Calmar Ratio
- Maximum Drawdown, Average Drawdown
- Drawdown Duration

### Trade Statistics
- Win Rate, Profit Factor, Expectancy
- Total Trades, Average Trade Duration
- Best/Worst Trades

### Advanced
- System Quality Number (SQN)
- Exposure Time
- Margin Ratio Evolution (with leverage)

---

## 🔧 Strategy Interface

All strategies must implement three methods:

```python
from stratestic.strategies import StrategyMixin

class MyStrategy(StrategyMixin):
    
    def update_data(self, data):
        """Add indicators to data. Called once."""
        data = super().update_data(data)
        # Calculate your indicators
        return data
    
    def calculate_positions(self, data):
        """Vectorized: Calculate all positions at once."""
        data['side'] = ...  # 1 (long), -1 (short), 0 (neutral)
        return data
    
    def get_signal(self, row):
        """Iterative: Calculate signal for single bar."""
        return ...  # 1, -1, or 0
```

See [STRATEGY_GUIDE.md](STRATEGY_GUIDE.md) for complete guide.

---

## 🆕 What's New in v2.0

### Major Changes

✅ **Universal Framework** - Bring any strategy (rule-based or ML)  
✅ **ML Utilities Module** - Reusable ML components  
✅ **Strategy Validation** - CLI tool and API  
✅ **Enhanced Documentation** - Complete guides and examples  
✅ **Cleaner API** - Removed built-in strategies (see migration guide)

### Breaking Changes

❌ Built-in strategies removed (MovingAverage, Momentum, etc.)  
❌ ML strategy class removed (use ml_utils instead)  
✅ Custom strategies still work unchanged!

See [MIGRATION_GUIDE_v1_to_v2.md](MIGRATION_GUIDE_v1_to_v2.md) for details.

---

## 📖 Examples

### Moving Average Crossover

```python
class MACrossover(StrategyMixin):
    def __init__(self, fast=20, slow=50, **kwargs):
        self._fast = fast
        self._slow = slow
        self.params = {'fast': lambda x: int(x), 'slow': lambda x: int(x)}
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
class RSIStrategy(StrategyMixin):
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

### Machine Learning Strategy

```python
from stratestic.ml_utils import create_lag_features, train_model

class MLStrategy(StrategyMixin):
    def __init__(self, model=None, feature_cols=None, **kwargs):
        super().__init__(**kwargs)
        if model:
            self.set_model(model, feature_columns=feature_cols)
        self._feature_cols = feature_cols or []
    
    def update_data(self, data):
        data = super().update_data(data)
        lag_feats = create_lag_features(data, columns=['returns'], n_lags=10)
        return data.join(lag_feats, how='inner')
    
    def calculate_positions(self, data):
        predictions = self.predict(data[self._feature_cols])
        data['side'] = predictions
        return data
    
    def get_signal(self, row):
        return int(self.predict(row[self._feature_cols].values.reshape(1, -1))[0])

# Train and use
model, results, *_ = train_model('Random Forest', X, y)
strategy = MLStrategy(model=model, feature_cols=X.columns)
```

More examples in [QUICK_START_V2.md](QUICK_START_V2.md) and [STRATEGY_GUIDE.md](STRATEGY_GUIDE.md).

---

## 🛠️ Requirements

- Python >= 3.10, < 3.13
- pandas >= 2.1
- numpy >= 1.26 (< 2.0)
- scikit-learn >= 1.3
- matplotlib, seaborn, plotly
- scipy, ta, geneal

See [pyproject.toml](pyproject.toml) for complete list.

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Create your strategy in your own project (not in stratestic)
2. Report bugs via GitHub issues
3. Suggest improvements via GitHub discussions
4. Share your strategies in community forums

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file.

---

## 🔗 Related Projects

- **[MyCryptoBot](https://github.com/diogomatoschaves/MyCryptoBot)** - Live trading bot integrating with Stratestic
- **[geneal](https://github.com/diogomatoschaves/geneal)** - Genetic algorithm library used for optimization

---

## 📞 Support & Community

- **Documentation**: [GitHub Repository](https://github.com/diogomatoschaves/stratestic)
- **Issues**: [GitHub Issues](https://github.com/diogomatoschaves/stratestic/issues)
- **PyPI**: [pypi.org/project/stratestic](https://pypi.org/project/stratestic/)

---

## 🎓 Learning Resources

### For New Users
1. [Quick Start Guide](QUICK_START_V2.md) - Working examples
2. [Strategy Guide](STRATEGY_GUIDE.md) - How to create strategies
3. [Codebase Index](CODEBASE_INDEX.md) - Architecture overview

### For v1.x Users
1. [Migration Guide](MIGRATION_GUIDE_v1_to_v2.md) - Breaking changes and migration
2. [Quick Start Guide](QUICK_START_V2.md) - New examples

### Advanced
1. Multi-symbol backtesting documentation
2. ML utilities reference
3. Optimization strategies

---

## ⭐ Star History

If you find Stratestic useful, please star the repository!

---

**Built with ❤️ for quantitative traders and researchers**

*Stratestic 2.0 - Universal Strategy Backtesting Framework*
# Stratestic
# Stratestic
