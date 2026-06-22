"""Valid strategy for testing."""

from stratestic.strategies import StrategyMixin


class MovingAverageCrossover(StrategyMixin):
    """
    Moving average crossover strategy.
    Buy when fast MA > slow MA, sell when fast MA < slow MA.
    """
    
    def __init__(self, fast=20, slow=50, **kwargs):
        """
        Parameters
        ----------
        fast : int, default=20
            Fast moving average period.
        slow : int, default=50
            Slow moving average period.
        """
        self._fast = fast
        self._slow = slow
        self.params = {
            'fast': lambda x: int(x),
            'slow': lambda x: int(x)
        }
        super().__init__(**kwargs)
    
    def update_data(self, data):
        """Calculate moving averages."""
        data = super().update_data(data)
        data['ma_fast'] = data['close'].rolling(self._fast).mean()
        data['ma_slow'] = data['close'].rolling(self._slow).mean()
        return data
    
    def calculate_positions(self, data):
        """Vectorized positions."""
        data['side'] = (data['ma_fast'] > data['ma_slow']).astype(int) * 2 - 1
        return data
    
    def get_signal(self, row):
        """Iterative signal."""
        return 1 if row['ma_fast'] > row['ma_slow'] else -1
