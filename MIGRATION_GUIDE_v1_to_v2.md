# Migration Guide: Stratestic v1.x to v2.0

## Overview

Stratestic v2.0 represents a major architectural shift from a library with built-in strategies to a **universal backtesting framework** where you bring your own strategies.

**Key Philosophy Change:**  
v1.x: "Use our strategies"  
v2.0: **"Bring Your Own Strategy" (BYOS)**

---

## Breaking Changes Summary

| Change | Impact | Migration Effort |
|--------|--------|------------------|
| Built-in strategies removed | HIGH | Medium (1-2 hours) |
| ML strategy class removed | MEDIUM | Low (use ML utilities) |
| Strategy registry removed | LOW | None (internal change) |

---

## 1. Built-in Strategies Removed

### What Changed

All example strategy implementations have been removed:
- ❌ `MovingAverage`
- ❌ `MovingAverageCrossover`
- ❌ `MovingAverageConvergenceDivergence` (MACD)
- ❌ `BollingerBands`
- ❌ `Momentum`
- ❌ `MachineLearning`

### Why?

These were **examples**, not core framework features. Mixing examples with framework code caused confusion and bloat.

### Migration Options

#### Option 1: Create Your Own (Recommended)

**v1.x Code:**
```python
from stratestic.strategies import MovingAverageCrossover

strategy = MovingAverageCrossover(sma_s=50, sma_l=200)
bt = VectorizedBacktester(strategy, symbol="BTCUSDT")
bt.run()
```

**v2.0 Code:**
```python
from stratestic.strategies import StrategyMixin
from stratestic.backtesting import VectorizedBacktester

class MovingAverageCrossover(StrategyMixin):
    def __init__(self, sma_s, sma_l, **kwargs):
        self._sma_s = sma_s
        self._sma_l = sma_l
        self.params = {
            'sma_s': lambda x: int(x),
            'sma_l': lambda x: int(x)
        }
        super().__init__(**kwargs)
    
    def update_data(self, data):
        data = super().update_data(data)
        data['ma_s'] = data['close'].rolling(self._sma_s).mean()
        data['ma_l'] = data['close'].rolling(self._sma_l).mean()
        return data
    
    def calculate_positions(self, data):
        data['side'] = (data['ma_s'] > data['ma_l']).astype(int) * 2 - 1
        return data
    
    def get_signal(self, row):
        return 1 if row['ma_s'] > row['ma_l'] else -1

# Use exactly as before
strategy = MovingAverageCrossover(sma_s=50, sma_l=200)
bt = VectorizedBacktester(strategy, symbol="BTCUSDT")
bt.run()
```

#### Option 2: Use Examples Repository

```python
# Install examples package (coming soon)
# pip install stratestic-examples

from stratestic_examples import MovingAverageCrossover

strategy = MovingAverageCrossover(sma_s=50, sma_l=200)
# Rest of code unchanged
```

---

## 2. Machine Learning Strategy Changes

### What Changed

The prescriptive `MachineLearning` class has been removed, but ML utilities have been **extracted and enhanced** in the new `ml_utils` module.

### Why?

The old `MachineLearning` class was too rigid. Users should be able to use ANY ML framework (sklearn, PyTorch, TensorFlow, etc.) with their own strategy design.

### Migration

**v1.x Code:**
```python
from stratestic.strategies import MachineLearning

ml = MachineLearning(
    estimator="Random Forest",
    model_type="classification",
    nr_lags=10,
    window=20,
    data=data
)

bt = IterativeBacktester(ml, symbol="BTCUSDT")
bt.run()
```

**v2.0 Code:**
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

# Step 1: Train your model
lag_feats = create_lag_features(data, columns=['returns'], n_lags=10)
roll_feats = create_rolling_features(data, windows=20, columns=['close'])
labels = create_target_labels(data)
X, y = combine_features_and_labels(lag_feats, roll_feats, labels)

model, results, X_train, X_test, y_train, y_test = train_model(
    'Random Forest', X, y, model_type='classification'
)

# Step 2: Create strategy with your model
class MLStrategy(StrategyMixin):
    def __init__(self, model, feature_cols, **kwargs):
        super().__init__(**kwargs)
        self.set_model(model, feature_columns=feature_cols)
        self._feature_cols = feature_cols
    
    def update_data(self, data):
        data = super().update_data(data)
        # Add same features as training
        lag_feats = create_lag_features(data, columns=['returns'], n_lags=10)
        roll_feats = create_rolling_features(data, windows=20, columns=['close'])
        return data.join(lag_feats, how='inner').join(roll_feats, how='inner')
    
    def calculate_positions(self, data):
        predictions = self.predict(data[self._feature_cols])
        data['side'] = predictions
        return data
    
    def get_signal(self, row):
        return int(self.predict(row[self._feature_cols].values.reshape(1, -1))[0])

# Step 3: Backtest
strategy = MLStrategy(model=model, feature_cols=X.columns)
bt = IterativeBacktester(strategy, symbol="BTCUSDT")
bt.load_data(data)
bt.run()
```

### Benefits of New Approach

✅ Use ANY ML framework (sklearn, PyTorch, TensorFlow, XGBoost, etc.)  
✅ Full control over feature engineering  
✅ Custom model architectures  
✅ Easier to debug and customize  
✅ Clearer separation of training and backtesting

---

## 3. Custom Strategies (No Changes Needed!)

### Good News

If you created custom strategies in v1.x, **they still work** in v2.0!

**Your v1.x Strategy:**
```python
from stratestic.strategies import StrategyMixin

class MyCustomStrategy(StrategyMixin):
    def __init__(self, param1, **kwargs):
        self._param1 = param1
        self.params = {'param1': lambda x: int(x)}
        super().__init__(**kwargs)
    
    def update_data(self, data):
        data = super().update_data(data)
        # Your indicators
        return data
    
    def calculate_positions(self, data):
        # Your logic
        data['side'] = ...
        return data
    
    def get_signal(self, row):
        # Your logic
        return ...
```

**In v2.0:**  
✅ Works exactly the same! No changes needed.

---

## 4. Backtesting API (Unchanged)

All backtesting functionality remains the same:

```python
from stratestic.backtesting import VectorizedBacktester, IterativeBacktester

# Vectorized backtesting - UNCHANGED
bt = VectorizedBacktester(strategy, symbol="BTCUSDT", amount=10000)
bt.load_data("data.csv")
bt.run()

# Optimization - UNCHANGED
bt.optimize({'param1': (10, 50, 5)}, optimization_metric='Sharpe Ratio')

# Leverage - UNCHANGED
bt.set_leverage(5)
bt.run()

# Maximum leverage - UNCHANGED
max_lev = bt.maximum_leverage(margin_threshold=0.8)
```

---

## 5. Strategy Combination (Minor Change)

### What Changed

`StrategyCombiner` now uses runtime validation instead of compile-time registry.

### Impact

✅ Actually makes it **more flexible** - you can now combine ANY strategies!

**v1.x & v2.0 (Same API):**
```python
from stratestic.backtesting.combining import StrategyCombiner

combined = StrategyCombiner(
    [Strategy1(), Strategy2(), Strategy3()],
    method='Majority'  # or 'Unanimous'
)

bt = VectorizedBacktester(combined, symbol="BTCUSDT")
bt.run()
```

The only difference: In v2.0, strategies don't need to be "registered" - they just need to inherit from `StrategyMixin`.

---

## 6. ML Utilities (New in v2.0)

### What's New

All ML utilities from the old `MachineLearning` class are now available as standalone functions:

```python
from stratestic.ml_utils import (
    # Feature engineering
    create_lag_features,
    create_rolling_features,
    create_target_labels,
    combine_features_and_labels,
    
    # Training
    train_model,
    build_pipeline,
    train_test_split_timeseries,
    
    # Evaluation
    evaluate_model,
    plot_predictions,
    plot_learning_curve,
    
    # Defaults
    estimator_mapping,
    estimator_params,
    
    # Pipeline components
    FeatureSelector,
    CustomOneHotEncoder,
)
```

### Backwards Compatibility

Old function names still work:
```python
from stratestic.ml_utils import get_lag_features  # Still works (alias)
from stratestic.ml_utils import create_lag_features  # New name
```

---

## 7. New Features in v2.0

### 1. ML Model Attachment

Attach pre-trained models to any strategy:

```python
from sklearn.ensemble import RandomForestClassifier

# Train your model
model = RandomForestClassifier()
model.fit(X_train, y_train)

# Attach to strategy
strategy.set_model(model, feature_columns=X_train.columns)

# Use in strategy
predictions = strategy.predict(features)
```

### 2. Strategy Validation

Validate your strategies before running:

```python
from stratestic.validation import validate_strategy

is_valid, errors = validate_strategy(MyStrategy)
if not is_valid:
    for error in errors:
        print(f"Error: {error}")
```

### 3. CLI Tool

```bash
# Validate a strategy file
stratestic validate-strategy my_strategy.py
```

---

## Step-by-Step Migration Checklist

### For Users of Built-in Strategies

- [ ] Identify which built-in strategies you use
- [ ] Choose migration option (create your own vs use examples)
- [ ] Implement/import replacement strategies
- [ ] Test backtests produce similar results
- [ ] Update optimization calls if needed

**Time Estimate:** 1-2 hours per strategy

### For ML Strategy Users

- [ ] Extract ML model training code
- [ ] Use `ml_utils` for feature engineering
- [ ] Create custom ML strategy class
- [ ] Attach trained model to strategy
- [ ] Test backtests produce similar results

**Time Estimate:** 2-3 hours

### For Custom Strategy Users

- [ ] Test your strategies still work
- [ ] (Optional) Use new `validate_strategy()` function
- [ ] Update any imports if you used old ML helpers

**Time Estimate:** 15-30 minutes

---

## Common Migration Issues

### Issue 1: Import Errors

**Error:**
```python
ImportError: cannot import name 'MovingAverageCrossover' from 'stratestic.strategies'
```

**Solution:**  
Create your own strategy or use examples repository (see Option 1 or 2 above).

### Issue 2: ML Strategy Missing

**Error:**
```python
ImportError: cannot import name 'MachineLearning' from 'stratestic.strategies'
```

**Solution:**  
Use ML utilities with custom strategy (see ML migration section).

### Issue 3: Different Results After Migration

**Cause:**  
Slight implementation differences in custom strategy.

**Solution:**
- Verify indicator calculations match original
- Check parameter values are identical
- Compare on same data
- Use `trade_on_close` parameter consistently

---

## Getting Help

### Resources

1. **Quick Start Guide:** `QUICK_START_V2.md`
2. **Codebase Documentation:** `CODEBASE_INDEX.md`
3. **This Migration Guide:** `MIGRATION_GUIDE_v1_to_v2.md`
4. **Examples Repository:** `stratestic-examples` (coming soon)

### Support

- **GitHub Issues:** [github.com/diogomatoschaves/stratestic/issues](https://github.com/diogomatoschaves/stratestic/issues)
- **Documentation:** [github.com/diogomatoschaves/stratestic](https://github.com/diogomatoschaves/stratestic)

---

## FAQ

**Q: Why were built-in strategies removed?**  
A: To maintain a clean separation between framework and examples. Users have different needs and shouldn't be forced to install strategies they won't use.

**Q: Will v1.x still be maintained?**  
A: Critical bug fixes only. New features will be in v2.x.

**Q: Can I use both v1.x and v2.0?**  
A: They can't coexist in the same environment. Choose one version.

**Q: Are v2.0 backtests as accurate as v1.x?**  
A: Yes! The backtesting engines are unchanged. Only the strategy layer changed.

**Q: Can I use my v1.x custom strategies in v2.0?**  
A: Yes! If they inherit from `StrategyMixin`, they work without changes.

**Q: What about performance?**  
A: Identical. Core backtesting code is unchanged.

---

**Need more help?** Check `QUICK_START_V2.md` for complete working examples!

*Migration Guide v1.0*  
*Last Updated: June 20, 2026*
