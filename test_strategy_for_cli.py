"""
Test strategy file for CLI validation testing.
"""

from stratestic.strategies import StrategyMixin


class TestStrategy(StrategyMixin):
    """
    A simple test strategy for CLI validation.
    Long when price is above moving average, short otherwise.
    """
    
    def __init__(self, period=20, **kwargs):
        """
        Initialize the test strategy.
        
        Parameters
        ----------
        period : int, default=20
            The period for the moving average.
        """
        self._period = period
        self.params = {'period': lambda x: int(x)}
        super().__init__(**kwargs)
    
    def update_data(self, data):
        """Add moving average indicator."""
        data = super().update_data(data)
        data['ma'] = data['close'].rolling(self._period).mean()
        return data
    
    def calculate_positions(self, data):
        """Calculate positions (vectorized)."""
        data['side'] = (data['close'] > data['ma']).astype(int) * 2 - 1
        return data
    
    def get_signal(self, row):
        """Get signal for single row (iterative)."""
        return 1 if row['close'] > row['ma'] else -1


class InvalidTestStrategy(StrategyMixin):
    """
    An invalid strategy missing required methods.
    This should fail validation.
    """
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    
    # Missing calculate_positions() and get_signal()
