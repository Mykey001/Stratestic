"""Custom sklearn pipeline components for ML trading strategies."""

import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.preprocessing import OneHotEncoder


class FeatureSelector(BaseEstimator, TransformerMixin):
    """
    Transformer for selecting features by data type or specific columns.

    Parameters
    ----------
    data_type : str
        Type of data to select: 'num' (numerical) or 'cat' (categorical).
    columns : list of str, optional
        Specific columns to include. If None, selects all of the specified data_type.

    Examples
    --------
    >>> from sklearn.pipeline import Pipeline
    >>> pipe = Pipeline([
    ...     ('selector', FeatureSelector('num')),
    ...     ('scaler', StandardScaler())
    ... ])
    """

    def __init__(self, data_type, columns=None):
        self.data_type = data_type
        self.columns = columns

    def fit(self, X, y=None, **fit_params):
        return self

    def transform(self, X, y=None, **transform_params):
        if self.columns is None:
            self.columns = X.columns

        if self.data_type == 'num':
            num_features = list(X.dtypes[(X.dtypes == 'int64') | (X.dtypes == 'float64')].index)
            columns = [col for col in X.columns if col in num_features and col in self.columns]
        elif self.data_type == 'cat':
            cat_features = list(X.dtypes[(X.dtypes != 'int64') & (X.dtypes != 'float64')].index)
            columns = [col for col in X.columns if col in cat_features and col in self.columns]
        else:
            columns = self.columns

        return X.copy()[columns]


class CustomOneHotEncoder(OneHotEncoder):
    """
    OneHotEncoder that preserves feature names and returns a DataFrame.

    Parameters
    ----------
    drop : str, optional
        Category to drop for each feature. If None, no category is dropped.

    Examples
    --------
    >>> encoder = CustomOneHotEncoder(drop='first')
    >>> encoded = encoder.fit_transform(df)
    """

    def __init__(self, drop=None):
        OneHotEncoder.__init__(self, drop=drop)

    def fit(self, X, y=None, **fit_params):
        self.columns = X.columns
        return super(CustomOneHotEncoder, self).fit(X, y, **fit_params)

    def transform(self, X, y=None, **transform_params):
        transformed_data = super(CustomOneHotEncoder, self).transform(X, **transform_params).toarray()

        # Use expanded one-hot column names and preserve time index
        return pd.DataFrame(
            data=transformed_data,
            columns=self.get_feature_names_out(self.columns),
            index=X.index,
        )
