# Removed Built-in Strategies - Phase 1

## Documentation of Removed Code

This file documents the built-in strategies that were removed in Phase 1.
Users can reference these as examples for creating their own strategies.

---

## Removed Directories

### 1. `strategies/moving_average/`
**Files:**
- `ma.py` - Simple moving average strategy
- `ma_crossover.py` - Moving average crossover strategy
- `macd.py` - MACD indicator strategy
- `__init__.py`

**Reason for Removal:** Example strategies that should not be part of the core framework.

---

### 2. `strategies/mean_reversion/`
**Files:**
- `bollinger_bands.py` - Bollinger Bands mean reversion strategy
- `__init__.py`

**Reason for Removal:** Example strategy that should not be part of the core framework.

---

### 3. `strategies/trend/`
**Files:**
- `momentum.py` - Momentum-based trend following strategy
- `__init__.py`

**Reason for Removal:** Example strategy that should not be part of the core framework.

---

### 4. `strategies/machine_learning/`
**Files:**
- `machine_learning.py` - Prescriptive ML strategy class
- `helpers/` - ML utilities (EXTRACTED to `ml_utils/` instead of deleted)
  - `_feature_engineering.py` → `ml_utils/features.py`
  - `_training.py` → `ml_utils/training.py`
  - `_evaluation.py` → `ml_utils/evaluation.py`
  - `_defaults.py` → `ml_utils/defaults.py`
  - `_pipeline_custom_classes.py` → `ml_utils/pipeline.py`
  - `_helpers.py` → Functions integrated into evaluation.py
- `models/` - Empty directory
- `__init__.py`

**Reason for Removal:** 
- The ML strategy class was too prescriptive
- ML utilities were extracted to `ml_utils/` for general use
- Users should create their own ML strategies using the utilities

---

### 5. `strategies/_helpers.py`
**File:** Strategy-specific helper functions

**Reason for Removal:** Contains helpers for specific strategies that no longer exist.

---

### 6. `strategies/properties.py`
**File:** Strategy registry and introspection

**Content:**
```python
STRATEGIES = {
    "MovingAverage": {...},
    "MovingAverageCrossover": {...},
    "BollingerBands": {...},
    ...
}
```

**Reason for Removal:** 
- Registry of built-in strategies no longer needed
- Compile-time validation replaced with runtime validation
- Users can create any strategy without registration

---

## What Was Kept

### ✅ Kept: `strategies/_mixin.py`
**Base class for all strategies** - This is the foundation that users extend.

### ✅ Kept: `strategies/multi/`
**Multi-symbol strategy support** - Framework feature, not an example strategy.

---

## Migration Path for Users

### If You Used Built-in Strategies

**Before (v1.x):**
```python
from stratestic.strategies import MovingAverageCrossover
strategy = MovingAverageCrossover(50, 200)
```

**After (v2.0):**
Option 1: Copy the strategy implementation from the examples repository
Option 2: Create your own custom strategy

### If You Created Custom Strategies

**Your code still works!** No changes needed if you:
- Inherited from `StrategyMixin`
- Implemented `calculate_positions()` and `get_signal()`

---

## Examples Repository

All removed strategies will be available as examples in:
**`stratestic-examples` repository** (separate from main package)

Structure:
```
stratestic-examples/
├── rule_based/
│   ├── moving_average_crossover.py
│   ├── bollinger_bands.py
│   ├── momentum.py
│   └── macd.py
├── ml_based/
│   ├── sklearn_classifier_example.py
│   ├── sklearn_regressor_example.py
│   └── pytorch_lstm_example.py
└── README.md
```

---

## ML Utilities Migration

### Before (v1.x):**
```python
from stratestic.strategies.machine_learning import MachineLearning
ml = MachineLearning(estimator="Random Forest", ...)
```

### After (v2.0):**
```python
from stratestic.strategies import StrategyMixin
from stratestic.ml_utils import create_lag_features, train_model

class MyMLStrategy(StrategyMixin):
    def __init__(self, model, **kwargs):
        super().__init__(**kwargs)
        self.model = model
    
    def update_data(self, data):
        data = super().update_data(data)
        # Use ML utilities
        data = create_lag_features(data, n_lags=10)
        return data
    
    def calculate_positions(self, data):
        predictions = self.model.predict(data[feature_cols])
        data['side'] = predictions
        return data
```

---

*Date Removed: June 20, 2026*
*Phase: Phase 1 - Core Architecture Preservation*
