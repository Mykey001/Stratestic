# Changelog

All notable changes to Stratestic will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-06-20

### 🎉 Major Release - Universal Backtesting Framework

Stratestic 2.0 represents a complete architectural shift to a "Bring Your Own Strategy" (BYOS) philosophy. The framework now focuses on providing backtesting infrastructure rather than example strategies.

### ✨ Added

#### New Modules
- **`ml_utils/`** - Standalone ML utilities module
  - `features.py` - Feature engineering (lag, rolling, labels)
  - `training.py` - Model training pipelines
  - `evaluation.py` - Model evaluation and metrics
  - `defaults.py` - Default estimators and parameters
  - `pipeline.py` - Custom sklearn transformers
  
- **`validation/`** - Strategy validation system
  - `validator.py` - StrategyValidator class for checking strategy implementations
  - Runtime validation of strategy interface compliance
  
- **`cli.py`** - Command-line interface
  - `stratestic validate-strategy` command
  - Strategy validation from command line

#### Enhanced Features
- **ML Model Attachment** - `StrategyMixin.set_model()` and `predict()` methods
  - Attach pre-trained models from any framework (sklearn, PyTorch, TensorFlow)
  - Use ML models within strategy logic
  
- **Strategy Validation** - Comprehensive validation API
  - Check required method implementations
  - Validate params attribute
  - Verify strategy instantiation
  
- **Documentation**
  - Complete user guides (QUICK_START_V2.md, STRATEGY_GUIDE.md)
  - Migration guide (MIGRATION_GUIDE_v1_to_v2.md)
  - Comprehensive codebase documentation (CODEBASE_INDEX.md)
  - Implementation plan and project vision documents

### 🔄 Changed

#### Architecture
- **Strategy Framework** - Simplified to framework-only code
  - `strategies/__init__.py` now exports only `StrategyMixin`
  - Removed all example strategy implementations
  - Cleaner separation of framework vs examples

- **StrategyCombiner** - Runtime validation
  - Uses `isinstance()` check instead of registry lookup
  - More flexible - accepts ANY StrategyMixin subclass
  - No registration required

- **Package Metadata**
  - Version bumped to 2.0.0
  - Updated description to reflect new philosophy
  - Added ML utilities keywords

### ❌ Removed

#### Built-in Strategies (Breaking)
- `MovingAverage` - Use custom implementation or examples repo
- `MovingAverageCrossover` - Use custom implementation or examples repo
- `MovingAverageConvergenceDivergence` (MACD) - Use custom implementation or examples repo
- `BollingerBands` - Use custom implementation or examples repo
- `Momentum` - Use custom implementation or examples repo
- `MachineLearning` - Use ml_utils with custom strategy class

**Migration Path**: See [MIGRATION_GUIDE_v1_to_v2.md](MIGRATION_GUIDE_v1_to_v2.md)

#### Internal Files
- `strategies/properties.py` - Strategy registry (replaced with runtime validation)
- `strategies/_helpers.py` - Strategy-specific helpers (no longer needed)

### 🐛 Fixed

- None (new major version)

### 🔐 Security

- Model loading now explicitly warns about dill security (arbitrary code execution)
- Strategy validation helps prevent malformed strategies

### 📝 Documentation

#### New Documentation
- `QUICK_START_V2.md` - Complete user guide with examples
- `STRATEGY_GUIDE.md` - Comprehensive strategy creation guide
- `MIGRATION_GUIDE_v1_to_v2.md` - v1.x to v2.0 migration
- `IMPLEMENTATION_PLAN.md` - Development roadmap
- `PROJECT_VISION.md` - Strategic vision and philosophy
- `CODEBASE_INDEX.md` - Complete architecture documentation
- `REMOVED_STRATEGIES.md` - Documentation of removed code

#### Updated Documentation
- `README.md` - Completely rewritten for v2.0
- `pyproject.toml` - Updated version and metadata

### 🔧 Dependencies

#### Added
- No new dependencies

#### Changed
- Description updated to reflect ML utilities focus

#### Removed
- No dependencies removed

### ⚠️ Breaking Changes

#### 1. Built-in Strategies Removed

**Before (v1.x):**
```python
from stratestic.strategies import MovingAverageCrossover
strategy = MovingAverageCrossover(50, 200)
```

**After (v2.0):**
```python
# Option 1: Create your own
class MovingAverageCrossover(StrategyMixin):
    # Your implementation

# Option 2: Use examples repository (coming soon)
# from stratestic_examples import MovingAverageCrossover
```

#### 2. ML Strategy Class Removed

**Before (v1.x):**
```python
from stratestic.strategies import MachineLearning
ml = MachineLearning(estimator="Random Forest", ...)
```

**After (v2.0):**
```python
from stratestic.strategies import StrategyMixin
from stratestic.ml_utils import train_model, create_lag_features

class MyMLStrategy(StrategyMixin):
    def __init__(self, model, **kwargs):
        super().__init__(**kwargs)
        self.set_model(model)
    # Implement required methods

model, results, *_ = train_model('Random Forest', X, y)
strategy = MyMLStrategy(model=model)
```

#### 3. Strategy Properties Removed

**Before (v1.x):**
```python
from stratestic.strategies.properties import STRATEGIES
```

**After (v2.0):**
Not needed - strategies are validated at runtime with `isinstance()`

### ✅ Non-Breaking Changes

#### Custom Strategies Still Work
If you created custom strategies in v1.x, they work unchanged in v2.0:

```python
# This still works!
class MyCustomStrategy(StrategyMixin):
    def calculate_positions(self, data):
        ...
    def get_signal(self, row):
        ...
```

#### Backtesting API Unchanged
All backtesting functionality remains identical:

```python
# Same API as v1.x
bt = VectorizedBacktester(strategy, symbol="BTCUSDT")
bt.load_data()
bt.run()
bt.optimize({'param': (10, 50)})
```

### 📊 Metrics

- **Code Removed**: ~2,000 lines (built-in strategies)
- **Code Added**: ~1,700 lines (ml_utils + validation + cli + docs)
- **Net Change**: ~500 lines removed (cleaner codebase)
- **Documentation**: ~52,000 words added

### 🎯 Upgrade Guide

See [MIGRATION_GUIDE_v1_to_v2.md](MIGRATION_GUIDE_v1_to_v2.md) for detailed upgrade instructions.

**Estimated Migration Time:**
- Built-in strategy users: 1-2 hours per strategy
- ML strategy users: 2-3 hours
- Custom strategy users: 15-30 minutes (mostly testing)

---

## [1.0.0] - Previous

Legacy version with built-in strategies.

See git history for v1.x changes.

---

## Versioning Policy

- **Major** (2.0.0): Breaking changes, architectural changes
- **Minor** (2.1.0): New features, non-breaking additions
- **Patch** (2.0.1): Bug fixes, documentation updates

---

## Upcoming Features

### v2.1.0 (Planned)
- MT5 Expert Advisor converter
- Enhanced strategy validation (more checks)
- Additional CLI commands
- TradingView Pine Script converter (research)

### v2.2.0 (Planned)
- Enhanced ML utilities (more algorithms)
- Real-time backtesting mode
- Performance improvements

### v3.0.0 (Future)
- Live trading engine
- Multi-exchange support
- Web UI for backtesting
- Advanced risk management

---

*For more details on any release, see the corresponding release notes and documentation.*
