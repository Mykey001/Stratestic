# Stratestic 2.0 Release Checklist

## Pre-Release Tasks

### Phase 1: Core Refactoring ✅ COMPLETE
- [✅] Extract ML utilities to `ml_utils/`
- [✅] Remove all built-in strategies
- [✅] Refactor StrategyCombiner
- [✅] Update package exports
- [✅] Create documentation

**Status:** Core refactoring complete, tests need fixing

---

### Phase 1.5: Test Suite Fixes 🔄 IN PROGRESS
**Priority:** CRITICAL (must complete before Phase 2)

#### Create Test Strategies
- [ ] Create `tests/strategies/test_strategies/` directory
- [ ] Create `SimpleTestStrategy` (basic rule-based)
- [ ] Create `ParameterizedTestStrategy` (for optimization tests)
- [ ] Create `MLTestStrategy` (for ML tests)
- [ ] Create `MultiSymbolTestStrategy` (for panel tests)

#### Update Test Files
- [ ] `tests/strategies/test_strategies.py`
  - Replace `MachineLearning` imports
  - Use new test strategies
- [ ] `tests/strategies/test_strategy_mixin.py`
  - Replace `MovingAverageConvergenceDivergence` import
  - Use simple test strategy
- [ ] `tests/strategies/test_machine_learning.py`
  - DELETE (MachineLearning class removed)
  - Create `tests/ml_utils/test_ml_utils.py` instead
- [ ] `tests/backtesting/vectorized/test_vectorized.py`
  - Replace all built-in strategy imports
  - Use test strategies
- [ ] `tests/backtesting/vectorized/test_vectorized_with_margin.py`
  - Replace `MovingAverage` import
- [ ] `tests/backtesting/iterative/test_iterative.py`
  - Replace built-in strategy imports
- [ ] `tests/backtesting/combining/test_combining.py`
  - Replace built-in strategy imports
- [ ] `tests/backtesting/test_panel_*.py`
  - Replace `Momentum`, `MovingAverage` imports
  - Use test strategies
- [ ] `tests/setup/test_data/sample_data.py`
  - Remove STRATEGIES dictionary
- [ ] All `tests/**/in/*.py` fixture files
  - Replace strategy imports

#### Create ML Utils Tests
- [ ] `tests/ml_utils/test_features.py`
- [ ] `tests/ml_utils/test_training.py`
- [ ] `tests/ml_utils/test_evaluation.py`
- [ ] `tests/ml_utils/test_defaults.py`
- [ ] `tests/ml_utils/test_pipeline.py`

#### Run Test Suite
- [ ] Fix all import errors
- [ ] Fix all test failures
- [ ] Achieve >85% coverage
- [ ] All tests passing locally
- [ ] All tests passing in CI

**Estimated Time:** 4-6 hours

---

### Phase 2: New Features (After tests pass)

#### 2.1: Enhanced Strategy Interface
- [ ] Add `set_model()` method to StrategyMixin
- [ ] Add `predict()` method to StrategyMixin
- [ ] Update StrategyMixin docstrings
- [ ] Add ML model attachment examples

#### 2.2: Strategy Validation
- [ ] Create `stratestic/validation/` module
- [ ] Implement `StrategyValidator` class
- [ ] Add validation for required methods
- [ ] Add validation for params attribute
- [ ] Create validation tests

#### 2.3: CLI Interface (Basic)
- [ ] Create `stratestic/cli.py`
- [ ] Add `validate-strategy` command
- [ ] Add basic help system
- [ ] Update pyproject.toml with CLI entry point

---

### Phase 3: Documentation

#### Core Documentation
- [ ] Update README.md
  - Remove built-in strategy examples
  - Add "Bring Your Own Strategy" section
  - Add ML utilities section
  - Update quick start
- [ ] Create MIGRATION_v1_to_v2.md
  - Breaking changes
  - Migration examples
  - FAQ
- [ ] Create STRATEGY_GUIDE.md
  - How to create strategies
  - Required interface
  - Best practices
  - Common patterns
- [ ] Update CONTRIBUTING.md
  - New contribution guidelines
  - No built-in strategies accepted
  - Examples go to separate repo

#### API Documentation
- [ ] Update all docstrings
- [ ] Generate API docs (Sphinx/mkdocs)
- [ ] Review and update inline code comments

#### Examples
- [ ] Create stratestic-examples repository
- [ ] Port removed strategies as examples:
  - MovingAverage
  - MovingAverageCrossover
  - MACD
  - BollingerBands
  - Momentum
- [ ] Add ML strategy examples:
  - sklearn RandomForest
  - sklearn LogisticRegression
  - Basic neural network
- [ ] Add advanced examples:
  - Strategy combining
  - Multi-symbol portfolio
  - Custom optimization metrics

---

### Phase 4: Package Updates

#### pyproject.toml
- [ ] Bump version to 2.0.0
- [ ] Update description
- [ ] Update keywords
- [ ] Update classifiers
- [ ] Add CLI entry point
- [ ] Review dependencies

#### CI/CD
- [ ] Update GitHub Actions workflows
- [ ] Ensure tests run on PR
- [ ] Ensure tests run on push to main
- [ ] Add coverage reporting
- [ ] Add lint checks

#### Package Metadata
- [ ] Update LICENSE if needed
- [ ] Update AUTHORS
- [ ] Update CHANGELOG.md
- [ ] Create RELEASE_NOTES.md for v2.0

---

### Phase 5: Quality Assurance

#### Code Quality
- [ ] Run linter (ruff)
- [ ] Fix all linting errors
- [ ] Run type checker (mypy) if using
- [ ] Fix all type errors
- [ ] Remove unused imports
- [ ] Remove dead code

#### Performance
- [ ] Profile backtesting performance
- [ ] Ensure no regression vs v1.x
- [ ] Optimize hot paths if needed
- [ ] Document performance characteristics

#### Security
- [ ] Review all user-facing inputs
- [ ] Check for code injection risks
- [ ] Review file I/O operations
- [ ] Update security policy if needed

---

### Phase 6: Pre-Release Testing

#### Manual Testing
- [ ] Test basic strategy creation
- [ ] Test vectorized backtesting
- [ ] Test iterative backtesting
- [ ] Test optimization (brute force)
- [ ] Test optimization (genetic algorithm)
- [ ] Test strategy combining
- [ ] Test multi-symbol backtesting
- [ ] Test ML utilities
- [ ] Test with leverage/margin
- [ ] Test data loading (CSV, DataFrame)

#### Integration Testing
- [ ] Test with real historical data
- [ ] Test with multiple symbols
- [ ] Test with various strategy types
- [ ] Test optimization with large parameter spaces
- [ ] Test memory usage with large datasets

#### Compatibility Testing
- [ ] Test on Python 3.10
- [ ] Test on Python 3.11
- [ ] Test on Python 3.12
- [ ] Test on Windows
- [ ] Test on macOS
- [ ] Test on Linux

---

### Phase 7: Release Preparation

#### Version Control
- [ ] Create release branch (release/v2.0)
- [ ] Tag release commit (v2.0.0)
- [ ] Update version in all locations
- [ ] Push tags to GitHub

#### Distribution
- [ ] Build source distribution
- [ ] Build wheel
- [ ] Test installation from dist
- [ ] Upload to TestPyPI
- [ ] Test installation from TestPyPI
- [ ] Upload to PyPI

#### Announcements
- [ ] Write release blog post
- [ ] Prepare social media posts
- [ ] Update project website
- [ ] Notify community channels
- [ ] Update documentation site

---

## Post-Release Tasks

### Monitoring (Week 1)
- [ ] Monitor GitHub issues
- [ ] Respond to bug reports
- [ ] Address critical issues quickly
- [ ] Update FAQ based on questions
- [ ] Gather user feedback

### Documentation (Week 2)
- [ ] Add tutorials based on user questions
- [ ] Improve examples based on feedback
- [ ] Create video walkthrough
- [ ] Update troubleshooting guide

### Future Planning (Week 3-4)
- [ ] Plan Phase 2.2 (MT5 Converter)
- [ ] Gather requirements for v2.1
- [ ] Prioritize feature requests
- [ ] Create roadmap for next 6 months

---

## Critical Path

### Must Complete Before Release
1. ✅ Phase 1: Core refactoring
2. 🔄 Phase 1.5: Fix test suite (IN PROGRESS)
3. ⏳ Phase 3: Documentation (BLOCKED by tests)
4. ⏳ Phase 4: Package updates (BLOCKED by tests)
5. ⏳ Phase 5: Quality assurance (BLOCKED by tests)
6. ⏳ Phase 6: Pre-release testing (BLOCKED by QA)
7. ⏳ Phase 7: Release (BLOCKED by testing)

### Can Defer to v2.1
- MT5 Converter (Phase 2.2 from original plan)
- Advanced CLI features
- Web UI
- Additional ML utilities

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Test suite takes longer than expected | High | High | Allocate 2x time buffer |
| Breaking changes cause user churn | Medium | High | Excellent migration guide + examples |
| Performance regression | Low | High | Benchmark before release |
| Documentation incomplete | Medium | Medium | Prioritize core docs first |
| Dependencies break | Low | High | Lock dependency versions |
| ML utilities have bugs | Medium | Medium | Comprehensive tests |

---

## Success Criteria

### Technical
- [ ] All tests passing (>85% coverage)
- [ ] No performance regression
- [ ] Clean linter output
- [ ] Successful installation on all platforms

### Documentation
- [ ] Complete README
- [ ] Complete migration guide
- [ ] Complete strategy guide
- [ ] Working examples

### User Experience
- [ ] Users can create strategies easily
- [ ] Migration from v1.x is clear
- [ ] Examples cover common use cases
- [ ] Error messages are helpful

### Community
- [ ] Positive initial feedback
- [ ] Low bug report rate
- [ ] Active engagement on issues
- [ ] Contributors interested in examples

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1 ✅ | 2-3 hours | None |
| Phase 1.5 🔄 | 4-6 hours | Phase 1 |
| Phase 2 | 6-8 hours | Phase 1.5 |
| Phase 3 | 4-6 hours | Phase 1.5 |
| Phase 4 | 2-3 hours | Phase 3 |
| Phase 5 | 3-4 hours | Phase 4 |
| Phase 6 | 4-6 hours | Phase 5 |
| Phase 7 | 2-3 hours | Phase 6 |

**Total Estimated Time:** 27-39 hours (3.5-5 work days)

**Recommended Schedule:**
- Week 1: Phase 1.5 (tests) + Phase 2
- Week 2: Phase 3 (docs) + Phase 4 (package)
- Week 3: Phase 5 (QA) + Phase 6 (testing)
- Week 4: Phase 7 (release) + monitoring

---

## Current Status

**Phase:** 1 Complete, 1.5 In Progress  
**Completion:** ~15% of total work  
**Next Task:** Fix test suite  
**Blocker:** None  
**Risk Level:** Low

---

*Last Updated: June 20, 2026*  
*Next Review: After test suite fixed*
