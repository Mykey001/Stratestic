import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.io as pio
from plotly.subplots import make_subplots

from stratestic.backtesting.helpers.evaluation import CUM_SUM_STRATEGY, CUM_SUM_STRATEGY_TC, BUY_AND_HOLD, MARGIN_RATIO
from stratestic.backtesting.helpers.evaluation.metrics import get_drawdowns, get_dd_durations_limits

# qualitative palette used to give each symbol a consistent colour across the
# per-symbol equity lines and its trade markers
SYMBOL_PALETTE = [
    "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
    "#8c564b", "#e377c2", "#17becf", "#bcbd22", "#7f7f7f",
]


def _symbol_colors(symbols):
    return {symbol: SYMBOL_PALETTE[i % len(SYMBOL_PALETTE)] for i, symbol in enumerate(symbols)}


def _panel_symbols(data):
    """Symbols of a panel backtest, in column order, from the equity_<symbol>
    contribution columns (empty for a single-symbol backtest)."""
    return [col[len("equity_"):] for col in data.columns if col.startswith("equity_")]


def plot_backtest_results(
    data,
    trades,
    margin_threshold,
    index_frequency,
    offset=0,
    plot_margin_ratio=False,
    show_plot_no_tc=False,
    title=''
):
    """
    Plots backtesting results for a trading strategy.

    Parameters
    ----------
    data : pandas.DataFrame
        DataFrame containing the following columns:
        - 'accumulated_strategy_returns_tc': accumulated returns including trading costs
        - 'accumulated_strategy_returns': accumulated returns without trading costs
        - 'accumulated_returns': accumulated returns without trading costs
    trades : pandas.DataFrame
        DataFrame containing trade information, including the following columns:
        - 'entry_date': entry date of the trade
        - 'side': side of the trade (-1 for short, 1 for long)
        - 'profit': profit of the trade
        - 'units': size of the side
    margin_threshold : float
        threshold for maximum allowed margin ratio
    index_frequency : string
        frequency of the index of the data
    offset : int
        Offset for vertical margin of the plot.
    plot_margin_ratio: bool, optional
        Whether to plot the margin ratio curve
    show_plot_no_tc : bool, optional
        Whether to plot equity without trading costs (default is False)
    title : str, optional
        Title to show on the backtesting results

    Returns
    -------
        None (displays plot using Plotly)

    """

    number_rows = 3 if plot_margin_ratio else 2

    subplot_titles = ["Portfolio Equity", "Trade P&L (%)"]
    if plot_margin_ratio:
        subplot_titles.append("Margin Ratio (%)")

    fig = make_subplots(
        rows=number_rows, cols=1, shared_xaxes=True,
        vertical_spacing=0.08, subplot_titles=subplot_titles,
    )

    symbol_colors = _symbol_colors(_panel_symbols(data))

    plot_equity_curves(fig, data, show_plot_no_tc, index_frequency, symbol_colors)

    plot_trades(fig, trades, symbol_colors)

    height = 1000

    if plot_margin_ratio:
        plot_margin_ratios(fig, data, margin_threshold)

        height = height + 350

    variable_offset = 25 * offset

    fig.update_layout(
        title=dict(text=title, yref="container", y=0.97, yanchor="top", font=dict(size=15)),
        height=height + variable_offset,
        showlegend=True,
        margin=dict(t=115 + variable_offset, l=70, r=160),
        template="plotly_white",
        # a light tint on the plot area (paper stays white) gives the panels
        # some separation from the surrounding margin
        plot_bgcolor="#f4f5fa",
        legend=dict(groupclick="toggleitem", font=dict(size=11)),
        hovermode="x unified",
    )

    # break-even reference at the initial capital, and a 0% line for trade pnl
    initial_amount = data[CUM_SUM_STRATEGY_TC].iloc[0]
    fig.add_hline(y=initial_amount, line=dict(color="lightgray", width=1, dash="dot"), row=1, col=1)
    fig.add_hline(y=0, line=dict(color="lightgray", width=1, dash="dot"), row=2, col=1)

    fig.update_yaxes(title_text='Value (USD)', row=1, col=1)
    fig.update_yaxes(title_text='Trade P&L (%)', row=2, col=1)
    fig.update_yaxes(title_text='Margin Ratio (%)', row=3, col=1)

    fig.update_xaxes(title_text='Date', row=number_rows, col=1, showticklabels=True, overwrite=True)

    # open in the browser; set here rather than at import time so that simply
    # importing the library doesn't override the global plotly renderer
    pio.renderers.default = "browser"

    fig.show()


def plot_margin_ratios(fig, data, margin_threshold):

    fig.add_trace(go.Scatter(
        x=data[MARGIN_RATIO].index,
        y=data[MARGIN_RATIO],
        name='Margin Ratio',
        line=dict(
            width=1.5,
            color='darkcyan'
        )
    ), row=3, col=1)

    threshold = margin_threshold * 100
    start = data[MARGIN_RATIO].index[0]
    end = data[MARGIN_RATIO].index[-1]

    fig.add_trace(go.Scatter(
        x=[start, end],
        y=[threshold, threshold],
        name='Margin Ratio Threshold',
        mode='lines',
        line=dict(
            color='red',
            width=1,
            dash='dot'
        )
    ), row=3, col=1)


def plot_equity_curves(fig, data, show_plot_no_tc, index_frequency, symbol_colors=None):

    fig.add_trace(go.Scatter(
        x=data.index,
        y=data[CUM_SUM_STRATEGY_TC],
        name='Equity',
        line=dict(
            width=2,
            color='steelblue'
        )
    ), row=1, col=1)

    fig.add_trace(go.Scatter(
        x=data.index,
        y=data[BUY_AND_HOLD],
        name='Buy & Hold',
        line=dict(
            color='Silver',
            width=1.5
        )
    ), row=1, col=1)

    # per-symbol equity contribution lines (panel backtests): thin, each in
    # its own colour, summing to the portfolio equity
    for symbol, color in (symbol_colors or {}).items():
        fig.add_trace(go.Scatter(
            x=data.index,
            y=data[f"equity_{symbol}"],
            name=f"{symbol} equity",
            legendgroup=symbol,
            line=dict(width=1, color=color),
            opacity=0.7,
        ), row=1, col=1)

    if show_plot_no_tc:
        fig.add_trace(go.Scatter(
            x=data.index,
            y=data[CUM_SUM_STRATEGY],
            name='Equity (no trading costs)',
            line=dict(
                width=0.8,
                color='Silver'
            )
        ), row=1, col=1)

    # plot drawdowns
    close_date = data.index.shift(1, freq=index_frequency)

    durations, limits = get_dd_durations_limits(data[CUM_SUM_STRATEGY_TC], close_date)

    x = []
    y = []
    for limit in limits:
        x.extend(limit)
        x.append(None)

        value = data[CUM_SUM_STRATEGY_TC].loc[limit[0]]

        y.extend([value, value])
        y.append(None)

    fig.add_trace(go.Scatter(
        x=x,
        y=y,
        name='Drawdown',
        showlegend=False,
        mode='lines',
        line=dict(
            color='Gold',
            width=1
        )
    ), row=1, col=1)

    # plot max drawdown duration
    if len(durations) > 0:
        max_duration_index = np.argmax(durations)

        start, end = limits[max_duration_index]
        value = data[CUM_SUM_STRATEGY_TC].loc[start]

        fig.add_trace(go.Scatter(
            x=[start, end],
            y=[value, value],
            name='Max Drawdown Duration',
            showlegend=False,
            mode='lines',
            opacity=0.45,
            line=dict(
                color='indianred',
                width=1,
                dash='dot'
            )
        ), row=1, col=1)

    # plot peak equity point
    peak_index = data[CUM_SUM_STRATEGY_TC].argmax()
    peak_time = data.index[peak_index]
    peak_value = data[CUM_SUM_STRATEGY_TC].iloc[peak_index]

    fig.add_trace(go.Scatter(
        x=[peak_time],
        y=[peak_value],
        name='Peak',
        mode='markers',
        marker=dict(
            color='MediumBlue',
            size=8
        )
    ), row=1, col=1)

    # Plot lowest equity point
    low_index = data[CUM_SUM_STRATEGY_TC].argmin()
    low_time = data.index[low_index]
    low_value = data[CUM_SUM_STRATEGY_TC].iloc[low_index]

    fig.add_trace(go.Scatter(
        x=[low_time],
        y=[low_value],
        name='Lowest',
        mode='markers',
        marker=dict(
            color='Maroon',
            size=8
        )
    ), row=1, col=1)

    # Plot max drawdown
    drawdowns = get_drawdowns(data[CUM_SUM_STRATEGY_TC])

    max_drawdown_index = drawdowns.argmin()
    max_drawdown_time = drawdowns.index[max_drawdown_index]
    max_drawdown_equity = data[CUM_SUM_STRATEGY_TC].iloc[max_drawdown_index]
    max_drawdown_value = drawdowns.iloc[max_drawdown_index]

    fig.add_trace(go.Scatter(
        x=[max_drawdown_time],
        y=[max_drawdown_equity],
        name=f'Max Drawdown ({round(max_drawdown_value * 100, 1)} %)',
        mode='markers',
        marker=dict(
            color='Crimson',
            size=7
        )
    ), row=1, col=1)


def size_trade_markers(notional_value, min_marker_size=10, max_marker_size=35):

    min_value = notional_value.min()
    max_value = notional_value.max()

    normalized = (notional_value - min_value) / (max_value - min_value)

    normalized = pd.Series(np.where(np.isnan(normalized), 0.5, normalized))

    return min_marker_size + normalized * (max_marker_size - min_marker_size)


def plot_trades(fig, trades, symbol_colors=None):

    if len(trades) > 0:

        trades["pnl_pct"] = np.round(trades["pnl"] * 100, 2)

        # define a boolean column indicating if each trade is long or short
        trades['is_long'] = trades['side'].apply(lambda x: x > 0)

        # define marker size accoridng to the trade size
        marker_size = size_trade_markers(trades['units'] * trades["entry_price"])

        multi_symbol = (
            "symbol" in trades
            and trades["symbol"].notna().any()
            and trades["symbol"].nunique() > 1
        )

        if multi_symbol:
            # colour encodes the symbol, marker shape encodes the direction,
            # so the two symbols' trades are visually distinguishable
            colors = symbol_colors or _symbol_colors(sorted(trades["symbol"].dropna().unique()))
            for symbol, group in trades.groupby("symbol"):
                color = colors.get(symbol, "#1f77b4")
                _add_trade_traces(
                    fig, group, marker_size.loc[group.index],
                    long_color=color, short_color=color, outline="Black",
                    name_prefix=f"{symbol} ", legend_group=symbol,
                )
        else:
            # single symbol: green longs, red shorts (the classic convention)
            _add_trade_traces(fig, trades, marker_size, long_color='limegreen', short_color='red')


def _add_trade_traces(fig, trades, marker_size, long_color='limegreen', short_color='red',
                      outline=None, name_prefix='', legend_group=None):
    # create separate traces for long and short trades
    fig.add_trace(go.Scatter(
        x=trades[trades['is_long']]["entry_date"], y=trades.loc[trades['is_long'], 'pnl_pct'],
        name=f'{name_prefix}Long', mode='markers', legendgroup=legend_group, marker=dict(
            symbol='triangle-up',
            color=long_color,
            size=marker_size[trades['is_long']],
            line=dict(
                color=outline or 'Black',
                width=1
            )
        )
    ), row=2, col=1)
    fig.add_trace(go.Scatter(
        x=trades[~trades['is_long']]["entry_date"], y=trades.loc[~trades['is_long'], 'pnl_pct'],
        name=f'{name_prefix}Short', mode='markers', legendgroup=legend_group, marker=dict(
            symbol='triangle-down',
            color=short_color,
            size=marker_size[~trades['is_long']],
            line=dict(
                color=outline or 'White',
                width=1
            )
        )
    ), row=2, col=1)
