# Stratestic Codebase Index

## Overview

**Stratestic** is a comprehensive Python library for backtesting, analyzing, and optimizing trading strategies. It provides both vectorized and iterative backtesting engines, pre-implemented trading strategies, machine learning integration, multi-symbol portfolio support, and sophisticated optimization capabilities.

**Version**: 1.0.0  
**License**: MIT  
**Python Compatibility**: >=3.10, <3.13  
**Repository**: https://github.com/diogomatoschaves/stratestic

---

## Core Architecture

### 1. Backtesting Engines

#### **VectorizedBacktester** (`stratestic/backtesting/vectorized/_vectorized.py`)
- **Purpose**: Fast backtesting using vectorized operations on entire datasets
- **Advantages**: Speed and efficiency for testing strategies on large datasets
- **Limitations**: Less flexible for complex strategies requiring bar-by-bar logic
- **Key Methods**:
  - `_vectorized_backtest()` - Single-symbol backtesting
  - `_vectorized_backtest_panel()` - Multi-symbol backtesting
  - `_retrieve_trades()` - Extracts trade information from positions
  - `_calculate_margin_ratio()` - Margin calculations for leveraged positions
  - `_evaluate_backtest()` - Performance metrics calculation

#### **IterativeBacktester** (`stratestic/backtesting/iterative/_iterative.py`)
- **Purpose**: Bar-by-bar simulation of trading
- **Advantages**: Maximum flexibility for complex strategies with stateful logic
- **Limitations**: Slower than vectorized approach
- **Key Methods**:
  - `_iterative_backtest()` - Single-symbol iteration
  - `_iterative_backtest_panel()` - Multi-symbol iteration
  - `buy_instrument()` - Execute long positions
  - `sell_instrument()` - Execute short positions
  - `close_pos()` - Close open positions
  - `_handle_trade()` - Record trade details

#### **BacktestMixin** (`stratestic/backtesting/_mixin.py`)
- **Purpose**: Shared functionality for both backtesting engines
- **Features**:
  - Data loading and preprocessing
  - Leverage and margin management
  - Results calculation and visualization
  - Optimization interface
  - Multi-symbol (panel) support
- **Key Methods**:
  - `load_data()` - Load and prepare data for backtesting
  - `run()` - Execute backtest with specified parameters
  - `optimize()` - Run parameter optimization
  - `maximum_leverage()` - Calculate safe leverage levels
  - `plot_results()` - Visualize backtest results
  - `_run_panel_backtest()` - Multi-symbol backtest coordination

---

### 2. Strategy Framework

#### **StrategyMixin** (`stratestic/strategies/_mixin.py`)
- **Purpose**: Base class for all trading strategies
- **Core Concepts**:
  - Vectorized position calculation via `calculate_positions()`
  - Per-row signal generation via `get_signal()`
  - Data preprocessing and feature calculation
  - Parameter management
- **Key Attributes**:
  - `params`: OrderedDict of strategy parameters
  - `data`: DataFrame with OHLCV and derived features
  - `_trade_on_close`: Execute on close vs open price
- **Key Methods**:
  - `update_data()` - Calculate indicators and prepare data
  - `calculate_positions()` - Vectorized position logic (must implement)
  - `get_signal()` - Iterative signal logic (must implement)
  - `set_parameters()` - Update strategy parameters dynamically

---

### 3. Built-in Strategies

#### **Moving Average Strategies**
- **MovingAverage** (`strategies/moving_average/ma.py`)
  - Simple trend-following based on price vs moving average
  - Parameters: `window` (MA period), `moving_av` (sma/ema)

- **MovingAverageCrossover** (`strategies/moving_average/ma_crossover.py`)
  - Classic dual moving average crossover
  - Parameters: `sma_s` (short MA), `sma_l` (long MA), `moving_av` (sma/ema)
  - Signal: Long when short MA > long MA, short otherwise

- **MovingAverageConvergenceDivergence** (`strategies/moving_average/macd.py`)
  - MACD indicator-based strategy
  - Parameters: `slow`, `fast`, `signal` periods

#### **Mean Reversion Strategies**
- **BollingerBands** (`strategies/mean_reversion/`)
  - Mean reversion using Bollinger Bands
  - Parameters: `window`, `std_dev` (standard deviations)

#### **Trend Strategies**
- **Momentum** (`strategies/trend/`)
  - Momentum-based strategy
  - Parameters: `window` (lookback period)

#### **Machine Learning Strategy** (`strategies/machine_learning/machine_learning.py`)
- **Purpose**: Flexible ML-based trading strategy
- **Supported Estimators**:
  - Classification: Linear, Nearest Neighbors, Linear SVM, RBF SVM, Gaussian Process, Decision Tree, Random Forest, Neural Net, AdaBoost
  - Regression: Same options configured for regression
- **Key Features**:
  - Automatic feature engineering (lag features, rolling features)
  - Time-series cross-validation
  - Model persistence (save/load)
  - Learning curve visualization
- **Parameters**:
  - `estimator`: ML algorithm choice
  - `model_type`: "classification" or "regression"
  - `nr_lags`: Number of lag observations
  - `window`: Rolling window size
  - `polynomial_degree`: Feature polynomial expansion
  - `test_size`: Train/test split ratio
- **Methods**:
  - `learning_curve()` - Plot learning curves
  - `save_model()` / `load_model()` - Model persistence

#### **Multi-Symbol Strategies**
- **BroadcastStrategy** (`strategies/multi/`)
  - Applies a single-symbol strategy independently to each symbol
  - Shared parameter set across all symbols
  - Useful for portfolio-wide optimization

- **MultiSymbolStrategyMixin** (`strategies/multi/`)
  - Base class for cross-sectional strategies
  - Enables joint decision-making across symbols (e.g., pairs trading)
  - Methods:
    - `calculate_positions()` - Returns positions for all symbols
    - `calculate_weights()` - Optional dynamic capital allocation

---

### 4. Strategy Combination

#### **StrategyCombiner** (`backtesting/combining/_combining.py`)
- **Purpose**: Combine multiple strategies into a single trading system
- **Combination Methods**:
  - **Unanimous**: Signal only when all strategies agree
  - **Majority**: Signal based on majority vote
- **Features**:
  - Can optimize combined strategies
  - Parameters passed as list of dicts (one per strategy)
- **Limitations**: Does not support multi-symbol panels (use BroadcastStrategy instead)

---

### 5. Optimization

#### **Optimization Module** (`backtesting/optimization/_optimization.py`)
- **Purpose**: Find optimal strategy parameters
- **Algorithms**:
  1. **Brute Force** (`optimizer='brute_force'`)
     - Exhaustively tests all parameter combinations
     - Guaranteed to find global optimum in search space
     - Can be slow for large parameter spaces
  
  2. **Genetic Algorithm** (`optimizer='gen_alg'`)
     - Evolutionary optimization using `geneal` library
     - Much faster for large search spaces
     - No guarantee of global optimum
     - Configurable: `pop_size`, `max_gen`, `mutation_rate`, `selection_rate`, etc.

- **Optimization Metrics**:
  - Return, Sharpe Ratio, Calmar Ratio, Sortino Ratio
  - Win Rate, Profit Factor, System Quality Number (SQN), Expectancy
  - Volatility, Max/Avg Drawdown, Drawdown Duration

- **API**: `backtest.optimize(params, optimizer='brute_force', optimization_metric='Return', ...)`

---

### 6. Multi-Symbol (Panel) Support

#### **Panel Utilities** (`utils/panel.py`)
- **Purpose**: Build and validate multi-symbol DataFrames
- **Data Structure**: DataFrame with `(symbol, field)` MultiIndex columns
- **Key Functions**:
  - `build_panel()` - Construct panel from dict of per-symbol DataFrames
  - `is_panel()` - Check if DataFrame is a valid panel
  - `panel_symbols()` - Extract symbol list
  - `validate_panel()` - Validate panel structure and required fields

#### **Panel Backtesting Features**
- **Capital Management**: Single cross-collateralized cash pool
- **Position Sizing**: Equal-weight allocation or custom weights via `calculate_weights()`
- **Leverage**: Bounded by total notional headroom (`equity × leverage`)
- **Margin**: Isolated margin per position using Binance brackets
- **Liquidations**: Per-position liquidation (doesn't affect other positions)
- **Different Histories**: Symbols can have different date ranges (outer join support)
- **Benchmark**: Equal-weight buy & hold averaged over listed periods

---

### 7. Leverage and Margin

#### **Margin Module** (`backtesting/helpers/margin/_margin.py`)
- **Purpose**: Calculate margin requirements and liquidation risk
- **Model**: Follows Binance futures rules
  - Isolated margin
  - One-way position mode
- **Key Functions**:
  - Margin ratio calculation
  - Liquidation detection
  - Maximum safe leverage calculation
- **Margin Ratio**: `abs(notional) / (margin + unrealized_pnl)`
  - Ratio ≥ 1.0 triggers liquidation
- **Bracket System**: Different leverage limits for different notional sizes

#### **Short Position Models** (via `short_model` parameter)
- **"static"** (default):
  - Real fixed-units short
  - PnL = `1 - exit/entry`
  - Profit capped at +100%, wiped out if price doubles
  - Matches actual exchange behavior
  
- **"inverse"**:
  - Continuously-rebalanced inverse position
  - PnL = `entry/exit - 1`
  - Unbounded profit potential, damped losses
  - Common in vectorized backtesting frameworks

---

### 8. Evaluation and Metrics

#### **Metrics Module** (`backtesting/helpers/evaluation/metrics.py`)
- **Performance Metrics**:
  - Returns: Total, Annualized, Buy & Hold comparison
  - Risk-Adjusted: Sharpe, Sortino, Calmar ratios
  - Drawdowns: Max/Avg drawdown and duration
  - Trade Statistics: Win rate, Profit Factor, Expectancy
  - System Quality Number (SQN)
- **Results Object** (`_results.py`): Structured container for backtest results
- **Constants** (`_constants.py`): Metric definitions and display formats

---

### 9. Helper Modules

#### **Trade Module** (`backtesting/helpers/trade.py`)
- Trade representation and management
- Trade statistics calculation

#### **Equity Module** (`backtesting/helpers/_equity.py`)
- Equity curve calculation
- Cumulative returns tracking

#### **Plotting Module** (`backtesting/helpers/plotting/_plotting.py`)
- Comprehensive visualization of backtest results
- Equity curves, drawdowns, trade markers
- Multi-symbol portfolio visualization with per-symbol contributions
- Margin ratio evolution plots

---

### 10. Machine Learning Helpers

#### **Feature Engineering** (`strategies/machine_learning/helpers/_feature_engineering.py`)
- `get_lag_features()` - Create lagged features for time series
- `get_rolling_features()` - Rolling window statistics
- `get_labels()` - Generate target labels from returns

#### **Training** (`strategies/machine_learning/helpers/_training.py`)
- Model training pipelines
- Cross-validation
- Feature preprocessing (scaling, polynomial features)

#### **Evaluation** (`strategies/machine_learning/helpers/_evaluation.py`)
- Model performance metrics
- Learning curve generation
- Prediction evaluation

#### **Defaults** (`strategies/machine_learning/helpers/_defaults.py`)
- Default estimator configurations
- Parameter mappings

---

## Project Structure

```
stratestic/
├── backtesting/
│   ├── combining/          # Strategy combination
│   ├── helpers/
│   │   ├── evaluation/     # Performance metrics
│   │   ├── margin/         # Leverage and margin calculations
│   │   └── plotting/       # Visualization
│   ├── iterative/          # Iterative backtester
│   ├── optimization/       # Optimization algorithms
│   ├── vectorized/         # Vectorized backtester
│   └── _mixin.py           # Shared backtesting functionality
├── strategies/
│   ├── machine_learning/   # ML strategy and helpers
│   ├── mean_reversion/     # Mean reversion strategies
│   ├── moving_average/     # Moving average strategies
│   ├── multi/              # Multi-symbol strategies
│   ├── trend/              # Trend-following strategies
│   └── _mixin.py           # Base strategy class
├── trading/                # Live trading utilities
├── utils/
│   ├── data/               # Data handling utilities
│   ├── exceptions/         # Custom exceptions
│   ├── helpers/            # General helper functions
│   └── panel.py            # Multi-symbol data structures
└── __init__.py
```

---

## Testing

### Test Structure (`tests/`)
- **backtesting/**
  - `test_engine_consistency.py` - Single-symbol engine validation
  - `test_panel_engine_consistency.py` - Multi-symbol engine validation
  - `test_panel_guards_and_broadcast.py` - Panel input validation
  - `test_panel_hand_computed.py` - Hand-computed test cases
  - `test_panel_margin.py` - Margin and liquidation tests
  - `combining/` - Strategy combination tests
  - `helpers/` - Helper module tests
  - `iterative/` - Iterative backtester tests
  - `vectorized/` - Vectorized backtester tests

- **strategies/** - Strategy implementation tests
- **utils/** - Utility function tests
- **setup/** - Test fixtures and data

### Test Configuration
- **pytest.ini**: Timeout set to 30s, `NUMBA_DISABLE_JIT=1` for reproducible tests
- **Coverage**: Tracked via codecov.io
- **CI/CD**: GitHub Actions workflows for testing and PyPI publishing

---

## Key Dependencies

### Core Libraries
- **pandas** (^2.1): Data manipulation
- **numpy** (^1.26): Numerical computations (< 2.0 for geneal compatibility)
- **scipy** (^1.11): Optimization algorithms
- **numba** (^0.59): JIT compilation for performance (< 0.60 for geneal)

### Visualization
- **matplotlib** (^3.8): Static plotting
- **seaborn** (^0.13): Statistical visualizations
- **plotly** (^5.14): Interactive plots

### Machine Learning
- **scikit-learn** (^1.3): ML algorithms and preprocessing
- **dill** (^0.3.8): Model serialization

### Technical Analysis
- **ta** (^0.11): Technical indicators

### Optimization
- **geneal** (^0.8.3): Genetic algorithm optimization

### Utilities
- **humanfriendly** (^10.0): Human-readable formatting
- **progressbar2** (^4.2.0): Progress tracking

---

## Usage Patterns

### 1. Basic Vectorized Backtest
```python
from stratestic.backtesting import VectorizedBacktester
from stratestic.strategies import MovingAverageCrossover

strategy = MovingAverageCrossover(sma_s=50, sma_l=200)
backtester = VectorizedBacktester(strategy, symbol="BTCUSDT", 
                                   amount=10000, trading_costs=0.1)
backtester.load_data()  # or load_data(custom_dataframe)
backtester.run()
```

### 2. Optimization
```python
# Brute force
backtester.optimize(
    {"sma_s": (20, 60, 5), "sma_l": (100, 200, 10)},
    optimization_metric="Sharpe Ratio"
)

# Genetic algorithm
backtester.optimize(
    {"sma_s": (20, 60), "sma_l": (100, 200)},
    optimizer="gen_alg",
    pop_size=20,
    max_gen=30,
    mutation_rate=0.15
)
```

### 3. Leveraged Trading
```python
backtester = VectorizedBacktester(strategy, symbol="BTCUSDT",
                                   leverage=5, margin_threshold=0.8)
backtester.load_data()
backtester.run()

# Find maximum safe leverage
max_leverage = backtester.maximum_leverage(margin_threshold=0.8)
```

### 4. Multi-Symbol Portfolio
```python
from stratestic.utils.panel import build_panel
from stratestic.strategies.multi import BroadcastStrategy

panel = build_panel({"BTCUSDT": btc_df, "ETHUSDT": eth_df})
strategy = BroadcastStrategy(MovingAverageCrossover(50, 200), data=panel)
backtester = VectorizedBacktester(strategy, amount=10000)
backtester.run()
```

### 5. Machine Learning Strategy
```python
from stratestic.strategies import MachineLearning

ml_strategy = MachineLearning(
    estimator="Random Forest",
    model_type="classification",
    nr_lags=10,
    window=20,
    test_size=0.2,
    save_model=True
)
backtester = IterativeBacktester(ml_strategy, symbol="BTCUSDT")
backtester.load_data()
backtester.run()
ml_strategy.learning_curve()
```

### 6. Combined Strategies
```python
from stratestic.backtesting.combining import StrategyCombiner

strategies = [
    MovingAverageCrossover(30, 150),
    Momentum(70),
    BollingerBands(20, 2)
]
combined = StrategyCombiner(strategies, method="Unanimous")
backtester = VectorizedBacktester(combined, symbol="BTCUSDT")
backtester.run()
```

---

## Design Principles

1. **Dual Engine Architecture**: Separate vectorized and iterative engines for speed vs flexibility
2. **Strategy Abstraction**: Common base class for all strategies with clear interface
3. **Composability**: Strategies can be combined and optimized together
4. **Extensibility**: Easy to create custom strategies following the StrategyMixin pattern
5. **Real-World Modeling**: Accurate margin, leverage, and liquidation modeling
6. **Multi-Symbol First-Class**: Panel support throughout the backtesting pipeline
7. **Optimization-Ready**: Built-in optimization with multiple algorithms and metrics
8. **Comprehensive Metrics**: Wide range of performance and risk metrics

---

## Extension Points

### Creating Custom Strategies
1. Inherit from `StrategyMixin`
2. Define `params` as an OrderedDict
3. Implement `update_data()` to calculate indicators
4. Implement `calculate_positions()` for vectorized backtesting
5. Implement `get_signal()` for iterative backtesting

### Creating Multi-Symbol Strategies
1. Inherit from `MultiSymbolStrategyMixin`
2. Implement `calculate_positions()` returning positions for all symbols
3. Optionally implement `calculate_weights()` for dynamic allocation

---

## Performance Considerations

- **Numba JIT**: Used for performance-critical calculations (disable with `NUMBA_DISABLE_JIT=1` for debugging)
- **Vectorization**: Prefer vectorized operations over loops when possible
- **Panel Data**: Inner join by default to maintain alignment (use outer join for different histories)
- **Optimization**: Genetic algorithms recommended for >10,000 parameter combinations

---

## Integration

- **MyCryptoBot**: Seamless integration with live trading bot
- **Data Sources**: Flexible data loading (CSV, DataFrame, custom sources)
- **Model Persistence**: ML models can be saved/loaded for consistency

---

## Version & Compatibility

- **Current Version**: 1.0.0
- **Python**: 3.10 - 3.12 (3.13 blocked by geneal dependency)
- **NumPy**: < 2.0 (geneal compatibility)
- **Breaking Changes**: Panel short model limited to "static" only

---

## CI/CD & Quality

- **GitHub Actions**:
  - `run-tests.yml`: Automated testing on push
  - `publish-to-pypi.yml`: Automated PyPI publishing
- **Code Coverage**: Tracked via codecov.io
- **Linting**: Ruff with Python 3.10 target
- **Code Style**: PEP 8 with E501 (line length) exception

---

*Last Updated: June 2026*
*Generated from codebase analysis of Stratestic v1.0.0*
