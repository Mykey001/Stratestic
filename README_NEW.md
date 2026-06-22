# Stratestic 2.0  📈📊🛠️

[![codecov](https://codecov.io/gh/diogomatoschaves/stratestic/graph/badge.svg?token=4E2B0ZOH1K)](https://codecov.io/gh/diogomatoschaves/stratestic)
![tests_badge](https://github.com/diogomatoschaves/stratestic/actions/workflows/run-tests.yml/badge.svg)
[![PyPI version](https://badge.fury.io/py/stratestic.svg)](https://badge.fury.io/py/stratestic)

## Universal Backtesting Framework for Python Trading Strategies

Stratestic is a powerful Python package for backtesting, analyzing, and optimizing **any** trading strategy—whether rule-based, machine learning-powered, or hybrid.

### 🎯 Philosophy: Bring Your Own Strategy (BYOS)

Unlike traditional libraries with built-in strategies, Stratestic provides the **framework** while you provide the **strategy**. This approach gives you:

✨ **Total Freedom** - Use ANY trading logic, indicators, or ML models  
⚡ **High Performance** - Vectorized and iterative backtesting engines  
🔧 **Production Ready** - Leverage, margin, multi-symbol portfolios  
🤖 **ML-Friendly** - Utilities for ML strategies (sklearn, PyTorch, TensorFlow)  
📊 **Advanced Optimization** - Brute force and genetic algorithms  

---

## Installation

```bash
pip install stratestic
```

---

## Quick Start

### Create a Simple Strategy

```python
from stratestic.strategies import StrategyMixin
from stratestic.backtesting import VectorizedBacktester

class MovingAverageCrossover(StrategyMixin):
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

# Backtest it
strategy = MovingAverageCrossover(fast=20, slow=50)
bt = VectorizedBacktester(strategy, symbol="BTCUSDT", amount=10000)
bt.load_data()  # Loads sample data
bt.run()

# Optimize it
best_params, best_return = bt.optimize({
    'fast': (10, 30, 5),
    'slow': (40, 80, 10)
})
```

### ML Strategy Example

```python
from stratestic.strategies import StrategyMixin
from stratestic.ml_utils import create_lag_features, train_model

# Train your model
X = create_lag_features(data, columns=['returns'], n_lags=10)
y = data['returns'].shift(-1).dropna()
X, y = X.align(y, join='inner', axis=0)

model, results, *_ = train_model('Random Forest', X, y)
print(f"Model Accuracy: {results['accuracy']:.2%}")

# Create strategy
class MLStrategy(StrategyMixin):
    def __init__(self, model, feature_cols, **kwargs):
        super().__init__(**kwargs)
        self.set_model(model, feature_columns=feature_cols)
    
    def update_data(self, data):
        data = super().update_data(data)
        features = create_lag_features(data, columns=['returns'], n_lags=10)
        return data.join(features, how='inner')
    
    def calculate_positions(self, data):
        data['side'] = self.predict(data[feature_cols])
        return data
    
    def get_signal(self, row):
        return int(self.predict(row[feature_cols].values.reshape(1, -1))[0])

# Backtest
strategy = MLStrategy(model=model, feature_cols=X.columns)
bt.run()
```

---

## Core Features

### 🚀 Dual Backtesting Engines

#### Vectorized Backtester
- **Speed**: 10-100x faster than iterative
- **Use Case**: Most strategies, optimization runs
- **Limitation**: Less flexible for complex stateful logic

#### Iterative Backtester
- **Flexibility**: Full bar-by-bar control
- **Use Case**: Complex strategies, realistic simulations
- **Limitation**: Slower execution

### 📊 Advanced Optimization

```python
# Brute force - guaranteed global optimum
bt.optimize(
    {'param1': (10, 50, 5), 'param2': (0.01, 0.1, 0.01)},
    optimization_metric='Sharpe Ratio'
)

# Genetic algorithm - faster for large spaces
bt.optimize(
    {'param1': (10, 100), 'param2': (0.001, 1.0)},
    optimizer='gen_alg',
    pop_size=20,
    max_gen=30
)
```

**Available Metrics**: Return, Sharpe Ratio, Sortino Ratio, Calmar Ratio, Win Rate, Profit Factor, System Quality Number, Expectancy, Volatility, Max Drawdown

### 💰 Leverage & Margin

Realistic position modeling with Binance-style margin calculations:

```python
# Backtest with leverage
bt = VectorizedBacktester(strategy, leverage=5)
bt.run()

# Find maximum safe leverage
max_lev = bt.maximum_leverage(margin_threshold=0.8)
print(f"Max safe leverage: {max_lev}x")
```

**Features**:
- Isolated margin per position
- Liquidation detection
- Margin ratio tracking
- Position sizing with leverage

### 🌐 Multi-Symbol Portfolios

Backtest portfolios across multiple symbols with shared capital:

```python
from stratestic.utils.panel import build_panel
from stratestic.strategies.multi import BroadcastStrategy

# Build panel from multiple symbols
panel = build_panel({"BTCUSDT": btc_data, "ETHUSDT": eth_data})

# Apply strategy to all symbols
strategy = BroadcastStrategy(MovingAverageCrossover(50, 200), data=panel)

# Backtest portfolio
bt = VectorizedBacktester(strategy, amount=10000)
bt.run()
```

**Features**:
- Cross-collateralized capital
- Per-symbol position tracking
- Portfolio-level optimization
- Isolated margin per position

### 🤖 ML Utilities

Reusable utilities for machine learning strategies:

```python
from stratestic.ml_utils import (
    create_lag_features,          # Past values as features
    create_rolling_features,      # Moving averages, std dev, etc.
    create_target_labels,         # Next-bar returns
    train_model,                  # Train sklearn models
    evaluate_model,               # Performance metrics
    plot_learning_curve          # Diagnose overfitting
)
```

**Supported**: scikit-learn, PyTorch, TensorFlow, XGBoost, any model with `.predict()`

### 🔗 Strategy Combination

Combine multiple strategies with voting logic:

```python
from stratestic.backtesting.combining import StrategyCombiner

combined = StrategyCombiner(
    [Strategy1(), Strategy2(), Strategy3()],
    method='Majority'  # or 'Unanimous'
)

bt = VectorizedBacktester(combined)
bt.run()

# Optimize all strategies together
bt.optimize([
    {'param1': (10, 50)},   # Strategy1 params
    {'param2': (20, 60)}    # Strategy2 params
])
```

### ✅ Strategy Validation

Validate your strategies before backtesting:

```python
from stratestic.validation import validate_strategy

is_valid, errors = validate_strategy(MyStrategy)
if not is_valid:
    for error in errors:
        print(f"❌ {error}")
```

**CLI Tool**:
```bash
stratestic validate-strategy my_strategy.py
```

---

## Documentation

📚 **Complete Guides**:
- [Quick Start Guide](QUICK_START_V2.md) - Complete examples and tutorials
- [Strategy Creation Guide](STRATEGY_GUIDE.md) - How to create strategies
- [Migration Guide](MIGRATION_GUIDE_v1_to_v2.md) - Upgrading from v1.x
- [Codebase Documentation](CODEBASE_INDEX.md) - Architecture overview

🎓 **Examples Repository**: [stratestic-examples](https://github.com/diogomatoschaves/stratestic-examples) (coming soon)

---

## Key Concepts

### Strategy Interface

All strategies must implement:

```python
class MyStrategy(StrategyMixin):
    
    def __init__(self, param1, **kwargs):
        self._param1 = param1
        self.params = {'param1': lambda x: int(x)}
        super().__init__(**kwargs)
    
    def update_data(self, data):
        """Add indicators/features to data"""
        data = super().update_data(data)
        # Your indicators here
        return data
    
    def calculate_positions(self, data):
        """Vectorized: Calculate all positions at once"""
        data['side'] = ...  # 1=long, -1=short, 0=neutral
        return data
    
    def get_signal(self, row):
        """Iterative: Calculate signal for one bar"""
        return ...  # 1, -1, or 0
```

### Short Position Models

Choose how shorts are modeled:

- **`"static"`** (default): Real fixed-units short (matches exchanges)
- **`"inverse"`**: Continuously-rebalanced inverse position

```python
bt = VectorizedBacktester(strategy, short_model="static")
```

---

## Performance Metrics

Comprehensive performance analysis:

**Returns**: Total, Annualized, Buy & Hold comparison  
**Risk-Adjusted**: Sharpe, Sortino, Calmar ratios  
**Drawdowns**: Max/Avg drawdown and duration  
**Trade Stats**: Win rate, Profit Factor, Expectancy, SQN  

---

## Real-World Features

✅ **Trading Costs** - Percentage-based costs per trade  
✅ **Slippage** - Price impact modeling  
✅ **Leverage** - Up to 100x with margin tracking  
✅ **Liquidations** - Automatic liquidation detection  
✅ **Multiple Timeframes** - Any data frequency  
✅ **Custom Data** - CSV, DataFrame, or custom sources  

---

## Requirements

- Python >=3.10, <3.13
- pandas >=2.1
- numpy >=1.26 (< 2.0)
- scikit-learn >=1.3 (optional, for ML)
- matplotlib >=3.8 (for plotting)

---

## What's New in v2.0

### ✨ Major Changes

**🎯 "Bring Your Own Strategy" Philosophy**
- Removed all built-in strategy implementations
- Clean separation between framework and examples
- Accept ANY strategy that implements the interface

**🤖 ML Utilities Module**
- Extracted reusable ML components from old `MachineLearning` class
- Support for ANY ML framework (sklearn, PyTorch, TensorFlow)
- Feature engineering, training, evaluation utilities

**✅ Strategy Validation**
- Validate strategies before running
- CLI tool for quick checks
- Detailed error messages

**🔧 Enhanced Strategy Interface**
- Attach ML models to any strategy with `set_model()`
- Use `predict()` for model inference
- Better ML integration

### 💔 Breaking Changes

- ❌ Built-in strategies removed (MovingAverage, Momentum, etc.)
- ❌ `MachineLearning` class removed (use ML utilities instead)
- ❌ Strategy registry removed (runtime validation now)

**Migration**: See [Migration Guide](MIGRATION_GUIDE_v1_to_v2.md)

---

## Use Cases

### Algorithmic Trading Research
- Test trading hypotheses
- Compare strategy performance
- Find optimal parameters
- Analyze risk-reward profiles

### Machine Learning
- Train predictive models
- Backtest ML strategies
- Evaluate feature importance
- Prevent overfitting

### Portfolio Management
- Multi-asset strategies
- Cross-sectional analysis
- Capital allocation
- Risk management

### Education
- Learn backtesting concepts
- Understand strategy mechanics
- Experiment safely

---

## Integration

**Live Trading Bot**: [MyCryptoBot](https://github.com/diogomatoschaves/MyCryptoBot) - Seamless integration for live trading

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) (coming soon)

**Note**: We don't accept built-in strategy contributions. Create strategies in the [examples repository](https://github.com/diogomatoschaves/stratestic-examples) instead.

---

## License

MIT License - see [LICENSE](LICENSE)

---

## Support

- **Documentation**: [GitHub Wiki](https://github.com/diogomatoschaves/stratestic/wiki)
- **Issues**: [GitHub Issues](https://github.com/diogomatoschaves/stratestic/issues)
- **Discussions**: [GitHub Discussions](https://github.com/diogomatoschaves/stratestic/discussions)

---

## Acknowledgments

Built by [Diogo Matos Chaves](https://github.com/diogomatoschaves)

Special thanks to all contributors and the open-source community.

---

## Citation

If you use Stratestic in your research, please cite:

```bibtex
@software{stratestic2024,
  title = {Stratestic: Universal Backtesting Framework for Python Trading Strategies},
  author = {Chaves, Diogo Matos},
  year = {2024},
  url = {https://github.com/diogomatoschaves/stratestic}
}
```

---

**Ready to start?** Check out the [Quick Start Guide](QUICK_START_V2.md)!

*Stratestic v2.0 - Bring Your Own Strategy* 🚀
