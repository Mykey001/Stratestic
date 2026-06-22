# Contributing to Stratestic

Thank you for your interest in contributing to Stratestic! This document provides guidelines and information for contributors.

---

## 🎯 Project Philosophy

Stratestic v2.0 is a **backtesting framework, not a strategy library**. The core philosophy is:

✅ **We accept**: Framework improvements, bug fixes, performance enhancements, documentation  
❌ **We don't accept**: Built-in trading strategies, example strategies in core package

**Why?** We want to keep the framework lean, focused, and strategy-agnostic. Users bring their own strategies.

---

## 📋 How Can I Contribute?

### 1. Report Bugs 🐛

Found a bug? Please open an issue with:

- **Clear title**: Describe the bug in one line
- **Steps to reproduce**: Minimal code example
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: Python version, OS, stratestic version
- **Stack trace**: Full error message if applicable

**Example:**
```markdown
## Bug: VectorizedBacktester fails with leverage > 10

**Steps to reproduce:**
```python
from stratestic.backtesting import VectorizedBacktester
strategy = MyStrategy()
bt = VectorizedBacktester(strategy, leverage=15)
bt.run()  # Fails here
```

**Expected:** Should run with leverage=15  
**Actual:** Raises ValueError  
**Environment:** Python 3.10, Windows 10, stratestic 2.0.0
```

### 2. Suggest Features 💡

Have an idea for the framework? Open an issue with:

- **Use case**: What problem does it solve?
- **Proposed API**: How would users use it?
- **Alternatives considered**: Other ways to achieve the goal
- **Breaking changes**: Would it break existing code?

**Note:** Feature suggestions for trading strategies should go to a community forum or your own repository.

### 3. Improve Documentation 📚

Documentation improvements are always welcome:

- Fix typos or unclear explanations
- Add examples to docstrings
- Improve user guides
- Translate documentation (future)

### 4. Submit Code Changes 💻

See [Development Setup](#development-setup) and [Pull Request Process](#pull-request-process) below.

---

## 🚫 What We Don't Accept

### Trading Strategies

We **do not accept** pull requests that add trading strategies to the core package:

❌ New strategy implementations (MovingAverage, RSI, etc.)  
❌ ML strategy examples  
❌ Example portfolios  
❌ Indicator libraries

**Instead:**
- Create your own package (e.g., `stratestic-strategies`)
- Share in community forums
- Add to the [stratestic-examples](https://github.com/diogomatoschaves/stratestic-examples) repository (if it exists)

### Why?

1. **Maintenance burden**: Every strategy needs tests, docs, and updates
2. **Scope creep**: There are infinite strategies—we can't include them all
3. **Focus**: We want to excel at backtesting, not strategy collection
4. **User autonomy**: Users should own their strategies completely

---

## 🔧 Development Setup

### Prerequisites

- Python >= 3.10, < 3.13
- Git
- Poetry (recommended) or pip

### Setup Steps

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/stratestic.git
   cd stratestic
   ```

3. **Install dependencies**:
   
   With Poetry (recommended):
   ```bash
   poetry install --with dev
   ```
   
   Or with pip:
   ```bash
   pip install -e ".[dev]"
   ```

4. **Create a branch**:
   ```bash
   git checkout -b feature/my-feature
   # or
   git checkout -b fix/my-bugfix
   ```

5. **Make your changes**

6. **Run tests** (when available):
   ```bash
   poetry run pytest
   # or
   pytest
   ```

7. **Run linter**:
   ```bash
   poetry run ruff check stratestic/
   poetry run ruff format stratestic/
   ```

---

## 📝 Pull Request Process

### Before Submitting

- [ ] Code follows project style (use ruff formatter)
- [ ] All tests pass locally
- [ ] Added tests for new functionality
- [ ] Updated documentation (docstrings, guides)
- [ ] Checked for breaking changes
- [ ] Updated CHANGELOG.md (if applicable)

### PR Guidelines

1. **Clear title**: Describe what the PR does
   - ✅ "Fix VectorizedBacktester leverage calculation"
   - ✅ "Add support for custom optimization metrics"
   - ❌ "Updates"
   - ❌ "Fix bug"

2. **Description**: Include:
   - What problem does this solve?
   - What changes were made?
   - How to test it?
   - Any breaking changes?

3. **Small and focused**: One feature/fix per PR
   - ✅ PR fixes one specific bug
   - ❌ PR fixes 5 unrelated bugs + adds 3 features

4. **Tests**: Include tests for new code
   - Unit tests for functions
   - Integration tests for features
   - Edge case testing

5. **Documentation**: Update relevant docs
   - Docstrings for new/changed functions
   - User guides for new features
   - Migration notes for breaking changes

### Example PR Description

```markdown
## Fix: Incorrect Sharpe ratio calculation with negative returns

**Problem:**
The Sharpe ratio calculation was returning NaN when all returns were negative, 
instead of returning a negative Sharpe ratio.

**Changes:**
- Updated `_calculate_sharpe()` in `evaluation/_results.py`
- Added handling for zero standard deviation
- Added edge case tests

**Testing:**
```python
# Test case now passes
data = pd.DataFrame({'returns': [-0.01, -0.02, -0.01]})
sharpe = calculate_sharpe(data)
assert sharpe < 0  # Should be negative, not NaN
```

**Breaking Changes:** None
```

### Review Process

1. Maintainer reviews the PR
2. Automated tests run (CI/CD)
3. Feedback/changes requested if needed
4. Once approved, PR is merged
5. Changes included in next release

---

## 🧪 Testing Guidelines

### Test Organization

```
tests/
├── backtesting/           # Backtesting engine tests
├── strategies/            # Strategy interface tests
├── ml_utils/              # ML utilities tests
├── validation/            # Validation tests
└── integration/           # End-to-end tests
```

### Writing Tests

Use pytest:

```python
import pytest
from stratestic.backtesting import VectorizedBacktester

def test_backtest_basic_strategy():
    """Test basic backtesting functionality."""
    strategy = SimpleTestStrategy()
    bt = VectorizedBacktester(strategy, symbol="BTCUSDT")
    bt.load_data()
    results = bt.run()
    
    assert results is not None
    assert 'Total Return [%]' in results
    assert results['Total Return [%]'] != 0

def test_backtest_with_leverage():
    """Test backtesting with leverage."""
    strategy = SimpleTestStrategy()
    bt = VectorizedBacktester(strategy, leverage=5)
    bt.load_data()
    results = bt.run()
    
    assert results['Leverage'] == 5

@pytest.mark.parametrize("leverage", [1, 2, 5, 10])
def test_backtest_various_leverages(leverage):
    """Test backtesting with various leverage levels."""
    strategy = SimpleTestStrategy()
    bt = VectorizedBacktester(strategy, leverage=leverage)
    bt.load_data()
    results = bt.run()
    
    assert results['Leverage'] == leverage
```

### Test Best Practices

- ✅ Test one thing per test function
- ✅ Use descriptive test names
- ✅ Use fixtures for common setup
- ✅ Test edge cases (empty data, NaN values, etc.)
- ✅ Use parametrize for similar tests
- ❌ Don't test implementation details
- ❌ Don't write tests that depend on order

---

## 📐 Code Style

### Python Style

We use Ruff for linting and formatting:

```bash
# Check for issues
ruff check stratestic/

# Auto-format code
ruff format stratestic/
```

### Key Guidelines

1. **PEP 8 compliance**: Follow standard Python conventions
2. **Type hints**: Use type hints for function signatures (encouraged)
3. **Docstrings**: All public functions need docstrings
4. **Naming**:
   - Classes: `PascalCase`
   - Functions: `snake_case`
   - Constants: `UPPER_SNAKE_CASE`
   - Private: `_leading_underscore`

### Docstring Format

Use NumPy-style docstrings:

```python
def backtest_strategy(strategy, symbol, leverage=1):
    """
    Backtest a trading strategy on historical data.
    
    Parameters
    ----------
    strategy : StrategyMixin
        The trading strategy to backtest.
    symbol : str
        Trading pair symbol (e.g., 'BTCUSDT').
    leverage : int, optional
        Leverage multiplier, by default 1.
        
    Returns
    -------
    results : dict
        Dictionary containing backtest results including:
        - 'Total Return [%]': Overall return percentage
        - 'Sharpe Ratio': Risk-adjusted return
        - 'Max Drawdown [%]': Maximum drawdown percentage
        
    Raises
    ------
    ValueError
        If leverage is less than 1.
    DataError
        If strategy data is invalid or empty.
        
    Examples
    --------
    >>> strategy = MyStrategy()
    >>> results = backtest_strategy(strategy, "BTCUSDT", leverage=2)
    >>> print(results['Sharpe Ratio'])
    1.23
    """
    pass
```

---

## 🏗️ Architecture Guidelines

### Module Organization

```
stratestic/
├── backtesting/         # Core backtesting engines
│   ├── vectorized/      # Vectorized implementation
│   ├── iterative/       # Iterative implementation
│   ├── optimization/    # Parameter optimization
│   └── helpers/         # Shared utilities
├── strategies/          # Strategy interface only
│   └── _mixin.py        # StrategyMixin base class
├── ml_utils/            # ML utilities (optional)
├── validation/          # Strategy validation
└── utils/               # General utilities
```

### Design Principles

1. **Framework-agnostic**: Don't assume user's ML library or data source
2. **Backward compatible**: Avoid breaking changes when possible
3. **Performance**: Optimize hot paths (backtesting loops)
4. **Clear APIs**: Simple, intuitive function signatures
5. **Fail fast**: Validate inputs early, raise clear errors

### Adding New Features

When adding a feature:

1. **Discuss first**: Open an issue to discuss the design
2. **Start small**: Implement minimal version first
3. **Add tests**: Comprehensive test coverage
4. **Document**: Docstrings + user guide updates
5. **Benchmark**: Ensure no performance regression

---

## 🐛 Debugging Tips

### Running Tests in Debug Mode

```bash
# Run specific test
pytest tests/backtesting/test_vectorized.py::test_basic -v

# Run with print statements
pytest -s tests/backtesting/test_vectorized.py

# Run with debugger
pytest --pdb tests/backtesting/test_vectorized.py
```

### Common Issues

**Import errors after changes:**
```bash
# Reinstall package in development mode
pip install -e .
# or
poetry install
```

**Tests fail but code works:**
- Check if test data is outdated
- Verify test assumptions are still valid
- Look for timing-dependent tests

---

## 📦 Release Process

(For maintainers only)

1. Update version in `pyproject.toml`
2. Update `CHANGELOG.md`
3. Run full test suite
4. Create release branch: `release/vX.Y.Z`
5. Tag release: `git tag vX.Y.Z`
6. Build distributions: `poetry build`
7. Upload to PyPI: `poetry publish`
8. Create GitHub release with notes

---

## 🤝 Code of Conduct

### Our Standards

- **Be respectful**: Treat everyone with respect
- **Be constructive**: Provide helpful, actionable feedback
- **Be inclusive**: Welcome people of all backgrounds
- **Be patient**: Remember that contributors volunteer their time

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Personal attacks or trolling
- Publishing others' private information
- Unprofessional conduct

### Enforcement

Violations should be reported to the maintainers. We will review and take appropriate action, including warnings or bans.

---

## 📞 Getting Help

- **Documentation**: [README.md](README.md), [STRATEGY_GUIDE.md](STRATEGY_GUIDE.md)
- **Issues**: [GitHub Issues](https://github.com/diogomatoschaves/stratestic/issues)
- **Discussions**: [GitHub Discussions](https://github.com/diogomatoschaves/stratestic/discussions)
- **Questions**: Open an issue with the "question" label

---

## 🎓 Learning Resources

### For New Contributors

1. Read [README.md](README.md) - Understand the project
2. Read [STRATEGY_GUIDE.md](STRATEGY_GUIDE.md) - Learn the API
3. Browse existing issues - Find something to work on
4. Start small - Fix a typo or add a test

### Advanced Topics

- Vectorization in pandas/numpy
- Genetic algorithms for optimization
- Margin trading and leverage
- Performance profiling with cProfile

---

## 🙏 Thank You!

Every contribution helps make Stratestic better. Whether you fix a typo, report a bug, or add a feature—we appreciate your time and effort!

---

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

*Last Updated: June 2026*
