import copy

import pandas as pd

from stratestic.backtesting.combining import StrategyCombiner
from stratestic.backtesting.helpers.evaluation import SIDE
from stratestic.strategies.multi._mixin import MultiSymbolStrategyMixin


class BroadcastStrategy(MultiSymbolStrategyMixin):
    """
    Applies one single-symbol strategy independently to every symbol of a
    panel: each symbol gets its own clone of the strategy (so per-symbol
    state like indicator data or fitted models never leaks across symbols),
    while the parameters stay owned by the single template instance - one
    optimizable parameter set shared by all symbols.

    Example
    -------
    >>> panel = build_panel({"BTCUSDT": btc_df, "ETHUSDT": eth_df})
    >>> strategy = BroadcastStrategy(MovingAverageCrossover(20, 50), data=panel)
    >>> vect = VectorizedBacktester(strategy)
    """

    def __init__(self, strategy, data=None, **kwargs):
        if isinstance(strategy, StrategyCombiner):
            raise NotImplementedError(
                "Broadcasting a StrategyCombiner is not supported; broadcast "
                "a single strategy instead."
            )

        self._template = strategy
        self._strategies = {}
        self.params = strategy.params

        kwargs.setdefault('trade_on_close', strategy._trade_on_close)
        kwargs.setdefault('close_col', strategy._close_col)
        kwargs.setdefault('open_col', strategy._open_col)
        kwargs.setdefault('high_col', strategy._high_col)
        kwargs.setdefault('low_col', strategy._low_col)
        kwargs.setdefault('returns_col', strategy._returns_col)

        MultiSymbolStrategyMixin.__init__(self, data, **kwargs)

    def __repr__(self):
        params = ", ".join(
            f"{param}={getattr(self._template, f'_{param}')}"
            for param in self._template.get_params()
        )
        return f"{type(self).__name__} · {type(self._template).__name__}({params})"

    def __getattr__(self, attr):
        # expose the template's parameter attributes (_ma, _window, ...) so
        # the optimizer's getattr(strategy, f"_{param}") works unchanged
        if attr in ("_template", "_strategies"):
            raise AttributeError(attr)

        try:
            return getattr(self._template, attr)
        except AttributeError:
            raise AttributeError(
                f"'{type(self).__name__}' object (and its template strategy) "
                f"has no attribute '{attr}'"
            ) from None

    def update_data(self, data) -> pd.DataFrame:
        data = super().update_data(data)

        for symbol in self.symbols:
            strategy = self._strategies.get(symbol)
            if strategy is None:
                strategy = copy.deepcopy(self._template)
                strategy.symbol = symbol
                self._strategies[symbol] = strategy

            sub = strategy.update_data(data[symbol].copy())
            strategy.data = sub

            # overwrite unconditionally (matching the scalar update_data
            # contract): a stale indicator from a previous run must not survive
            for column in sub.columns:
                data[(symbol, column)] = sub[column]

        return data

    def calculate_positions(self, data) -> pd.DataFrame:
        for symbol in self.symbols:
            strategy = self._strategies[symbol]

            # compute the wrapped strategy's positions on the rows where this
            # symbol's data and indicators are ready, leaving NaN on its
            # warm-up / pre-listing bars (so the engine never sees a spurious
            # position on a bar where the indicators aren't valid)
            valid = data[symbol].dropna()
            sides = strategy.calculate_positions(valid.copy())[SIDE]
            data[(symbol, SIDE)] = sides.reindex(data.index)

        return data

    def get_signal(self, row=None):
        if row is None:
            row = self.data.iloc[-1]

        signals = {}
        for symbol in self.symbols:
            sub = row[symbol]
            # flat where the symbol's data isn't ready yet (warm-up / unlisted)
            signals[symbol] = 0 if sub.isna().any() else self._strategies[symbol].get_signal(sub)

        return signals

    def get_params(self, **kwargs):
        return self._template.get_params()

    def set_parameters(self, params=None, data=None) -> None:
        if params is None:
            return

        template_params = self._template.get_params()

        for param, new_value in params.items():
            setattr(self._template, f"_{param}", template_params[param](new_value))

        # re-clone so every symbol picks up the new parameters
        self._strategies = {}

        data = data.copy() if data is not None \
            else self._original_data.copy() if self._original_data is not None \
            else self.data.copy()

        self.data = self.update_data(data)
