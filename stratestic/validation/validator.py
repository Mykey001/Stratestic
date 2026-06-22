"""Strategy validation utilities."""

import inspect
from typing import Tuple, List, Optional
from collections import OrderedDict

from stratestic.strategies._mixin import StrategyMixin


class StrategyValidator:
    """
    Validates that a strategy class correctly implements the required interface.
    
    Checks:
    - Inherits from StrategyMixin
    - Implements required methods
    - Has valid params attribute
    - Methods have correct signatures
    
    Examples
    --------
    >>> validator = StrategyValidator()
    >>> is_valid, errors = validator.validate(MyStrategy)
    >>> if not is_valid:
    ...     for error in errors:
    ...         print(f"Error: {error}")
    """
    
    def validate(self, strategy_class) -> Tuple[bool, List[str]]:
        """
        Validate a strategy class.
        
        Parameters
        ----------
        strategy_class : class
            The strategy class to validate.
            
        Returns
        -------
        is_valid : bool
            True if strategy is valid, False otherwise.
        errors : list of str
            List of validation error messages.
            
        Examples
        --------
        >>> is_valid, errors = validator.validate(MyStrategy)
        """
        errors = []
        
        # Check if it's a class
        if not inspect.isclass(strategy_class):
            errors.append("Must be a class, not an instance")
            return False, errors
        
        # Check inheritance
        if not issubclass(strategy_class, StrategyMixin):
            errors.append(
                f"{strategy_class.__name__} must inherit from StrategyMixin"
            )
        
        # Check required methods
        errors.extend(self._check_required_methods(strategy_class))
        
        # Check params attribute
        errors.extend(self._check_params_attribute(strategy_class))
        
        # Try instantiation
        instantiation_error = self._check_instantiation(strategy_class)
        if instantiation_error:
            errors.append(instantiation_error)
        
        return len(errors) == 0, errors
    
    def validate_instance(self, strategy_instance) -> Tuple[bool, List[str]]:
        """
        Validate a strategy instance.
        
        Parameters
        ----------
        strategy_instance : object
            The strategy instance to validate.
            
        Returns
        -------
        is_valid : bool
            True if strategy is valid, False otherwise.
        errors : list of str
            List of validation error messages.
        """
        errors = []
        
        # Check if it's an instance of StrategyMixin
        if not isinstance(strategy_instance, StrategyMixin):
            errors.append(
                f"{type(strategy_instance).__name__} must be an instance of StrategyMixin"
            )
            return False, errors
        
        # Check required methods exist and are callable
        for method_name in ['calculate_positions', 'get_signal', 'update_data']:
            if not hasattr(strategy_instance, method_name):
                errors.append(f"Missing required method: {method_name}()")
            elif not callable(getattr(strategy_instance, method_name)):
                errors.append(f"{method_name} must be callable")
        
        # Check params attribute
        if hasattr(strategy_instance, 'params'):
            params = strategy_instance.params
            if not isinstance(params, (dict, OrderedDict)):
                errors.append("params must be a dict or OrderedDict")
        
        return len(errors) == 0, errors
    
    def _check_required_methods(self, strategy_class) -> List[str]:
        """Check that required methods are implemented."""
        errors = []
        
        required_methods = {
            'calculate_positions': 1,  # Expects 1 argument (data)
            'get_signal': 1,           # Expects 1 optional argument (row)
            'update_data': 1,          # Expects 1 argument (data)
        }
        
        for method_name, expected_args in required_methods.items():
            if not hasattr(strategy_class, method_name):
                errors.append(f"Missing required method: {method_name}()")
                continue
            
            method = getattr(strategy_class, method_name)
            
            # Check if it's callable
            if not callable(method):
                errors.append(f"{method_name} must be a callable method")
                continue
            
            # Check if it's still the abstract method (not overridden)
            if method_name in ['calculate_positions', 'get_signal']:
                try:
                    sig = inspect.signature(method)
                    source = inspect.getsource(method)
                    if 'NotImplementedError' in source:
                        errors.append(
                            f"{method_name}() is not implemented (still raises NotImplementedError)"
                        )
                except (ValueError, OSError):
                    # Can't get source, might be in C code or built-in
                    pass
        
        return errors
    
    def _check_params_attribute(self, strategy_class) -> List[str]:
        """Check that params attribute is properly defined."""
        errors = []
        
        # Try to create an instance to check params
        try:
            # Try with no arguments (might fail, that's ok)
            test_instance = strategy_class()
            if hasattr(test_instance, 'params'):
                params = test_instance.params
                if not isinstance(params, (dict, OrderedDict)):
                    errors.append("params must be a dict or OrderedDict")
                else:
                    # Check that param values are callable converters
                    for param_name, converter in params.items():
                        if not callable(converter):
                            errors.append(
                                f"params['{param_name}'] must be a callable converter function"
                            )
        except TypeError as e:
            # Class requires arguments, that's fine
            pass
        except Exception as e:
            # Other instantiation errors
            errors.append(f"Error checking params attribute: {str(e)}")
        
        return errors
    
    def _check_instantiation(self, strategy_class) -> Optional[str]:
        """Try to instantiate the class."""
        try:
            # Try with no arguments
            strategy_class()
            return None
        except TypeError as e:
            # Requires arguments, that's fine
            return None
        except Exception as e:
            return f"Cannot instantiate: {str(e)}"
    
    def get_strategy_info(self, strategy_class) -> dict:
        """
        Get information about a strategy class.
        
        Parameters
        ----------
        strategy_class : class
            The strategy class to inspect.
            
        Returns
        -------
        info : dict
            Dictionary containing strategy information.
            
        Examples
        --------
        >>> info = validator.get_strategy_info(MyStrategy)
        >>> print(info['name'])
        >>> print(info['parameters'])
        """
        info = {
            'name': strategy_class.__name__,
            'docstring': inspect.getdoc(strategy_class),
            'module': strategy_class.__module__,
            'parameters': {},
            'methods': [],
            'is_valid': False,
        }
        
        # Get __init__ parameters
        try:
            sig = inspect.signature(strategy_class.__init__)
            for param_name, param in sig.parameters.items():
                if param_name in ['self', 'data', 'kwargs']:
                    continue
                info['parameters'][param_name] = {
                    'default': param.default if param.default != inspect.Parameter.empty else None,
                    'annotation': str(param.annotation) if param.annotation != inspect.Parameter.empty else None,
                }
        except Exception as e:
            info['parameters_error'] = str(e)
        
        # Get methods
        for name, method in inspect.getmembers(strategy_class, predicate=inspect.isfunction):
            if not name.startswith('_'):
                info['methods'].append(name)
        
        # Validate
        is_valid, errors = self.validate(strategy_class)
        info['is_valid'] = is_valid
        info['validation_errors'] = errors
        
        return info


def validate_strategy(strategy_class_or_instance) -> Tuple[bool, List[str]]:
    """
    Convenience function to validate a strategy.
    
    Parameters
    ----------
    strategy_class_or_instance : class or object
        Strategy class or instance to validate.
        
    Returns
    -------
    is_valid : bool
        True if valid, False otherwise.
    errors : list of str
        List of validation errors.
        
    Examples
    --------
    >>> is_valid, errors = validate_strategy(MyStrategy)
    >>> if not is_valid:
    ...     print("\\n".join(errors))
    """
    validator = StrategyValidator()
    
    if inspect.isclass(strategy_class_or_instance):
        return validator.validate(strategy_class_or_instance)
    else:
        return validator.validate_instance(strategy_class_or_instance)
