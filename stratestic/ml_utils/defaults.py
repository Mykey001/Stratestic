"""Default estimators and parameters for machine learning strategies."""

from sklearn.ensemble import (
    RandomForestClassifier,
    AdaBoostClassifier,
    GradientBoostingClassifier,
    RandomForestRegressor,
    AdaBoostRegressor,
    GradientBoostingRegressor
)
from sklearn.gaussian_process import GaussianProcessClassifier, GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF
from sklearn.linear_model import LogisticRegression, Lasso
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.neural_network import MLPClassifier, MLPRegressor
from sklearn.svm import SVC, SVR
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor


estimator_mapping = {
    "classification": {
        "Linear": LogisticRegression,
        "Nearest Neighbors": KNeighborsClassifier,
        "Linear SVM": SVC,
        "RBF SVM": SVC,
        "Gaussian Process": GaussianProcessClassifier,
        "Decision Tree": DecisionTreeClassifier,
        "Random Forest": RandomForestClassifier,
        "Neural Net": MLPClassifier,
        "AdaBoost": AdaBoostClassifier,
        "Gradient Boosting": GradientBoostingClassifier,
    },
    "regression": {
        "Linear": Lasso,
        "Nearest Neighbors": KNeighborsRegressor,
        "Linear SVM": SVR,
        "RBF SVM": SVR,
        "Gaussian Process": GaussianProcessRegressor,
        "Decision Tree": DecisionTreeRegressor,
        "Random Forest": RandomForestRegressor,
        "Neural Net": MLPRegressor,
        "AdaBoost": AdaBoostRegressor,
        "Gradient Boosting": GradientBoostingRegressor,
    }
}


estimator_params = {
    "classification": {
        "Linear": dict(C=1e6, max_iter=100000, multi_class="ovr", random_state=42),
        "Nearest Neighbors": dict(n_neighbors=100, weights='distance'),
        "Linear SVM": dict(kernel="linear", C=0.025, random_state=42),
        "RBF SVM": dict(gamma=0.01, C=0.55, degree=4, random_state=42, kernel='rbf'),
        "Gaussian Process": dict(kernel=1.0 * RBF(1.0), random_state=42),
        "Decision Tree": dict(max_depth=5, random_state=42),
        "Random Forest": dict(max_depth=5, n_estimators=10, max_features=1, random_state=42),
        "Neural Net": dict(alpha=1, max_iter=1000, random_state=42),
        "AdaBoost": dict(n_estimators=200, algorithm="SAMME", random_state=42),
        "Gradient Boosting": dict(max_depth=1, max_features='sqrt'),
    },
    "regression": {
        "Linear": dict(max_iter=100000),
        "Nearest Neighbors": dict(n_neighbors=100, weights='distance'),
        "Linear SVM": dict(kernel="linear", C=0.025),
        "RBF SVM": dict(gamma=0.01, C=0.55, degree=4, kernel='rbf'),
        "Gaussian Process": dict(kernel=1.0 * RBF(1.0), random_state=42),
        "Decision Tree": dict(max_depth=5, random_state=42),
        "Random Forest": dict(max_depth=5, n_estimators=200, max_features=1, random_state=42),
        "Neural Net": dict(alpha=1, max_iter=1000, random_state=42),
        "AdaBoost": dict(n_estimators=200, random_state=42),
        "Gradient Boosting": dict(max_depth=1, max_features='sqrt'),
    }
}


def create_model_filename(estimator, model_type, parameters):
    """
    Create a filename for saving/loading models based on configuration.

    Parameters
    ----------
    estimator : str
        Name of the estimator.
    model_type : str
        'classification' or 'regression'.
    parameters : dict
        Model parameters to include in filename.

    Returns
    -------
    str
        Filename (without extension).

    Examples
    --------
    >>> params = {'n_lags': 10, 'window': 20}
    >>> create_model_filename('Random Forest', 'classification', params)
    'random_forest-classification-n_lags=10,window=20'
    """
    params_str = ','.join([f'{k}={v}'.replace(" ", '') for k, v in parameters.items()])
    return f"{estimator.replace(' ', '_').lower()}-{model_type}-{params_str}"
