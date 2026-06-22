"""Machine learning utilities for trading strategies.

This module provides reusable ML utilities that can be used with any strategy:
- Feature engineering (lag features, rolling features)
- Model training and evaluation
- Pipeline components
- Default estimators and parameters

Examples
--------
Create features for an ML strategy:

>>> from stratestic.ml_utils import create_lag_features, create_rolling_features
>>> lag_features = create_lag_features(data, columns=['close', 'volume'], n_lags=10)
>>> rolling_features = create_rolling_features(data, windows=[20, 50])

Train a model:

>>> from stratestic.ml_utils import train_model
>>> model, results, X_train, X_test, y_train, y_test = train_model(
...     'Random Forest', X, y, model_type='classification'
... )
"""

# Feature engineering
from stratestic.ml_utils.features import (
    create_lag_features,
    create_rolling_features,
    create_target_labels,
    combine_features_and_labels,
    # Backwards compatibility
    get_lag_features,
    get_rolling_features,
    get_labels,
    get_x_y,
)

# Training
from stratestic.ml_utils.training import (
    train_model,
    build_pipeline,
    train_test_split_timeseries,
)

# Evaluation
from stratestic.ml_utils.evaluation import (
    evaluate_model,
    plot_predictions,
    plot_learning_curve,
    # Backwards compatibility
    model_evaluation,
)

# Defaults
from stratestic.ml_utils.defaults import (
    estimator_mapping,
    estimator_params,
    create_model_filename,
)

# Pipeline components
from stratestic.ml_utils.pipeline import (
    FeatureSelector,
    CustomOneHotEncoder,
)

__all__ = [
    # Feature engineering
    'create_lag_features',
    'create_rolling_features',
    'create_target_labels',
    'combine_features_and_labels',
    'get_lag_features',  # backwards compat
    'get_rolling_features',  # backwards compat
    'get_labels',  # backwards compat
    'get_x_y',  # backwards compat
    # Training
    'train_model',
    'build_pipeline',
    'train_test_split_timeseries',
    # Evaluation
    'evaluate_model',
    'plot_predictions',
    'plot_learning_curve',
    'model_evaluation',  # backwards compat
    # Defaults
    'estimator_mapping',
    'estimator_params',
    'create_model_filename',
    # Pipeline
    'FeatureSelector',
    'CustomOneHotEncoder',
]
