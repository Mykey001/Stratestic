"""Command-line interface for Stratestic."""

import sys
import importlib.util
from pathlib import Path


def print_header(text):
    """Print a formatted header."""
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60 + "\n")


def print_error(text):
    """Print an error message."""
    print(f"❌ Error: {text}")


def print_success(text):
    """Print a success message."""
    print(f"✅ {text}")


def print_warning(text):
    """Print a warning message."""
    print(f"⚠️  {text}")


def load_strategy_from_file(file_path):
    """
    Load a strategy class from a Python file.
    
    Parameters
    ----------
    file_path : str or Path
        Path to the Python file containing the strategy.
        
    Returns
    -------
    strategy_classes : list
        List of strategy classes found in the file.
    """
    file_path = Path(file_path)
    
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    if file_path.suffix != '.py':
        raise ValueError(f"File must be a Python file (.py): {file_path}")
    
    # Load the module
    spec = importlib.util.spec_from_file_location("strategy_module", file_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    
    # Find strategy classes
    from stratestic.strategies import StrategyMixin
    strategies = []
    
    for name in dir(module):
        obj = getattr(module, name)
        try:
            if isinstance(obj, type) and issubclass(obj, StrategyMixin) and obj is not StrategyMixin:
                strategies.append(obj)
        except TypeError:
            continue
    
    return strategies


def validate_strategy_command(args):
    """Handle the validate-strategy command."""
    if len(args) < 2:
        print_error("Usage: stratestic validate-strategy <strategy_file.py>")
        return 1
    
    strategy_file = args[1]
    
    print_header("Stratestic Strategy Validator")
    print(f"Validating: {strategy_file}")
    
    try:
        # Load strategies from file
        strategies = load_strategy_from_file(strategy_file)
        
        if not strategies:
            print_warning(f"No strategy classes found in {strategy_file}")
            print("\nMake sure your strategy:")
            print("  1. Inherits from StrategyMixin")
            print("  2. Is defined at module level (not nested)")
            return 1
        
        print(f"\nFound {len(strategies)} strategy class(es):\n")
        
        from stratestic.validation import StrategyValidator
        validator = StrategyValidator()
        
        all_valid = True
        
        for strategy_class in strategies:
            print(f"📋 Validating {strategy_class.__name__}...")
            print("-" * 60)
            
            is_valid, errors = validator.validate(strategy_class)
            
            if is_valid:
                print_success(f"{strategy_class.__name__} is valid!")
                
                # Show strategy info
                info = validator.get_strategy_info(strategy_class)
                
                if info['parameters']:
                    print("\n  Parameters:")
                    for param_name, param_info in info['parameters'].items():
                        default = param_info['default']
                        default_str = f" = {default}" if default is not None else ""
                        print(f"    - {param_name}{default_str}")
                
                if info['docstring']:
                    print(f"\n  Description:")
                    # Print first line of docstring
                    first_line = info['docstring'].split('\n')[0]
                    print(f"    {first_line}")
            else:
                print_error(f"{strategy_class.__name__} has validation errors:")
                for error in errors:
                    print(f"    • {error}")
                all_valid = False
            
            print()
        
        if all_valid:
            print_success("All strategies are valid! ✨")
            return 0
        else:
            print_error("Some strategies have validation errors.")
            return 1
            
    except FileNotFoundError as e:
        print_error(str(e))
        return 1
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


def help_command(args=None):
    """Show help information."""
    print_header("Stratestic CLI - Universal Strategy Backtesting")
    
    print("Usage: stratestic <command> [options]\n")
    
    print("Commands:\n")
    print("  validate-strategy <file.py>")
    print("    Validate a Python strategy file")
    print("    Checks that strategies implement the required interface\n")
    
    print("  help")
    print("    Show this help message\n")
    
    print("Examples:\n")
    print("  # Validate a strategy file")
    print("  stratestic validate-strategy my_strategy.py\n")
    
    print("Documentation:")
    print("  https://github.com/diogomatoschaves/stratestic")
    print()
    
    return 0


def main():
    """Main CLI entry point."""
    args = sys.argv[1:]
    
    if not args or args[0] in ['help', '--help', '-h']:
        return help_command()
    
    command = args[0]
    
    if command == 'validate-strategy':
        return validate_strategy_command(args)
    else:
        print_error(f"Unknown command: {command}")
        print("Run 'stratestic help' for usage information")
        return 1


if __name__ == '__main__':
    sys.exit(main())
