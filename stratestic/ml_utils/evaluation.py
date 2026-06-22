"""Evaluation utilities for machine learning models."""

import logging

import numpy as np
import matplotlib.pyplot as plt
import seaborn as sb
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    f1_score,
    precision_score,
    recall_score,
    accuracy_score
)
from sklearn.model_selection import learning_curve


base_color = sb.color_palette()[0]


def plot_predictions(y_test, y_pred, is_classifier):
    """
    Plot predictions against actual target values.

    Parameters
    ----------
    y_test : array-like
        Actual target values.
    y_pred : array-like
        Predicted target values.
    is_classifier : bool
        Whether the model is a classifier.

    Examples
    --------
    >>> plot_predictions(y_test, y_pred, is_classifier=True)
    """
    if is_classifier:
        equal = y_test[y_pred == y_test]
        not_equal = y_test[y_pred != y_test]

        plt.figure(figsize=(15, 10))
        plt.bar(x=equal.index, height=equal, width=0.1, color='limegreen', label='Correct')
        plt.bar(x=not_equal.index, height=not_equal, width=0.1, color='r', label='Incorrect')
        plt.yticks((-1, 1), ('Negative', 'Positive'))
        plt.title('Predictions')
        plt.legend()
    else:
        plt.figure(figsize=(15, 10))
        plt.bar(x=y_test.index, height=y_test, width=0.3, color='deepskyblue', label='Actual')
        plt.bar(x=y_test.index, height=y_pred, width=0.3, color='r', label='Predicted')
        plt.title('Actual vs Predicted')
        plt.legend()

    plt.show()


def evaluate_model(
    model,
    X_test,
    y_test,
    X_train,
    y_train,
    is_classifier,
    verbose=False
):
    """
    Evaluate model performance with appropriate metrics.

    Parameters
    ----------
    model : estimator
        Fitted machine learning model.
    X_test : array-like or pd.DataFrame
        Test features.
    y_test : array-like
        Test targets.
    X_train : array-like or pd.DataFrame
        Training features (unused, kept for API compatibility).
    y_train : array-like
        Training targets (unused, kept for API compatibility).
    is_classifier : bool
        Whether the model is a classifier.
    verbose : bool, default=False
        Whether to log and plot results.

    Returns
    -------
    dict
        Performance metrics.

    Examples
    --------
    >>> results = evaluate_model(model, X_test, y_test, X_train, y_train, is_classifier=True)
    """
    y_pred = model.predict(X_test)

    if is_classifier:
        # Determine averaging method for multi-class
        if len(np.unique(y_test)) == 2 and len(np.unique(y_pred)) == 2:
            average = 'binary'
        else:
            average = 'weighted'
            if verbose:
                logging.info("\t\tUsing weighted-average metrics for multi-class.")

        accuracy = accuracy_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred, average=average, zero_division=0)
        recall = recall_score(y_test, y_pred, average=average, zero_division=0)
        precision = precision_score(y_test, y_pred, average=average, zero_division=0)

        results = {
            "accuracy": accuracy,
            "f1": f1,
            "recall": recall,
            "precision": precision
        }

        if verbose:
            logging.info(f"\t\tAccuracy: {accuracy:.4f}")
            logging.info(f"\t\tF1 score: {f1:.4f}")
            logging.info(f"\t\tRecall: {recall:.4f}")
            logging.info(f"\t\tPrecision: {precision:.4f}")
    else:
        r2 = r2_score(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        mse = mean_squared_error(y_test, y_pred)

        results = {
            "r2": r2,
            "mae": mae,
            "mse": mse
        }

        if verbose:
            logging.info(f"\t\tR² score: {r2:.4f}")
            logging.info(f"\t\tMAE: {mae:.4f}")
            logging.info(f"\t\tMSE: {mse:.4f}")

    if verbose:
        plot_predictions(y_test, y_pred, is_classifier)

    return results


def plot_learning_curve(
    estimator,
    title,
    X,
    y,
    axes=None,
    ylim=None,
    cv=None,
    n_jobs=-1,
    train_sizes=np.linspace(0.1, 1.0, 10),
    metric="neg_mean_squared_error",
):
    """
    Plot learning curves to analyze model performance vs training set size.

    Parameters
    ----------
    estimator : estimator object
        Model with fit and predict methods.
    title : str
        Chart title.
    X : array-like, shape (n_samples, n_features)
        Training features.
    y : array-like, shape (n_samples,)
        Training targets.
    axes : array of 3 axes, optional
        Axes for plotting. If None, new axes are created.
    ylim : tuple, optional
        Y-axis limits.
    cv : int or cross-validation generator, optional
        Cross-validation strategy.
    n_jobs : int, default=-1
        Number of parallel jobs.
    train_sizes : array-like, optional
        Training set sizes to evaluate.
    metric : str, default='neg_mean_squared_error'
        Scoring metric.

    Returns
    -------
    train_sizes, train_scores, test_scores, fit_times : arrays
        Learning curve data.

    Examples
    --------
    >>> from sklearn.model_selection import TimeSeriesSplit
    >>> plot_learning_curve(model, "Learning Curve", X, y, cv=TimeSeriesSplit(5))
    """
    if axes is None:
        _, axes = plt.subplots(3, 1, figsize=(8, 18))

    axes[0].set_title(title)
    if ylim is not None:
        axes[0].set_ylim(*ylim)
    axes[0].set_xlabel("Training examples")
    axes[0].set_ylabel(metric)

    train_sizes, train_scores, test_scores, fit_times, _ = learning_curve(
        estimator,
        X,
        y,
        cv=cv,
        n_jobs=n_jobs,
        train_sizes=train_sizes,
        return_times=True,
        scoring=metric,
    )

    train_scores = np.abs(train_scores)
    test_scores = np.abs(test_scores)

    train_scores_mean = np.mean(train_scores, axis=1)
    train_scores_std = np.std(train_scores, axis=1)
    test_scores_mean = np.mean(test_scores, axis=1)
    test_scores_std = np.std(test_scores, axis=1)
    fit_times_mean = np.mean(fit_times, axis=1)
    fit_times_std = np.std(fit_times, axis=1)

    # Plot learning curve
    axes[0].grid()
    axes[0].fill_between(
        train_sizes,
        train_scores_mean - train_scores_std,
        train_scores_mean + train_scores_std,
        alpha=0.1,
        color="r",
    )
    axes[0].fill_between(
        train_sizes,
        test_scores_mean - test_scores_std,
        test_scores_mean + test_scores_std,
        alpha=0.1,
        color="g",
    )
    axes[0].plot(train_sizes, train_scores_mean, "o-", color="r", label="Training error")
    axes[0].plot(train_sizes, test_scores_mean, "o-", color="g", label="CV error")
    axes[0].set_ylim(bottom=0)
    axes[0].legend(loc="best")

    # Plot scalability
    axes[1].grid()
    axes[1].plot(train_sizes, fit_times_mean, "o-")
    axes[1].fill_between(
        train_sizes,
        fit_times_mean - fit_times_std,
        fit_times_mean + fit_times_std,
        alpha=0.1,
    )
    axes[1].set_xlabel("Training examples")
    axes[1].set_ylabel("Fit time (s)")
    axes[1].set_title("Scalability")

    # Plot performance
    axes[2].grid()
    axes[2].plot(fit_times_mean, test_scores_mean, "o-")
    axes[2].fill_between(
        fit_times_mean,
        test_scores_mean - test_scores_std,
        test_scores_mean + test_scores_std,
        alpha=0.1,
    )
    axes[2].set_xlabel("Fit time (s)")
    axes[2].set_ylabel("Error")
    axes[2].set_title("Performance")

    plt.show()

    return train_sizes, train_scores, test_scores, fit_times


# Backwards compatibility aliases
model_evaluation = evaluate_model
