"""Strategy validation utilities.

This module provides tools to validate that strategies correctly implement
the required interface.

Examples
--------
Validate a strategy class:

>>> from stratestic.validation import StrategyValidator
>>> validator = StrategyValidator()
>>> is_valid, errors = validator.validate(MyStrategy)
>>> if not is_valid:
...     for error in errors:
...         print(f"Error: {error}")

Quick validation:

>>> from stratestic.validation import validate_strategy
>>> is_valid, errors = validate_strategy(MyStrategy)
"""

from stratestic.validation.validator import StrategyValidator, validate_strategy

__all__ = ['StrategyValidator', 'validate_strategy']
