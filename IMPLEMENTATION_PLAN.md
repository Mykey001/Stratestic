# Implementation Plan: Stratestic Refactor
## Focus: Universal Strategy Backtesting + MT5 EA Conversion

---

## Executive Summary

Transform Stratestic from a library with built-in strategies to a **universal backtesting and optimization framework** that:
- ✅ Accepts **any Python trading strategy** (ML-based or rule-based)
- ✅ Automatically **converts MT5 Expert Advisors to Python**
- ✅ Provides **comprehensive backtesting** (vectorized + iterative)
- ✅ Offers **advanced optimization** (brute force + genetic algorithms)
- ✅ Maintains **multi-symbol portfolio support**
- ❌ **Removes all built-in strategy implementations**

---

## Phase 1: Core Architecture Preservation (Weeks 1-2)

### 1.1 Keep (Core Backtesting Engine)
**Files to KEEP and ENHANCE:**

```
✅ stratestic/backtesting/
   ├── vectorized/_vectorized.py       # Keep - Core engine
   ├── iterative/_iterative.py         # Keep - Core engine
   ├── _mixin.py                        # Keep - Shared functionality
   ├── optimization/_optimization.py   # Keep - Essential
   └── helpers/
       ├── evaluation/                  # Keep - Metrics
       ├── margin/                      # Keep - Risk management
       └── plotting/                    # Keep - Visualization
```

**Rationale**: These modules provide the framework-agnostic backtesting infrastructure.

---

### 1.2 Remove (Built-in Strategies)
**Files to DELETE:**

```
❌ stratestic/strategies/
   ├── moving_average/          # DELETE - Example strategies
   ├── mean_reversion/          # DELETE - Example strategies
   ├── trend/                   # DELETE - Example strategies
   ├── machine_learning/        # DELETE (but extract ML helpers)
   └── multi/                   # KEEP (BroadcastStrategy needed for multi-symbol)
```

**Actions:**
1. Delete all concrete strategy implementations
2. Extract ML utilities before deletion (see Phase 2.3)
3. Keep only `_mixin.py` (StrategyMixin base class)
4. Keep `multi/` for multi-symbol support

---

### 1.3 Refactor Strategy Combination
**File: `backtesting/combining/_combining.py`**

**Changes:**
- ✅ Keep `StrategyCombiner` (framework feature, not a strategy)
- ✅ Update validation to accept any strategy inheriting from `StrategyMixin`
- ❌ Remove dependency on `STRATEGIES` constant
- ✅ Add runtime validation instead of compile-time checks

```python
# NEW validation approach
@staticmethod
def _check_input(strategies, method):
    for strategy in strategies:
        if not isinstance(strategy, StrategyMixin):
            raise StrategyInvalid(
                f"{strategy.__class__.__name__} must inherit from StrategyMixin"
            )
```

---

## Phase 2: New Core Features (Weeks 3-5)

### 2.1 Universal Strategy Interface

**New File: `stratestic/strategies/base.py`**

Enhance `StrategyMixin` to be more flexible:

```python
class StrategyMixin:
    """
    Universal base class for ANY trading strategy.
    
    Users must implement:
    - calculate_positions(data) -> DataFrame with 'side' column
    - get_signal(row) -> int (1=long, -1=short, 0=neutral)
    
    Optional ML integration:
    - set_model(model) -> Attach pre-trained model
    - predict(features) -> Use model for signals
    """
    
    def __init__(self, data=None, **kwargs):
        # Existing initialization
        self._ml_model = None
        self._feature_columns = []
        
    def set_model(self, model, feature_columns=None):
        """Attach a pre-trained ML model to the strategy."""
        self._ml_model = model
        self._feature_columns = feature_columns or []
        
    def predict(self, features):
        """Use attached ML model for predictions."""
        if self._ml_model is None:
            raise ValueError("No ML model attached. Use set_model() first.")
        return self._ml_model.predict(features)
```

---

### 2.2 MT5 Expert Advisor Converter

**New Module: `stratestic/mt5_converter/`**

```
stratestic/mt5_converter/
├── __init__.py
├── parser.py           # Parse MT5 MQL5 code
├── translator.py       # Convert MQL5 to Python
├── strategy_builder.py # Build StrategyMixin subclass
├── indicators.py       # Map MT5 indicators to Python equivalents
└── templates/          # Strategy code templates
```

#### 2.2.1 Parser (`parser.py`)
**Purpose**: Parse MQL5 Expert Advisor files

```python
class MT5Parser:
    """
    Parses MQL5 Expert Advisor code to extract:
    - Input parameters
    - OnInit() logic
    - OnTick() logic (main trading logic)
    - Custom functions
    - Indicator usage
    """
    
    def parse_file(self, mql5_file_path) -> dict:
        """
        Returns:
        {
            'parameters': {...},
            'init_code': str,
            'tick_code': str,
            'functions': {...},
            'indicators': [...]
        }
        """
        pass
```

#### 2.2.2 Translator (`translator.py`)
**Purpose**: Convert MQL5 syntax to Python

```python
class MQL5ToPython:
    """
    Translates MQL5 code constructs to Python equivalents.
    
    Mappings:
    - iMA() -> pandas rolling mean
    - OrderSend() -> strategy signal
    - OrderClose() -> position management
    - Symbol info -> data columns
    """
    
    INDICATOR_MAP = {
        'iMA': 'data["{col}"].rolling({period}).mean()',
        'iRSI': 'ta.momentum.RSIIndicator(data["{col}"], {period}).rsi()',
        'iMACD': 'ta.trend.MACD(...)',
        'iBands': 'ta.volatility.BollingerBands(...)',
    }
    
    def translate_function(self, mql5_code: str) -> str:
        """Translate MQL5 function to Python."""
        pass
    
    def translate_indicator(self, indicator_call: str) -> str:
        """Convert MT5 indicator to Python equivalent."""
        pass
```

#### 2.2.3 Strategy Builder (`strategy_builder.py`)
**Purpose**: Generate runnable Python strategy class

```python
class StrategyBuilder:
    """
    Builds a complete Python strategy class from translated MQL5 code.
    """
    
    def build_strategy(self, parsed_ea: dict, translated_code: dict) -> str:
        """
        Generates:
        
        class ConvertedMT5Strategy(StrategyMixin):
            def __init__(self, param1=value1, param2=value2, ...):
                # Converted parameters
                
            def update_data(self, data):
                # Converted indicator calculations
                
            def calculate_positions(self, data):
                # Converted trading logic (vectorized)
                
            def get_signal(self, row):
                # Converted trading logic (iterative)
        """
        pass
    
    def save_strategy(self, strategy_code: str, output_path: str):
        """Save generated strategy to .py file."""
        pass
```

#### 2.2.4 Indicators Mapper (`indicators.py`)
**Purpose**: Map MT5 indicators to Python libraries

```python
class IndicatorMapper:
    """
    Maps MT5 indicators to Python implementations using:
    - pandas (for simple indicators)
    - ta (technical analysis library)
    - pandas_ta (alternative)
    - custom implementations
    """
    
    @staticmethod
    def get_python_equivalent(mt5_indicator: str) -> dict:
        """
        Returns:
        {
            'library': 'ta' | 'pandas' | 'custom',
            'function': 'module.function',
            'parameters': {...}
        }
        """
        pass
```

#### 2.2.5 CLI Interface

**New File: `stratestic/cli.py`**

```python
import click

@click.group()
def cli():
    """Stratestic CLI - Universal Strategy Backtesting"""
    pass

@cli.command()
@click.argument('mt5_file', type=click.Path(exists=True))
@click.option('--output', '-o', default='converted_strategy.py')
@click.option('--validate', is_flag=True, help='Validate conversion')
def convert_mt5(mt5_file, output, validate):
    """Convert MT5 Expert Advisor to Python strategy."""
    from stratestic.mt5_converter import MT5Converter
    
    converter = MT5Converter()
    strategy = converter.convert(mt5_file)
    converter.save(strategy, output)
    
    if validate:
        converter.validate(strategy)
    
    click.echo(f"✓ Converted {mt5_file} -> {output}")

@cli.command()
@click.argument('strategy_file', type=click.Path(exists=True))
def validate_strategy(strategy_file):
    """Validate a Python strategy file."""
    from stratestic.validation import StrategyValidator
    
    validator = StrategyValidator()
    is_valid, errors = validator.validate(strategy_file)
    
    if is_valid:
        click.echo("✓ Strategy is valid")
    else:
        for error in errors:
            click.echo(f"✗ {error}")
```

**Usage:**
```bash
# Convert MT5 EA to Python
stratestic convert-mt5 MyEA.mq5 -o my_strategy.py --validate

# Validate a Python strategy
stratestic validate-strategy my_strategy.py
```

---

### 2.3 ML Strategy Helpers (Extracted)

**New Module: `stratestic/ml_utils/`**

Extract ML utilities from the old machine_learning strategy:

```
stratestic/ml_utils/
├── __init__.py
├── features.py         # Feature engineering (lag, rolling, etc.)
├── training.py         # Model training utilities
├── evaluation.py       # Model evaluation
└── persistence.py      # Model save/load
```

**Purpose**: Provide ML utilities WITHOUT prescribing a specific strategy.

**Example Usage:**
```python
from stratestic.ml_utils import create_lag_features, train_model

# User's custom ML strategy
class MyMLStrategy(StrategyMixin):
    def update_data(self, data):
        data = super().update_data(data)
        # Use extracted utilities
        data = create_lag_features(data, n_lags=10)
        return data
```

---

### 2.4 Strategy Validation System

**New File: `stratestic/validation/validator.py`**

```python
class StrategyValidator:
    """
    Validates that a strategy class correctly implements the required interface.
    """
    
    def validate(self, strategy_class_or_file):
        """
        Checks:
        1. Inherits from StrategyMixin
        2. Implements calculate_positions()
        3. Implements get_signal()
        4. Has valid params attribute
        5. No obvious errors in update_data()
        """
        errors = []
        
        # Check inheritance
        if not issubclass(strategy_class, StrategyMixin):
            errors.append("Must inherit from StrategyMixin")
            
        # Check required methods
        if not hasattr(strategy_class, 'calculate_positions'):
            errors.append("Missing calculate_positions() method")
            
        if not hasattr(strategy_class, 'get_signal'):
            errors.append("Missing get_signal() method")
            
        # Try instantiation
        try:
            strategy = strategy_class()
        except Exception as e:
            errors.append(f"Cannot instantiate: {e}")
            
        return len(errors) == 0, errors
```

---

## Phase 3: Documentation & Examples (Week 6)

### 3.1 Create User Documentation

**New File: `docs/STRATEGY_GUIDE.md`**

```markdown
# Creating Trading Strategies for Stratestic

## Option 1: Convert from MT5 Expert Advisor

$ stratestic convert-mt5 MyEA.mq5 -o my_strategy.py

## Option 2: Write Python Strategy from Scratch

### Rule-Based Strategy Example
[Full example with code]

### ML-Based Strategy Example
[Full example with code]

## Required Methods
- calculate_positions(data)
- get_signal(row)
- update_data(data)

## Using ML Models
[Examples of integrating scikit-learn, PyTorch, TensorFlow models]
```

---

### 3.2 Update README.md

**Major Changes:**
1. Remove all built-in strategy examples
2. Add MT5 conversion section
3. Update quickstart with user-defined strategy
4. Add "Bring Your Own Strategy" philosophy

**New Structure:**
```markdown
# Stratestic - Universal Strategy Backtesting

## Features
- ✅ Backtest ANY Python trading strategy
- ✅ Convert MT5 Expert Advisors automatically
- ✅ Vectorized & Iterative engines
- ✅ Advanced optimization (Brute Force + Genetic)
- ✅ Multi-symbol portfolio support
- ✅ ML model integration

## Quick Start

### 1. Convert MT5 EA
$ stratestic convert-mt5 MyEA.mq5

### 2. Or Create Python Strategy
[Example]

### 3. Backtest
[Example]

### 4. Optimize
[Example]
```

---

### 3.3 Example Strategies Repository

**New Repo: `stratestic-examples`** (separate from main package)

```
stratestic-examples/
├── rule_based/
│   ├── simple_ma_crossover.py
│   ├── rsi_mean_reversion.py
│   └── breakout_strategy.py
├── ml_based/
│   ├── sklearn_random_forest.py
│   ├── lstm_price_prediction.py
│   └── reinforcement_learning.py
├── mt5_converted/
│   ├── example_ea_1.mq5
│   ├── example_ea_1_converted.py
│   └── conversion_notes.md
└── README.md
```

**Key Point**: Examples are SEPARATE from the main package.

---

## Phase 4: Testing & Quality (Week 7)

### 4.1 Update Tests

**Actions:**
1. ✅ Keep all backtesting engine tests
2. ✅ Keep optimization tests
3. ❌ Delete built-in strategy tests
4. ✅ Add MT5 converter tests
5. ✅ Add strategy validation tests

**New Tests:**
```
tests/
├── backtesting/          # Keep all existing tests
├── mt5_converter/        # NEW
│   ├── test_parser.py
│   ├── test_translator.py
│   ├── test_strategy_builder.py
│   └── fixtures/
│       ├── sample_ea_1.mq5
│       ├── sample_ea_2.mq5
│       └── expected_outputs/
├── validation/           # NEW
│   ├── test_validator.py
│   └── test_strategies/
│       ├── valid_strategy.py
│       └── invalid_strategy.py
└── ml_utils/            # NEW
    ├── test_features.py
    ├── test_training.py
    └── test_persistence.py
```

---

### 4.2 Create MT5 Conversion Test Suite

**Test Coverage:**
- ✅ Parse simple EA successfully
- ✅ Parse complex EA with multiple indicators
- ✅ Translate common MT5 functions
- ✅ Generate valid Python strategy
- ✅ Converted strategy passes validation
- ✅ Converted strategy runs in backtester
- ✅ Results match MT5 (within tolerance)

---

## Phase 5: Package Restructuring (Week 8)

### 5.1 Update pyproject.toml

**Changes:**
```toml
[tool.poetry]
name = "stratestic"
version = "2.0.0"  # Major version bump
description = "Universal backtesting framework for Python trading strategies with MT5 EA conversion"

[tool.poetry.dependencies]
python = ">=3.10,<3.13"
# Existing dependencies...
click = "^8.1"          # NEW: CLI support
lark-parser = "^0.12"   # NEW: MQL5 parsing
astor = "^0.8"          # NEW: Python AST manipulation

[tool.poetry.scripts]
stratestic = "stratestic.cli:cli"  # NEW: CLI entry point

[tool.poetry.extras]
ml = ["scikit-learn", "tensorflow", "torch"]  # Optional ML dependencies
```

---

### 5.2 Updated Package Structure

```
stratestic/
├── __init__.py
├── backtesting/              # ✅ KEEP (enhanced)
│   ├── vectorized/
│   ├── iterative/
│   ├── optimization/
│   ├── combining/            # ✅ KEEP (refactored)
│   ├── helpers/
│   └── _mixin.py
├── strategies/               # ⚠️  REFACTORED
│   ├── __init__.py          # Export only StrategyMixin
│   ├── _mixin.py            # ✅ KEEP (enhanced)
│   └── multi/               # ✅ KEEP (multi-symbol support)
├── mt5_converter/           # ✅ NEW
│   ├── __init__.py
│   ├── parser.py
│   ├── translator.py
│   ├── strategy_builder.py
│   ├── indicators.py
│   └── templates/
├── ml_utils/                # ✅ NEW (extracted)
│   ├── __init__.py
│   ├── features.py
│   ├── training.py
│   ├── evaluation.py
│   └── persistence.py
├── validation/              # ✅ NEW
│   ├── __init__.py
│   └── validator.py
├── utils/                   # ✅ KEEP
│   ├── panel.py
│   ├── data/
│   └── helpers/
├── cli.py                   # ✅ NEW
└── trading/                 # ✅ KEEP (future live trading)
```

---

## Phase 6: Migration Guide (Week 9)

### 6.1 Create Migration Document

**File: `MIGRATION_V1_TO_V2.md`**

```markdown
# Migrating from Stratestic v1.x to v2.0

## Breaking Changes

### ❌ Built-in Strategies Removed
**v1.x:**
```python
from stratestic.strategies import MovingAverageCrossover
```

**v2.0:**
Built-in strategies removed. Use the examples repository or create your own.

### ✅ Strategy Interface Unchanged
Your custom strategies still work! No changes needed if you:
- Inherit from StrategyMixin
- Implement calculate_positions() and get_signal()

## New Features

### 1. MT5 Conversion
```bash
stratestic convert-mt5 MyEA.mq5 -o my_strategy.py
```

### 2. ML Utilities
```python
from stratestic.ml_utils import create_lag_features, train_model
```

### 3. Strategy Validation
```python
from stratestic.validation import StrategyValidator
validator = StrategyValidator()
validator.validate(MyStrategy)
```
```

---

## Implementation Priority Matrix

| Phase | Priority | Effort | Impact | Timeline |
|-------|----------|--------|--------|----------|
| Phase 1: Core Cleanup | 🔴 Critical | Low | High | Week 1-2 |
| Phase 2.1: Strategy Interface | 🔴 Critical | Medium | High | Week 3 |
| Phase 2.2: MT5 Converter | 🟡 High | High | High | Week 3-5 |
| Phase 2.3: ML Utils | 🟡 High | Low | Medium | Week 3 |
| Phase 2.4: Validation | 🟢 Medium | Low | Medium | Week 4 |
| Phase 3: Documentation | 🔴 Critical | Medium | High | Week 6 |
| Phase 4: Testing | 🔴 Critical | High | High | Week 7 |
| Phase 5: Packaging | 🟡 High | Low | Medium | Week 8 |
| Phase 6: Migration | 🟢 Medium | Low | High | Week 9 |

---

## Risk Assessment

### Technical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| MT5 parsing complexity | 🟡 Medium | Start with simple EAs, incremental support |
| MQL5 → Python semantic gaps | 🟡 Medium | Document unsupported features clearly |
| Breaking existing users | 🔴 High | Clear migration guide, deprecation warnings |
| Test coverage gaps | 🟢 Low | Comprehensive test suite for new features |

### User Impact Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Learning curve for new interface | 🟡 Medium | Extensive documentation + examples |
| Loss of built-in strategies | 🔴 High | Provide examples repository, conversion tools |
| MT5 conversion accuracy | 🟡 Medium | Validation suite, manual review recommendations |

---

## Success Metrics

### Technical Metrics
- ✅ MT5 converter success rate: **>80%** for common EAs
- ✅ Test coverage: **>85%** for core modules
- ✅ Documentation coverage: **100%** of public APIs
- ✅ Performance: No regression in backtest speed

### User Metrics
- ✅ Migration path for v1 users: **<1 hour** average
- ✅ MT5 conversion time: **<5 minutes** per EA
- ✅ Strategy creation time: **<30 minutes** for experienced users

---

## Deliverables Checklist

### Code
- [ ] Delete built-in strategy implementations
- [ ] Enhance StrategyMixin with ML support
- [ ] Implement MT5 parser
- [ ] Implement MQL5 → Python translator
- [ ] Implement strategy builder
- [ ] Create CLI interface
- [ ] Extract ML utilities
- [ ] Create strategy validator
- [ ] Update StrategyCombiner
- [ ] Refactor package structure

### Documentation
- [ ] Update README.md
- [ ] Create STRATEGY_GUIDE.md
- [ ] Create MT5_CONVERSION_GUIDE.md
- [ ] Create MIGRATION_V1_TO_V2.md
- [ ] Update API documentation
- [ ] Create tutorial notebooks
- [ ] Create video walkthroughs

### Testing
- [ ] Update existing tests
- [ ] Create MT5 converter tests
- [ ] Create validation tests
- [ ] Create ML utils tests
- [ ] Integration tests for full workflow
- [ ] Performance benchmarks

### Infrastructure
- [ ] Update pyproject.toml
- [ ] Update CI/CD pipelines
- [ ] Create examples repository
- [ ] Update PyPI package metadata
- [ ] Create release notes

---

## Post-Launch Roadmap

### Version 2.1 (3 months post-launch)
- **Enhanced MT5 Support**: Custom indicators, Expert Advisor templates
- **Strategy Marketplace**: Share/discover community strategies
- **Web UI**: Browser-based strategy testing

### Version 2.2 (6 months post-launch)
- **TradingView Pine Script Converter**: Similar to MT5 converter
- **Real-time Backtesting**: Stream live data during backtest
- **Advanced ML Integration**: AutoML, neural architecture search

### Version 3.0 (12 months post-launch)
- **Live Trading Engine**: Deploy strategies to live markets
- **Risk Management System**: Position sizing, portfolio constraints
- **Multi-Exchange Support**: Connect to various exchanges

---

## Conclusion

This implementation plan transforms Stratestic from a **library with examples** to a **universal framework** that:

1. ✅ **Accepts any strategy** - Users bring their own logic
2. ✅ **Automates MT5 conversion** - Leverage existing MT5 strategies
3. ✅ **Maintains core strengths** - Backtesting, optimization, multi-symbol
4. ✅ **Enables ML integration** - Without prescribing specific approaches
5. ✅ **Provides professional tools** - Validation, CLI, documentation

**Next Steps:**
1. Review and approve this plan
2. Create detailed technical specifications for MT5 converter
3. Set up project tracking (Jira, GitHub Projects, etc.)
4. Begin Phase 1 implementation

---

*Plan Version: 1.0*  
*Created: June 2026*  
*Estimated Timeline: 9 weeks*  
*Estimated Effort: ~250-300 developer hours*
