# Stratestic 2.0 - Project Vision

## Before vs After

### Current State (v1.x)
```
Stratestic = Backtesting Framework + Built-in Strategies
```

**Problems:**
- ❌ Users may not want the built-in strategies
- ❌ Mixing framework code with example code
- ❌ Limited to Python-only strategies
- ❌ No way to leverage existing MT5 EAs

### Target State (v2.0)
```
Stratestic = Universal Backtesting Framework
            + MT5 Conversion Tool
            + ML Utilities
```

**Benefits:**
- ✅ Clean separation: Framework vs User Strategies
- ✅ Bring Your Own Strategy philosophy
- ✅ Leverage existing MT5 Expert Advisors
- ✅ ML-ready but not ML-prescriptive

---

## Core Philosophy

### "Bring Your Own Strategy" (BYOS)

```
┌─────────────────────────────────────────┐
│         Your Strategy Sources           │
├─────────────────────────────────────────┤
│  • MT5 Expert Advisor (.mq5)           │
│  • Python rule-based strategy          │
│  • Python ML strategy (sklearn/torch)  │
│  • Hybrid approaches                    │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         Stratestic Framework            │
├─────────────────────────────────────────┤
│  • Validates strategy interface         │
│  • Backtests (vectorized + iterative)  │
│  • Optimizes parameters                 │
│  • Analyzes performance                 │
│  • Visualizes results                   │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         Actionable Insights             │
├─────────────────────────────────────────┤
│  • Performance metrics                  │
│  • Optimal parameters                   │
│  • Risk analysis                        │
│  • Trade visualization                  │
└─────────────────────────────────────────┘
```

---

## User Workflows

### Workflow 1: MT5 Trader
```bash
# Step 1: Convert existing MT5 EA
$ stratestic convert-mt5 MyEA.mq5 -o my_strategy.py

# Step 2: Review generated code
$ cat my_strategy.py

# Step 3: Backtest
$ python
>>> from stratestic.backtesting import VectorizedBacktester
>>> from my_strategy import MyConvertedStrategy
>>> bt = VectorizedBacktester(MyConvertedStrategy(), symbol="EURUSD")
>>> bt.load_data("eurusd_data.csv")
>>> bt.run()

# Step 4: Optimize
>>> bt.optimize({"param1": (10, 50, 5), "param2": (0.01, 0.1, 0.01)})
```

**Time Investment:** ~30 minutes total

---

### Workflow 2: Python Developer (Rule-Based)
```python
# Step 1: Create strategy class
from stratestic.strategies import StrategyMixin
import pandas as pd

class MyCustomStrategy(StrategyMixin):
    def __init__(self, fast_period=10, slow_period=30, **kwargs):
        self._fast_period = fast_period
        self._slow_period = slow_period
        self.params = {
            'fast_period': lambda x: int(x),
            'slow_period': lambda x: int(x)
        }
        super().__init__(**kwargs)
    
    def update_data(self, data):
        data = super().update_data(data)
        data['fast_ma'] = data['close'].rolling(self._fast_period).mean()
        data['slow_ma'] = data['close'].rolling(self._slow_period).mean()
        return data
    
    def calculate_positions(self, data):
        data['side'] = (data['fast_ma'] > data['slow_ma']).astype(int) * 2 - 1
        return data
    
    def get_signal(self, row):
        return 1 if row['fast_ma'] > row['slow_ma'] else -1

# Step 2: Backtest
from stratestic.backtesting import VectorizedBacktester

bt = VectorizedBacktester(MyCustomStrategy(), symbol="BTCUSDT")
bt.load_data()
bt.run()
bt.optimize({"fast_period": (5, 20), "slow_period": (20, 50)})
```

**Time Investment:** ~1 hour (first time), ~15 minutes (subsequent)

---

### Workflow 3: Data Scientist (ML-Based)
```python
# Step 1: Train your model (anywhere)
from sklearn.ensemble import RandomForestClassifier
import pandas as pd

# Your custom training pipeline
X_train, y_train = prepare_features(data)
model = RandomForestClassifier()
model.fit(X_train, y_train)

# Step 2: Create strategy with your model
from stratestic.strategies import StrategyMixin
from stratestic.ml_utils import create_lag_features

class MyMLStrategy(StrategyMixin):
    def __init__(self, model, feature_cols, **kwargs):
        super().__init__(**kwargs)
        self.set_model(model, feature_columns=feature_cols)
        self._feature_cols = feature_cols
    
    def update_data(self, data):
        data = super().update_data(data)
        # Use ML utilities
        data = create_lag_features(data, columns=['close', 'volume'], n_lags=10)
        return data
    
    def calculate_positions(self, data):
        predictions = self.predict(data[self._feature_cols])
        data['side'] = predictions
        return data
    
    def get_signal(self, row):
        return self.predict(row[self._feature_cols].values.reshape(1, -1))[0]

# Step 3: Backtest with your model
strategy = MyMLStrategy(model=model, feature_cols=X_train.columns)
bt = VectorizedBacktester(strategy, symbol="AAPL")
bt.load_data()
bt.run()
```

**Time Investment:** Variable (depends on ML complexity)

---

## Key Components

### 1. MT5 Converter Architecture
```
┌──────────────┐
│  MyEA.mq5    │  (MT5 Expert Advisor)
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│  MT5Parser       │  Parse MQL5 syntax
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  MQL5Translator  │  Convert to Python constructs
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ StrategyBuilder  │  Generate StrategyMixin class
└──────┬───────────┘
       │
       ▼
┌──────────────────────┐
│  my_strategy.py      │  Runnable Python strategy
└──────────────────────┘
```

### 2. Strategy Interface (Universal)
```python
class StrategyMixin:
    """
    All strategies must implement:
    """
    
    def calculate_positions(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Vectorized: Calculate all positions at once
        Returns: DataFrame with 'side' column (1=long, -1=short, 0=neutral)
        """
        raise NotImplementedError
    
    def get_signal(self, row: pd.Series) -> int:
        """
        Iterative: Calculate signal for single bar
        Returns: 1 (long), -1 (short), or 0 (neutral)
        """
        raise NotImplementedError
    
    def update_data(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Optional: Add indicators/features to data
        Returns: Enhanced DataFrame
        """
        return super().update_data(data)
```

### 3. Backtesting Engines (Unchanged)
```
┌─────────────────────────────────────┐
│     VectorizedBacktester            │
│  • Fast (whole dataset at once)     │
│  • Limited flexibility              │
│  • Good for: Simple strategies      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│     IterativeBacktester             │
│  • Slower (bar-by-bar)              │
│  • Maximum flexibility              │
│  • Good for: Complex logic          │
└─────────────────────────────────────┘
```

Both support:
- ✅ Single-symbol backtesting
- ✅ Multi-symbol portfolios
- ✅ Leverage & margin modeling
- ✅ Parameter optimization
- ✅ Performance visualization

---

## File Structure Changes

### What Gets DELETED
```
❌ stratestic/strategies/moving_average/
❌ stratestic/strategies/mean_reversion/
❌ stratestic/strategies/trend/
❌ stratestic/strategies/machine_learning/machine_learning.py
❌ All example strategy implementations
```

### What Gets ADDED
```
✅ stratestic/mt5_converter/          (MT5 conversion)
✅ stratestic/ml_utils/               (ML helpers, extracted)
✅ stratestic/validation/             (Strategy validation)
✅ stratestic/cli.py                  (Command-line interface)
```

### What Gets ENHANCED
```
⚡ stratestic/strategies/_mixin.py    (Add ML support)
⚡ stratestic/backtesting/combining/  (Accept any strategy)
⚡ Documentation                       (BYOS philosophy)
```

---

## Benefits Analysis

### For MT5 Traders
| Benefit | Value |
|---------|-------|
| Reuse existing EAs | ⭐⭐⭐⭐⭐ |
| Python ecosystem access | ⭐⭐⭐⭐⭐ |
| Advanced optimization | ⭐⭐⭐⭐ |
| Multi-symbol backtesting | ⭐⭐⭐⭐ |

### For Python Developers
| Benefit | Value |
|---------|-------|
| Clean framework | ⭐⭐⭐⭐⭐ |
| No unused code | ⭐⭐⭐⭐⭐ |
| Flexible interface | ⭐⭐⭐⭐⭐ |
| Production-ready | ⭐⭐⭐⭐ |

### For Data Scientists
| Benefit | Value |
|---------|-------|
| ML-agnostic | ⭐⭐⭐⭐⭐ |
| Use any library | ⭐⭐⭐⭐⭐ |
| Feature engineering utils | ⭐⭐⭐⭐ |
| Model persistence | ⭐⭐⭐⭐ |

---

## Competitive Positioning

### vs. Backtrader
- ✅ **Better**: Multi-symbol support, ML utilities, MT5 conversion
- ⚖️ **Similar**: Core backtesting capabilities
- ❌ **Worse**: Less mature, smaller ecosystem

### vs. Zipline
- ✅ **Better**: Easier to use, MT5 conversion, active development
- ⚖️ **Similar**: Performance analysis
- ❌ **Worse**: Less institutional features

### vs. MT5 Built-in Tester
- ✅ **Better**: Python ecosystem, ML integration, multi-symbol
- ⚖️ **Similar**: Backtesting accuracy
- ❌ **Worse**: No live trading integration (yet)

---

## Success Criteria

### Technical Success
- [ ] MT5 converter handles 80%+ of common EAs
- [ ] Zero performance regression in backtesting
- [ ] 100% backward compatibility for custom strategies
- [ ] Test coverage >85%

### User Success
- [ ] Clear migration path for v1 users
- [ ] <30 min to convert and backtest MT5 EA
- [ ] <1 hour to create new Python strategy
- [ ] Positive community feedback

### Business Success
- [ ] Maintain/grow user base
- [ ] Increase GitHub stars
- [ ] Featured in trading communities
- [ ] Potential for commercial partnerships

---

## Timeline Summary

```
Week 1-2:  Remove built-in strategies, refactor core
Week 3-5:  Implement MT5 converter
Week 6:    Complete documentation
Week 7:    Testing & quality assurance
Week 8:    Package & release prep
Week 9:    Migration support & launch

Total: ~9 weeks, ~250-300 hours
```

---

## Call to Action

### Next Steps
1. ✅ **Review** this vision and implementation plan
2. ✅ **Approve** the architectural changes
3. ✅ **Prioritize** features (MT5 converter vs ML utils)
4. ✅ **Begin** Phase 1 (cleanup)

### Questions to Resolve
1. Should ML utilities be a separate package?
2. What MT5 features are highest priority?
3. Should we maintain v1.x branch for legacy users?
4. What examples should go in the examples repository?

---

*Vision Document v1.0*  
*Created: June 2026*  
*Status: Pending Approval*
