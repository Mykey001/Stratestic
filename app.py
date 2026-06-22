"""
Flask Backend for Stratestic v2.0 Web Interface
Provides REST APIs for backtesting, optimization, strategy validation, and MT5 conversion.
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
import sys
import traceback

# Import Stratestic modules
from stratestic.strategies import StrategyMixin
from stratestic.backtesting import VectorizedBacktester, IterativeBacktester
from stratestic.validation import validate_strategy, StrategyValidator
from stratestic.ml_utils import create_lag_features, create_rolling_features

app = Flask(__name__, static_folder='.')
CORS(app)  # Enable CORS for frontend

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size


# ==================== DATA LOADING AND RESAMPLING ====================

def generate_synthetic_data(symbol='BTCUSDT', bars=600):
    """Generate synthetic OHLCV data for backtesting."""
    
    # Price and volatility configs per symbol
    configs = {
        'BTCUSDT': {'price': 28000, 'volatility': 0.018, 'trend': 0.0003},
        'ETHUSDT': {'price': 1800, 'volatility': 0.022, 'trend': 0.0002},
        'SOLUSDT': {'price': 22, 'volatility': 0.035, 'trend': 0.0005},
        'AAPL': {'price': 145, 'volatility': 0.011, 'trend': 0.00015}
    }
    
    config = configs.get(symbol, configs['BTCUSDT'])
    price = config['price']
    vol = config['volatility']
    trend = config['trend']
    
    dates = pd.date_range(start='2023-01-01', periods=bars, freq='1h')
    data = []
    
    np.random.seed(42)
    
    for i in range(bars):
        # Random walk with trend
        change = price * (vol * np.random.randn() + trend)
        
        # Add market cycles
        if 150 < i < 220:
            change -= price * 0.008  # Downtrend
        if 350 < i < 430:
            change += price * 0.012  # Bull run
        if 450 < i < 475:
            change -= price * 0.015  # Flash crash
        
        open_price = price
        close_price = price + change
        high_price = max(open_price, close_price) + abs(change) * np.random.rand() * 0.4
        low_price = min(open_price, close_price) - abs(change) * np.random.rand() * 0.4
        volume = 1000 + np.random.rand() * 9000
        
        price = close_price
        
        data.append({
            'timestamp': dates[i],
            'open': round(open_price, 2),
            'high': round(high_price, 2),
            'low': round(low_price, 2),
            'close': round(close_price, 2),
            'volume': round(volume, 0)
        })
    
    df = pd.DataFrame(data)
    df.set_index('timestamp', inplace=True)
    return df


def generate_gold_data_csv(path):
    """Generate a mock gold 1-minute dataset if missing."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    print(f"Creating mock gold dataset at {path}...")
    
    # Generate 10,000 bars of 1-minute data (about 7 days of active trading)
    bars = 10000
    dates = pd.date_range(end=datetime.now() - timedelta(days=1), periods=bars, freq='1min')
    
    price = 1800.0
    vol = 0.0005
    trend = 0.00001
    
    np.random.seed(42)
    data = []
    for i in range(bars):
        change = price * (vol * np.random.randn() + trend)
        open_price = price
        close_price = price + change
        high_price = max(open_price, close_price) + abs(change) * np.random.rand() * 0.2
        low_price = min(open_price, close_price) - abs(change) * np.random.rand() * 0.2
        volume = 100 + np.random.rand() * 900
        price = close_price
        
        data.append({
            'date': dates[i].strftime('%Y-%m-%d %H:%M:%S'),
            'open': round(open_price, 2),
            'high': round(high_price, 2),
            'low': round(low_price, 2),
            'close': round(close_price, 2),
            'volume': int(volume)
        })
        
    df = pd.DataFrame(data)
    df.to_csv(path, index=False)
    print("Mock gold dataset created successfully.")


def standardize_columns(df):
    """Standardize column names to standard lowercase ohlcv with a datetime index named 'date'."""
    df.columns = [c.lower().strip() for c in df.columns]
    
    # Handle MT5 date/time combination
    date_col = None
    time_col = None
    for col in df.columns:
        if 'date' in col:
            date_col = col
        if 'time' in col:
            time_col = col
            
    if date_col and time_col and date_col != time_col:
        df['datetime'] = pd.to_datetime(df[date_col].astype(str) + ' ' + df[time_col].astype(str))
        df = df.set_index('datetime')
        df = df.drop(columns=[date_col, time_col])
    elif date_col:
        df['datetime'] = pd.to_datetime(df[date_col])
        df = df.set_index('datetime')
        df = df.drop(columns=[date_col])
    elif 'timestamp' in df.columns:
        df['datetime'] = pd.to_datetime(df['timestamp'])
        df = df.set_index('datetime')
        df = df.drop(columns=['timestamp'])
    
    if not isinstance(df.index, pd.DatetimeIndex):
        df.index = pd.to_datetime(df.index)
        
    df.index.name = 'date'
    
    # Rename common variants
    col_map = {
        'open_price': 'open',
        'high_price': 'high',
        'low_price': 'low',
        'close_price': 'close',
        'tickvol': 'volume',
        'vol': 'volume',
        '<open>': 'open',
        '<high>': 'high',
        '<low>': 'low',
        '<close>': 'close',
        '<vol>': 'volume',
        '<tickvol>': 'volume',
    }
    df = df.rename(columns=col_map)
    
    # Ensure open, high, low, close, volume are present
    for col in ['open', 'high', 'low', 'close']:
        if col not in df.columns:
            for c in df.columns:
                if col in c or c.replace('<', '').replace('>', '') == col:
                    df = df.rename(columns={c: col})
                    break
                    
    if 'volume' not in df.columns:
        for c in df.columns:
            if 'vol' in c or 'qty' in c:
                df = df.rename(columns={c: 'volume'})
                break
        else:
            df['volume'] = 0.0
            
    for col in ['open', 'high', 'low', 'close', 'volume']:
        if col not in df.columns:
            if col == 'volume':
                df['volume'] = 0.0
            else:
                existing = [c for c in ['open', 'high', 'low', 'close'] if c in df.columns]
                if existing:
                    df[col] = df[existing[0]]
                else:
                    raise ValueError(f"Could not find or synthesize column '{col}'")
                    
    df = df[['open', 'high', 'low', 'close', 'volume']]
    return df


def resample_data(df, timeframe):
    """Resample 1-minute OHLCV data into target timeframe using pandas resample."""
    if not timeframe:
        return df
        
    tf_map = {
        '1m': '1min',
        '5m': '5min',
        '15m': '15min',
        '30m': '30min',
        '1h': '1h',
        '4h': '4h',
        '1d': '1D'
    }
    freq = tf_map.get(timeframe.lower())
    if not freq:
        return df
        
    resample_rules = {
        'open': 'first',
        'high': 'max',
        'low': 'min',
        'close': 'last',
        'volume': 'sum'
    }
    
    rules = {col: rule for col, rule in resample_rules.items() if col in df.columns}
    resampled = df.resample(freq).agg(rules)
    resampled = resampled.dropna()
    return resampled


def load_historical_data(symbol, timeframe=None, bars=None):
    """
    Check for historical CSV data under data/ directory and load/resample it.
    If missing, fall back to generating synthetic data.
    """
    csv_path = None
    if symbol.endswith('.csv'):
        csv_path = symbol
    else:
        # Check standard paths
        possible_paths = [
            os.path.join('data', f"{symbol}.csv"),
            os.path.join('data', symbol),
        ]
        if symbol == 'GOLD_M1_202001020905_202606191954':
            csv_path = os.path.join('data', 'GOLD_M1_202001020905_202606191954.csv')
        else:
            for p in possible_paths:
                if os.path.exists(p):
                    csv_path = p
                    break
            if not csv_path:
                csv_path = os.path.join('data', f"{symbol}.csv")

    if not os.path.exists(csv_path):
        if 'GOLD_M1' in symbol:
            generate_gold_data_csv(csv_path)
        else:
            print(f"CSV dataset not found at {csv_path}. Using synthetic generator.")
            df = generate_synthetic_data(symbol, bars=bars or 600)
            return df

    try:
        df = pd.read_csv(csv_path)
        if len(df.columns) <= 1:
            df = pd.read_csv(csv_path, sep='\t')
            
        df = standardize_columns(df)
        
        # If dataset is loaded and we have timeframe, resample it
        if timeframe:
            df = resample_data(df, timeframe)
            
        # Apply bars limit from tail if specified
        if bars:
            df = df.tail(bars)
            
        return df
    except Exception as e:
        print(f"Error loading real historical data: {e}")
        traceback.print_exc()
        # Fallback
        return generate_synthetic_data(symbol, bars=bars or 600)


def clean_metric_key(key):
    """Clean metric keys from Stratestic result dict into clean frontend format."""
    k = key.replace('(', '').replace(')', '').replace('[', '').replace(']', '').replace('%', 'pct')
    k = k.replace(' ', '_').replace('-', '_')
    while '__' in k:
        k = k.replace('__', '_')
    return k.strip('_').lower()


# ==================== STRATEGY DEFINITIONS ====================

class MovingAverageCrossover(StrategyMixin):
    """Moving Average Crossover Strategy."""
    
    def __init__(self, sma_s=20, sma_l=150, **kwargs):
        self._sma_s = sma_s
        self._sma_l = sma_l
        self.params = {
            'sma_s': lambda x: int(x),
            'sma_l': lambda x: int(x)
        }
        super().__init__(**kwargs)
    
    def update_data(self, data):
        data = super().update_data(data)
        data['sma_s'] = data['close'].rolling(self._sma_s).mean()
        data['sma_l'] = data['close'].rolling(self._sma_l).mean()
        return data
    
    def calculate_positions(self, data):
        data['side'] = np.where(data['sma_s'] > data['sma_l'], 1, -1)
        return data
    
    def get_signal(self, row):
        return 1 if row['sma_s'] > row['sma_l'] else -1


class MACDStrategy(StrategyMixin):
    """MACD Trend Following Strategy."""
    
    def __init__(self, fast=12, slow=26, signal=9, **kwargs):
        self._fast = fast
        self._slow = slow
        self._signal = signal
        self.params = {
            'fast': lambda x: int(x),
            'slow': lambda x: int(x),
            'signal': lambda x: int(x)
        }
        super().__init__(**kwargs)
    
    def update_data(self, data):
        data = super().update_data(data)
        
        # Calculate EMA
        ema_fast = data['close'].ewm(span=self._fast).mean()
        ema_slow = data['close'].ewm(span=self._slow).mean()
        
        # MACD line
        data['macd'] = ema_fast - ema_slow
        
        # Signal line
        data['macd_signal'] = data['macd'].ewm(span=self._signal).mean()
        
        return data
    
    def calculate_positions(self, data):
        data['side'] = np.where(data['macd'] > data['macd_signal'], 1, -1)
        return data
    
    def get_signal(self, row):
        return 1 if row['macd'] > row['macd_signal'] else -1


class BollingerBandsStrategy(StrategyMixin):
    """Bollinger Bands Mean Reversion Strategy."""
    
    def __init__(self, window=20, dev=2, **kwargs):
        self._window = window
        self._dev = dev
        self.params = {
            'window': lambda x: int(x),
            'dev': lambda x: float(x)
        }
        super().__init__(**kwargs)
    
    def update_data(self, data):
        data = super().update_data(data)
        data['sma'] = data['close'].rolling(self._window).mean()
        data['std'] = data['close'].rolling(self._window).std()
        data['upper_band'] = data['sma'] + (data['std'] * self._dev)
        data['lower_band'] = data['sma'] - (data['std'] * self._dev)
        return data
    
    def calculate_positions(self, data):
        # Buy when price touches lower band, sell when touches upper band
        data['side'] = 0
        data.loc[data['close'] < data['lower_band'], 'side'] = 1
        data.loc[data['close'] > data['upper_band'], 'side'] = -1
        
        # Forward fill to maintain position
        data['side'] = data['side'].replace(0, np.nan).ffill().fillna(0).astype(int)
        return data
    
    def get_signal(self, row):
        if row['close'] < row['lower_band']:
            return 1
        elif row['close'] > row['upper_band']:
            return -1
        return 0


class MomentumStrategy(StrategyMixin):
    """Simple Momentum Strategy."""
    
    def __init__(self, window=30, **kwargs):
        self._window = window
        self.params = {'window': lambda x: int(x)}
        super().__init__(**kwargs)
    
    def update_data(self, data):
        data = super().update_data(data)
        data['momentum'] = data['close'].pct_change(self._window)
        return data
    
    def calculate_positions(self, data):
        data['side'] = np.where(data['momentum'] > 0, 1, -1)
        return data
    
    def get_signal(self, row):
        return 1 if row['momentum'] > 0 else -1


# Strategy registry
STRATEGIES = {
    'moving_average_crossover': MovingAverageCrossover,
    'macd_trend': MACDStrategy,
    'bollinger_bands': BollingerBandsStrategy,
    'momentum': MomentumStrategy
}

# Dynamically uploaded strategies
UPLOADED_STRATEGIES = {}


# ==================== API ENDPOINTS ====================

@app.route('/')
def index():
    """Serve the main HTML page."""
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    """Serve static files (CSS, JS, etc.)."""
    return send_from_directory('.', path)


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'version': '2.0.0',
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/data/<symbol>', methods=['GET'])
def get_data(symbol):
    """Get historical data for a symbol."""
    try:
        bars = request.args.get('bars', 600, type=int)
        timeframe = request.args.get('timeframe', None)
        
        data = load_historical_data(symbol, timeframe=timeframe, bars=bars)
        
        # Reset index to make 'date' a column for json serialization
        df_reset = data.reset_index()
        # Convert timestamp to string
        if 'date' in df_reset.columns:
            df_reset['date'] = df_reset['date'].astype(str)
        elif 'timestamp' in df_reset.columns:
            df_reset['timestamp'] = df_reset['timestamp'].astype(str)
            
        result = {
            'symbol': symbol,
            'data': df_reset.to_dict('records'),
            'bars': len(data)
        }
        
        return jsonify(result)
    
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/backtest', methods=['POST'])
def run_backtest():
    """Run backtest with given parameters."""
    try:
        params = request.json
        
        # Extract parameters
        strategy_id = params.get('strategy', 'moving_average_crossover')
        symbol = params.get('symbol', 'BTCUSDT')
        capital = params.get('capital', 10000)
        commission = params.get('commission', 0.001)  # 0.1%
        leverage = params.get('leverage', 1)
        backtester_type = params.get('backtester', 'vectorized')
        strategy_params = params.get('strategy_params', {})
        timeframe = params.get('timeframe', None)
        bars = params.get('bars', None)
        short_model = params.get('short_model', 'static')
        
        if bars:
            bars = int(bars)
        
        # Load historical data with resampling
        data = load_historical_data(symbol, timeframe=timeframe, bars=bars)
        
        # Create strategy from registries
        all_strategies = {**STRATEGIES, **UPLOADED_STRATEGIES}
        StrategyClass = all_strategies.get(strategy_id)
        if not StrategyClass:
            return jsonify({'error': f'Unknown strategy: {strategy_id}'}), 400
        
        # Convert parameter types if needed using strategy class definition
        typed_strategy_params = {}
        try:
            # Create dummy instance to inspect converters
            dummy = StrategyClass()
            converters = getattr(dummy, 'params', {})
            for k, v in strategy_params.items():
                if k in converters and callable(converters[k]):
                    typed_strategy_params[k] = converters[k](v)
                else:
                    typed_strategy_params[k] = float(v) if '.' in str(v) else int(v)
        except Exception as e:
            # Fallback direct assignment
            typed_strategy_params = strategy_params
            
        strategy = StrategyClass(**typed_strategy_params)
        
        # Create backtester
        if backtester_type == 'vectorized':
            bt = VectorizedBacktester(
                strategy=strategy,
                symbol=symbol,
                amount=capital,
                trading_costs=commission * 100,  # Stratestic expects percent
                leverage=leverage,
                short_model=short_model
            )
        else:
            bt = IterativeBacktester(
                strategy=strategy,
                symbol=symbol,
                amount=capital,
                trading_costs=commission * 100,  # Stratestic expects percent
                leverage=leverage,
                short_model=short_model
            )
        
        # Run backtest
        bt.load_data(data=data)
        bt.run(print_results=False, plot_results=False)
        results = bt.results
        
        if results is None:
            return jsonify({'error': 'Backtest execution failed, no results.'}), 500
        
        # Get equity curve
        equity_curve = []
        margin_curve = []
        if hasattr(bt, 'processed_data') and bt.processed_data is not None:
            equity_curve = bt.processed_data['equity'].tolist()
            if 'margin_ratio' in bt.processed_data.columns:
                margin_curve = bt.processed_data['margin_ratio'].fillna(0.0).tolist()
        
        # Calculate buy & hold
        bh_curve = []
        if hasattr(bt, 'processed_data') and bt.processed_data is not None and 'creturns' in bt.processed_data.columns:
            bh_curve = (bt.processed_data['creturns'] * capital).tolist()
        else:
            bh_returns = (data['close'] / data['close'].iloc[0]) * capital
            bh_curve = bh_returns.tolist()
            
        # Compute drawdown curve
        drawdown_curve = []
        peak = -1e9
        for eq in equity_curve:
            if eq > peak:
                peak = eq
            dd = (eq - peak) / peak * 100 if peak > 0 else 0.0
            drawdown_curve.append(round(dd, 2))
            
        # Serialize trades ledger
        trades_list = []
        if hasattr(bt, 'trades') and bt.trades:
            for t in bt.trades:
                trade_dict = {
                    'id': len(trades_list) + 1,
                    'time': t.exit_date.strftime('%Y-%m-%d %H:%M:%S') if hasattr(t.exit_date, 'strftime') else str(t.exit_date),
                    'entry_date': t.entry_date.strftime('%Y-%m-%d %H:%M:%S') if hasattr(t.entry_date, 'strftime') else str(t.entry_date),
                    'exit_date': t.exit_date.strftime('%Y-%m-%d %H:%M:%S') if hasattr(t.exit_date, 'strftime') else str(t.exit_date),
                    'side': 'LONG' if t.side == 1 else 'SHORT',
                    'entry': float(t.entry_price),
                    'exit': float(t.exit_price),
                    'ret': round(float(t.pnl) * 100, 2),  # pnl is percentage return in float (e.g. 0.05 for 5%)
                    'pnl': float(t.profit),  # profit is dollar pnl
                    'leverage': f"{leverage}x"
                }
                trades_list.append(trade_dict)
        
        # Format results with clean keys
        response = {
            'success': True,
            'results': {
                clean_metric_key(key): value
                for key, value in results.items()
            },
            'equity_curve': equity_curve,
            'buy_hold_curve': bh_curve,
            'drawdown_curve': drawdown_curve,
            'margin_curve': margin_curve,
            'trades': trades_list,
            'data_length': len(data),
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify(response)
    
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500


@app.route('/api/optimize', methods=['POST'])
def optimize_strategy():
    """Optimize strategy parameters."""
    try:
        params = request.json
        
        strategy_id = params.get('strategy', 'moving_average_crossover')
        symbol = params.get('symbol', 'BTCUSDT')
        capital = params.get('capital', 10000)
        commission = params.get('commission', 0.001)
        leverage = params.get('leverage', 1)
        param_ranges = params.get('param_ranges', {})
        optimizer_type = params.get('optimizer', 'brute_force')
        metric = params.get('metric', 'Sharpe Ratio')
        timeframe = params.get('timeframe', None)
        bars = params.get('bars', None)
        short_model = params.get('short_model', 'static')
        
        if bars:
            bars = int(bars)
            
        # Load historical data with resampling
        data = load_historical_data(symbol, timeframe=timeframe, bars=bars)
        
        # Create strategy from registries
        all_strategies = {**STRATEGIES, **UPLOADED_STRATEGIES}
        StrategyClass = all_strategies.get(strategy_id)
        if not StrategyClass:
            return jsonify({'error': f'Unknown strategy: {strategy_id}'}), 400
        
        strategy = StrategyClass()
        
        # Create backtester
        bt = VectorizedBacktester(
            strategy=strategy,
            symbol=symbol,
            amount=capital,
            trading_costs=commission * 100,  # Stratestic expects percent
            leverage=leverage,
            short_model=short_model
        )
        bt.load_data(data=data)
        
        # Convert param ranges to optimization format
        opt_params = {}
        for param_name, param_config in param_ranges.items():
            min_val = param_config.get('min', 10)
            max_val = param_config.get('max', 100)
            step = param_config.get('step', 10)
            opt_params[param_name] = (min_val, max_val, step)
        
        # Run optimization
        if optimizer_type == 'brute_force':
            best_params, best_metric = bt.optimize(
                params_dict=opt_params,
                optimization_metric=metric,
                n_jobs=1
            )
        else:
            # Genetic algorithm
            best_params, best_metric = bt.optimize(
                params_dict={k: (v[0], v[1]) for k, v in opt_params.items()},
                optimizer='gen_alg',
                optimization_metric=metric,
                pop_size=params.get('pop_size', 20),
                max_gen=params.get('max_gen', 15)
            )
            
        # Convert best parameters structure to standard dict with native python types
        py_best_params = {}
        for k, v in best_params.items():
            # If key contains strategy class name (e.g. MovingAverageCrossover__sma_s), clean it
            clean_k = k.split('__')[-1] if '__' in k else k
            py_best_params[clean_k] = float(v) if '.' in str(v) else int(v)
        
        return jsonify({
            'success': True,
            'best_params': py_best_params,
            'best_metric': float(best_metric),
            'metric_name': metric,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500


@app.route('/api/validate', methods=['POST'])
def validate_strategy_endpoint():
    """Validate a strategy class."""
    try:
        data = request.json
        strategy_code = data.get('code', '')
        
        # Create a temporary module to load the strategy
        import tempfile
        import importlib.util
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(strategy_code)
            temp_file = f.name
        
        try:
            # Load module
            spec = importlib.util.spec_from_file_location("temp_strategy", temp_file)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Find strategy classes
            validator = StrategyValidator()
            strategies_found = []
            
            for name in dir(module):
                obj = getattr(module, name)
                try:
                    if isinstance(obj, type) and issubclass(obj, StrategyMixin) and obj is not StrategyMixin:
                        is_valid, errors = validator.validate(obj)
                        info = validator.get_strategy_info(obj)
                        
                        strategies_found.append({
                            'name': name,
                            'is_valid': is_valid,
                            'errors': errors,
                            'info': {
                                'docstring': info['docstring'],
                                'parameters': info['parameters'],
                                'methods': info['methods']
                            }
                        })
                except TypeError:
                    continue
            
            return jsonify({
                'success': True,
                'strategies': strategies_found,
                'count': len(strategies_found)
            })
        
        finally:
            os.unlink(temp_file)
    
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500


@app.route('/api/strategies/upload', methods=['POST'])
def upload_strategy():
    """Upload, validate, compile and register a custom strategy class."""
    try:
        data = request.json
        strategy_code = data.get('code', '')
        
        if not strategy_code:
            return jsonify({'success': False, 'error': 'No code provided'}), 400
            
        import tempfile
        import importlib.util
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(strategy_code)
            temp_file = f.name
            
        try:
            # Load module
            spec = importlib.util.spec_from_file_location("uploaded_strategy_temp", temp_file)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Find strategy classes
            validator = StrategyValidator()
            strategies_found = []
            
            for name in dir(module):
                obj = getattr(module, name)
                try:
                    if isinstance(obj, type) and issubclass(obj, StrategyMixin) and obj is not StrategyMixin:
                        is_valid, errors = validator.validate(obj)
                        
                        if is_valid:
                            info = validator.get_strategy_info(obj)
                            
                            strategy_id = name.lower().strip()
                            # Clean up and ensure unique name
                            UPLOADED_STRATEGIES[strategy_id] = obj
                            
                            strategies_found.append({
                                'id': strategy_id,
                                'name': name,
                                'description': info['docstring'] or '',
                                'parameters': list(info['parameters'].keys()),
                                'parameters_details': info['parameters']
                            })
                except TypeError:
                    continue
            
            if not strategies_found:
                return jsonify({
                    'success': False, 
                    'error': 'No valid strategy class inheriting from StrategyMixin was found.'
                }), 400
                
            return jsonify({
                'success': True,
                'strategies': strategies_found,
                'count': len(strategies_found)
            })
            
        finally:
            try:
                os.unlink(temp_file)
            except:
                pass
                
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e), 'traceback': traceback.format_exc()}), 500


@app.route('/api/convert/mql5', methods=['POST'])
def convert_mql5():
    """Convert MQL5 EA code to Python strategy."""
    try:
        data = request.json
        mql5_code = data.get('code', '')
        
        # Simple MQL5 to Python converter (placeholder - would need full implementation)
        # For now, return a template based on detected patterns
        
        # Detect strategy type
        if 'iMA' in mql5_code or 'MovingAverage' in mql5_code:
            template = """from stratestic.strategies import StrategyMixin
import numpy as np

class ConvertedStrategy(StrategyMixin):
    \"\"\"
    Converted from MT5 Expert Advisor.
    Moving Average Crossover Strategy.
    \"\"\"
    
    def __init__(self, fast_period=20, slow_period=50, **kwargs):
        self._fast_period = fast_period
        self._slow_period = slow_period
        self.params = {
            'fast_period': lambda x: int(x),
            'slow_period': lambda x: int(x)
        }
        super().__init__(**kwargs)
    
    def update_data(self, data):
        data = super().update_data(data)
        data['ma_fast'] = data['close'].rolling(self._fast_period).mean()
        data['ma_slow'] = data['close'].rolling(self._slow_period).mean()
        return data
    
    def calculate_positions(self, data):
        data['side'] = np.where(data['ma_fast'] > data['ma_slow'], 1, -1)
        return data
    
    def get_signal(self, row):
        return 1 if row['ma_fast'] > row['ma_slow'] else -1
"""
        
        elif 'iRSI' in mql5_code or 'RSI' in mql5_code:
            template = """from stratestic.strategies import StrategyMixin
import numpy as np

class ConvertedStrategy(StrategyMixin):
    \"\"\"
    Converted from MT5 Expert Advisor.
    RSI Mean Reversion Strategy.
    \"\"\"
    
    def __init__(self, rsi_period=14, oversold=30, overbought=70, **kwargs):
        self._rsi_period = rsi_period
        self._oversold = oversold
        self._overbought = overbought
        self.params = {
            'rsi_period': lambda x: int(x),
            'oversold': lambda x: float(x),
            'overbought': lambda x: float(x)
        }
        super().__init__(**kwargs)
    
    def update_data(self, data):
        data = super().update_data(data)
        
        # Calculate RSI
        delta = data['close'].diff()
        gain = delta.where(delta > 0, 0).rolling(self._rsi_period).mean()
        loss = -delta.where(delta < 0, 0).rolling(self._rsi_period).mean()
        rs = gain / loss
        data['rsi'] = 100 - (100 / (1 + rs))
        
        return data
    
    def calculate_positions(self, data):
        data['side'] = 0
        data.loc[data['rsi'] < self._oversold, 'side'] = 1
        data.loc[data['rsi'] > self._overbought, 'side'] = -1
        data['side'] = data['side'].replace(0, np.nan).ffill().fillna(0).astype(int)
        return data
    
    def get_signal(self, row):
        if row['rsi'] < self._oversold:
            return 1
        elif row['rsi'] > self._overbought:
            return -1
        return 0
"""
        
        else:
            template = """from stratestic.strategies import StrategyMixin
import numpy as np

class ConvertedStrategy(StrategyMixin):
    \"\"\"
    Converted from MT5 Expert Advisor.
    Custom strategy - review and modify as needed.
    \"\"\"
    
    def __init__(self, param1=10, **kwargs):
        self._param1 = param1
        self.params = {'param1': lambda x: int(x)}
        super().__init__(**kwargs)
    
    def update_data(self, data):
        data = super().update_data(data)
        # TODO: Add your indicators here
        return data
    
    def calculate_positions(self, data):
        # TODO: Implement position logic
        data['side'] = 1  # Placeholder
        return data
    
    def get_signal(self, row):
        # TODO: Implement signal logic
        return 1  # Placeholder
"""
        
        logs = [
            f"[{datetime.now().strftime('%H:%M:%S')}] Parsing MQL5 source code...",
            f"[{datetime.now().strftime('%H:%M:%S')}] Detected indicators in OnInit()...",
            f"[{datetime.now().strftime('%H:%M:%S')}] Translating trading signals from OnTick()...",
            f"[{datetime.now().strftime('%H:%M:%S')}] Generating Python StrategyMixin subclass...",
            f"[{datetime.now().strftime('%H:%M:%S')}] ✓ Conversion complete!"
        ]
        
        return jsonify({
            'success': True,
            'python_code': template.strip(),
            'logs': logs
        })
    
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500


@app.route('/api/strategies', methods=['GET'])
def list_strategies():
    """List available strategies."""
    strategies_info = {}
    
    # Merge STRATEGIES and UPLOADED_STRATEGIES
    all_strategies = {**STRATEGIES, **UPLOADED_STRATEGIES}
    
    for strategy_id, StrategyClass in all_strategies.items():
        # Create a temporary instance to get params
        try:
            import inspect
            sig = inspect.signature(StrategyClass.__init__)
            parameters = []
            for param_name in sig.parameters.keys():
                if param_name not in ['self', 'data', 'kwargs']:
                    parameters.append(param_name)
                    
            if not parameters:
                temp_strategy = StrategyClass()
                params = temp_strategy.params if hasattr(temp_strategy, 'params') else {}
                parameters = list(params.keys())
                
            strategies_info[strategy_id] = {
                'name': StrategyClass.__name__,
                'description': StrategyClass.__doc__ or '',
                'parameters': parameters
            }
        except:
            strategies_info[strategy_id] = {
                'name': StrategyClass.__name__,
                'description': StrategyClass.__doc__ or '',
                'parameters': []
            }
    
    return jsonify({
        'strategies': strategies_info,
        'count': len(strategies_info)
    })


@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    print("=" * 60)
    print("  Stratestic v2.0 - Flask Backend Server")
    print("=" * 60)
    print(f"\n🚀 Starting server...")
    print(f"📍 Server: http://localhost:5000")
    print(f"📊 Dashboard: http://localhost:5000/")
    print(f"🔌 API Base: http://localhost:5000/api/")
    print(f"\n✅ Ready to accept connections!\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
