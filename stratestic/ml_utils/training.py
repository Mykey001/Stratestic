"""Training utilities for machine learning trading strategies."""

import logging

import numpy as np
from sklearn.base import is_classifier
from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.preprocessing import StandardScaler, PolynomialFeatures

from stratestic.ml_utils.defaults import estimator_mapping, estimator_params
from stratestic.ml_utils.evaluation import evaluate_model
from stratestic.ml_utils.pipeline import FeatureSelector, CustomOneHotEncoder
from stratestic.utils.logger import configure_logger

configure_logger()


def train_test_split_timeseries(X, y, test_size=0.2):
    """
    Split time series data into training and test sets (no shuffling).

    Parameters
    ----------
    X : pd.DataFrame or np.ndarray, shape (n_samples, n_features)
        Feature dataset.
    y : pd.Series or np.ndarray, shape (n_samples,)
        Target dataset.
    test_size : float, default=0.2
        Proportion of the dataset to include in the test split.

    Returns
    -------
    X_train, X_test, y_train, y_test : pd.DataFrame or np.ndarray
        Training and test splits.

    Examples
    --------
    >>> X_train, X_test, y_train, y_test = train_test_split_timeseries(X, y, test_size=0.2)
    """
    train_end = int(X.shape[0] * (1 - test_size))

    X_train = X.iloc[:train_end]
    X_test = X.iloc[train_end:]
    y_train = y.iloc[:train_end]
    y_test = y.iloc[train_end:]

    return X_train, X_test, y_train, y_test


def build_pipeline(estimator, polynomial_degree=1, interaction_only=False):
    """
    Construct a machine learning pipeline with feature processing.

    Parameters
    ----------
    estimator : estimator object
        The machine learning algorithm to use.
    polynomial_degree : int, default=1
        Degree of polynomial features to generate.
    interaction_only : bool, default=False
        If True, only interaction features are produced (no powers of same feature).

    Returns
    -------
    pipeline : Pipeline
        The constructed pipeline.
    is_clf : bool
        Whether the estimator is a classifier.

    Examples
    --------
    >>> from sklearn.ensemble import RandomForestClassifier
    >>> rf = RandomForestClassifier()
    >>> pipeline, is_clf = build_pipeline(rf, polynomial_degree=2)
    """
    is_clf = is_classifier(estimator)

    pipeline = Pipeline([
        ('features', FeatureUnion([
            ('num_features', Pipeline([
                ('selector', FeatureSelector('num')),
                ('feature_polynomials', PolynomialFeatures(
                    degree=polynomial_degree,
                    include_bias=False,
                    interaction_only=interaction_only
                )),
                ('scaling', StandardScaler())
            ])),
            ('cat_features', Pipeline([
                ('selector', FeatureSelector('cat')),
                ('one-hot-encoder', CustomOneHotEncoder(drop='first'))
            ]))
        ])),
        ('estimator', estimator),
    ])

    return pipeline, is_clf


def train_model(
    estimator,
    X,
    y,
    model_type="classification",
    test_size=0.2,
    polynomial_degree=1,
    verbose=True
):
    """
    Train a machine learning model with the given dataset.

    Parameters
    ----------
    estimator : str
        Name of the estimator (e.g., 'Random Forest', 'Decision Tree').
    X : pd.DataFrame or np.ndarray
        Feature set.
    y : pd.Series or np.ndarray
        Target variable.
    model_type : str, default='classification'
        Type of model: 'classification' or 'regression'.
    test_size : float, default=0.2
        Proportion of dataset for testing.
    polynomial_degree : int, default=1
        Degree of polynomial features.
    verbose : bool, default=True
        Whether to print training progress.

    Returns
    -------
    model : Pipeline
        Trained machine learning pipeline.
    results : dict
        Evaluation results for train and test sets.
    X_train, X_test, y_train, y_test : pd.DataFrame/np.ndarray
        Training and testing splits.

    Examples
    --------
    >>> model, results, X_train, X_test, y_train, y_test = train_model(
    ...     'Random Forest', X, y, model_type='classification'
    ... )
    """
    if verbose:
        logging.info("\tBuilding model...")

    estimator_class = estimator_mapping[model_type][estimator]
    estimator_params_ = estimator_params[model_type][estimator]
    estimator_instance = estimator_class(**estimator_params_)

    model, is_clf = build_pipeline(estimator_instance, polynomial_degree)

    if is_clf:
        # Convert to 3-class labels: 1 (up), -1 (down), 0 (flat)
        # Matches backtester convention: 0 = neutral/no position
        y = np.sign(y)

    X_train, X_test, y_train, y_test = train_test_split_timeseries(X, y, test_size=test_size)

    if verbose:
        logging.info("\tFitting data...")

    model.fit(X_train, y_train)

    if verbose:
        logging.info("\tEvaluating model...")

    results = evaluate_model(
        model,
        X_test,
        y_test,
        X_train,
        y_train,
        is_classifier=is_clf,
        verbose=verbose
    )

    return model, results, X_train, X_test, y_train, y_test
