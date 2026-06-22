"""Feature engineering utilities for machine learning trading strategies."""

import numpy as np
import pandas as pd


def create_lag_features(df, columns=None, exclude=None, n_lags=1, dropnan=True):
    """
    Generate lagged features from specified columns in a DataFrame for time series forecasting.

    Parameters
    ----------
    df : pd.DataFrame
        The original DataFrame from which to generate lag features.
    columns : list of str, optional
        Specific columns to generate lag features for. If None, all columns are used.
    exclude : list of str, optional
        Columns to exclude from lag feature generation.
    n_lags : int, default=1
        The number of lag observations to include as input features (from t-n_lags to t-1).
    dropnan : bool, default=True
        If True, rows with NaN values resulting from lag generation will be dropped.

    Returns
    -------
    pd.DataFrame
        DataFrame with generated lag features. Column names are suffixed with '_lag[n]'
        where [n] is the number of steps lagged.

    Examples
    --------
    >>> df = pd.DataFrame({'close': [100, 101, 102, 103]})
    >>> create_lag_features(df, columns=['close'], n_lags=2)
    """
    if exclude is None:
        exclude = []

    lag_columns = set(columns) if columns is not None else set(df.columns)
    lag_columns = list(lag_columns.difference(exclude))

    original_df = df.copy()
    result = df[lag_columns].copy()

    how = {"how": 'inner' if dropnan else 'outer'}

    # Create lagged features from t-n_lags to t-1
    for i in range(1, n_lags + 1):
        result = result.join(
            original_df[lag_columns].shift(i),
            rsuffix=f"_lag{i}",
            **how
        )

    result.drop(columns=lag_columns, inplace=True)

    if dropnan:
        result.dropna(axis=0, inplace=True)

    return result


def create_rolling_features(
    df,
    windows,
    columns=None,
    exclude=None,
    statistics=('mean',),
    moving_average='sma',
    dropnan=True
):
    """
    Generate rolling window features from specified columns for time series analysis.

    Parameters
    ----------
    df : pd.DataFrame
        The DataFrame from which to generate rolling window features.
    windows : int or list of int
        The size(s) of the rolling window(s) to calculate features over.
    columns : list of str, optional
        Specific columns to calculate rolling features for. If None, all columns are used.
    exclude : list of str, optional
        Columns to exclude from rolling feature generation.
    statistics : tuple of str, optional
        Statistical measures to calculate for each window. Default is ('mean',).
        Options: 'mean', 'std', 'min', 'max', 'median', 'sum'
    moving_average : str, default='sma'
        Type of moving average: 'sma' (simple) or 'ema' (exponential).
    dropnan : bool, default=True
        If True, rows with NaN values will be dropped.

    Returns
    -------
    pd.DataFrame
        DataFrame with generated rolling features. Column names are suffixed with
        '_[moving_average]_[window]_[stat]'.

    Examples
    --------
    >>> df = pd.DataFrame({'close': [100, 101, 102, 103, 104]})
    >>> create_rolling_features(df, windows=3, columns=['close'])
    """
    if exclude is None:
        exclude = []

    rolling_columns = set(columns) if columns is not None else set(df.columns)
    rolling_columns = list(rolling_columns.difference(exclude))

    if not isinstance(windows, (list, tuple, type(np.array([])))):
        windows = [windows]

    if not isinstance(statistics, (list, tuple, type(np.array([])))):
        statistics = [statistics]

    result = df[rolling_columns].copy()

    for stat in statistics:
        for window in windows:
            if moving_average == 'sma':
                moving_av = result[rolling_columns].rolling(window=window)
            elif moving_average == 'ema':
                moving_av = result[rolling_columns].ewm(span=window)
            else:
                raise ValueError(
                    f"Method '{moving_average}' not supported. Choose 'sma' or 'ema'."
                )

            result = result.join(
                getattr(moving_av, stat)(),
                rsuffix=f'_{moving_average}_{window}_{stat}',
            )

    result.drop(columns=rolling_columns, inplace=True)

    if dropnan:
        result.dropna(axis=0, inplace=True)

    return result


def create_target_labels(data, returns_col='returns'):
    """
    Extract target labels (next bar's return) from a DataFrame.

    The label at time t is the next bar's return (t+1): this is what a position
    formed at the close of bar t earns in backtesting, so the model is trained
    to predict exactly what it is paid on.

    Parameters
    ----------
    data : pd.DataFrame
        The DataFrame containing the returns column.
    returns_col : str, default='returns'
        Name of the column containing returns.

    Returns
    -------
    pd.Series
        Series containing the target labels, renamed to 'y'. The last bar is
        dropped (its next-bar return doesn't exist).

    Examples
    --------
    >>> df = pd.DataFrame({'returns': [0.01, 0.02, -0.01, 0.03]})
    >>> create_target_labels(df)
    """
    return data[returns_col].shift(-1).dropna().rename('y')


def combine_features_and_labels(X_lag, X_roll, y):
    """
    Combine lag features, rolling features, and labels into unified X, y datasets.

    Parameters
    ----------
    X_lag : pd.DataFrame
        DataFrame containing lag features.
    X_roll : pd.DataFrame
        DataFrame containing rolling window features.
    y : pd.Series or pd.DataFrame
        The target labels.

    Returns
    -------
    X : pd.DataFrame
        Combined features (lag + rolling), excluding overlapping columns.
    y : pd.Series or pd.DataFrame
        Target labels, aligned with X.

    Examples
    --------
    >>> X_lag = create_lag_features(df, n_lags=5)
    >>> X_roll = create_rolling_features(df, windows=[10, 20])
    >>> y = create_target_labels(df)
    >>> X, y = combine_features_and_labels(X_lag, X_roll, y)
    """
    common_cols = set(X_lag.columns).intersection(set(X_roll.columns))

    X = X_lag.join(X_roll.drop(columns=common_cols), how='inner')
    x_y = X.join(y, how='inner')

    return x_y.iloc[:, :-1].copy(), x_y.iloc[:, -1].copy()


# Backwards compatibility aliases
get_lag_features = create_lag_features
get_rolling_features = create_rolling_features
get_labels = create_target_labels
get_x_y = combine_features_and_labels
