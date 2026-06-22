"""
Stratestic Strategy Framework

This module provides the base classes for creating trading strategies.
All strategies must inherit from StrategyMixin and implement the required methods.

For multi-symbol strategies, use classes from stratestic.strategies.multi.

Examples
--------
Create a custom strategy:

>>> from stratestic.strategies import StrategyMixin
>>> 
>>> class MyStrategy(StrategyMixin):
...     def __init__(self, param1, **kwargs):
...         self._param1 = param1
...         self.params = {'param1': lambda x: int(x)}
...         super().__init__(**kwargs)
...     
...     def update_data(self, data):
...         data = super().update_data(data)
...         # Add your indicators here
...         return data
...     
...     def calculate_positions(self, data):
...         # Vectorized position logic
...         data['side'] = ...  # 1 (long), -1 (short), 0 (neutral)
...         return data
...     
...     def get_signal(self, row):
...         # Iterative signal logic
...         return 1  # or -1, or 0
"""

from stratestic.strategies._mixin import StrategyMixin

__all__ = ['StrategyMixin']
