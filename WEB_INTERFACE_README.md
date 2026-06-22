# Stratestic v2.0 - Web Interface Documentation

## Overview

The Stratestic Web Interface provides a professional-grade dashboard for backtesting, optimizing, and validating trading strategies through an intuitive browser-based UI.

---

## Architecture

### Tech Stack

**Frontend:**
- HTML5 + CSS3 (Custom styling with glassmorphism design)
- Vanilla JavaScript (ES6+)
- Chart.js for visualizations
- Lucide Icons for UI elements

**Backend:**
- Flask 3.1.0 (Python web framework)
- Flask-CORS (Cross-origin resource sharing)
- Stratestic v2.0 core library

### Components

1. **Dashboard** - Real-time backtest visualization and performance metrics
2. **Strategy Lab** - MT5 EA converter and strategy validator
3. **Optimization Suite** - Parameter optimization with genetic algorithms
4. **Trade Logs** - Detailed execution history

---

## Installation

### Prerequisites

- Python 3.10-3.12
- Stratestic v2.0 installed
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Setup Steps

1. **Install Web Dependencies**:
   ```bash
   pip install -r requirements_web.txt
   ```

2. **Verify Stratestic Installation**:
   ```bash
   python -c "import stratestic; print(stratestic.__version__)"
   ```

3. **Start the Backend Server**:
   ```bash
   python app.py
   ```

4. **Open the Dashboard**:
   Navigate to `http://localhost:5000` in your browser

---

## Features

### 1. Real-Time Backtesting

**Engines:**
- Vectorized Backtester (fast)
- Iterative Backtester (flexible)

**Configuration:**
- Asset selection (BTCUSDT, ETHUSDT, SOLUSDT, AAPL)
- Initial capital
- Trading costs
- Leverage (1-50x)
- Short position model

**Visualization:**
- Equity curve
- Drawdown analysis
- Margin ratio tracking

**Metrics:**
- Total Return, Sharpe Ratio, Sortino Ratio
- Maximum Drawdown, Win Rate
- Profit Factor, SQN, Calmar Ratio

### 2. Strategy Lab

**MT5 EA Converter:**
- Upload MQL5 Expert Advisor code
- Automatic translation to Python
- Strategy validation
- Sample EAs included

**Python Strategy Validator:**
- Checks StrategyMixin inheritance
- Validates required methods
- Parameter validation
- Instantiation testing

### 3. Parameter Optimization

**Algorithms:**
- Brute Force (Grid Search)
- Genetic Algorithm (Heuristic)

**Metrics:**
- Sharpe Ratio
- Total Return
- Calmar Ratio
- Sortino Ratio
- Win Rate
- Minimum Drawdown

**GA Parameters:**
- Population size
- Max generations
- Mutation rate
- Selection strategy

### 4. Trade Log Analysis

**Details:**
- Entry/exit timestamps
- Position side (Long/Short)
- Entry/exit prices
- Net returns
- P/L in dollars
- Leverage state

**Export:**
- CSV format
- Complete trade history

---

## API Endpoints

### Health Check
```
GET /api/health
```
Returns server status and version info.

### Get Historical Data
```
GET /api/data/<symbol>?bars=600
```
Returns OHLCV data for specified symbol.

### Run Backtest
```
POST /api/backtest
Content-Type: application/json

{
  "strategy": "moving_average_crossover",
  "symbol": "BTCUSDT",
  "capital": 10000,
  "commission": 0.001,
  "leverage": 1,
  "backtester": "vectorized",
  "strategy_params": {
    "sma_s": 20,
    "sma_l": 150
  }
}
```
Executes backtest and returns results.

### Optimize Strategy
```
POST /api/optimize
Content-Type: application/json

{
  "strategy": "moving_average_crossover",
  "symbol": "BTCUSDT",
  "capital": 10000,
  "commission": 0.001,
  "leverage": 1,
  "optimizer": "brute_force",
  "metric": "Sharpe Ratio",
  "param_ranges": {
    "sma_s": {"min": 10, "max": 50, "step": 10},
    "sma_l": {"min": 100, "max": 200, "step": 20}
  }
}
```
Runs parameter optimization.

### Validate Strategy
```
POST /api/validate
Content-Type: application/json

{
  "code": "from stratestic.strategies import StrategyMixin\n..."
}
```
Validates Python strategy code.

### Convert MQL5
```
POST /api/convert/mql5
Content-Type: application/json

{
  "code": "// MT5 EA code..."
}
```
Converts MT5 EA to Python strategy.

### List Strategies
```
GET /api/strategies
```
Returns available built-in strategies.

---

## Configuration

### Backend Configuration

Edit `app.py` to customize:

```python
# Server settings
HOST = '0.0.0.0'  # Listen on all interfaces
PORT = 5000       # Default port
DEBUG = True      # Enable debug mode

# CORS settings
CORS(app)  # Allow all origins (modify for production)

# Max upload size
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB
```

### Frontend Configuration

Edit `index.js` to customize:

```javascript
// API base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Default parameters
const DEFAULT_CAPITAL = 10000;
const DEFAULT_COMMISSION = 0.001;
const DEFAULT_LEVERAGE = 1;
```

---

## Usage Examples

### Running a Backtest

1. Select asset from sidebar (e.g., BTCUSDT)
2. Set initial capital ($10,000)
3. Choose backtester engine (Vectorized)
4. Adjust strategy parameters
5. Click "Run Backtest"
6. View results in dashboard

### Optimizing Parameters

1. Navigate to "Optimization" tab
2. Select optimization algorithm
3. Set parameter ranges
4. Choose optimization metric
5. Click "Run Optimizer"
6. Review best parameters

### Converting MT5 EA

1. Navigate to "Strategy Lab" tab
2. Select sample EA or paste MQL5 code
3. Click "Translate to Python"
4. Review generated Python code
5. Click "Run Validator"
6. Copy code for use

---

## Operational Modes

### Full Mode (Backend + Frontend)
- Backend server running
- Full Stratestic API access
- Real backtesting and optimization
- Accurate performance metrics
- Strategy validation

**Indicator**: Green "BACKEND CONNECTED" badge

### Demo Mode (Frontend Only)
- Backend not running
- Frontend simulation only
- Approximate results
- Limited functionality
- No strategy validation

**Indicator**: Yellow "DEMO MODE" badge

---

## Troubleshooting

### Backend Won't Start

**Error**: `ModuleNotFoundError: No module named 'flask'`
**Solution**:
```bash
pip install -r requirements_web.txt
```

**Error**: `ModuleNotFoundError: No module named 'stratestic'`
**Solution**:
```bash
pip install -e .
# or
pip install stratestic
```

**Error**: Port 5000 already in use
**Solution**:
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :5000
kill -9 <PID>
```

### Frontend Issues

**Issue**: Dashboard not loading
**Solution**:
1. Check browser console for errors (F12)
2. Verify backend is running (`http://localhost:5000/api/health`)
3. Clear browser cache
4. Try different browser

**Issue**: Charts not rendering
**Solution**:
1. Check Chart.js loaded (inspect network tab)
2. Verify data returned from API
3. Check browser console for JavaScript errors

**Issue**: API calls failing
**Solution**:
1. Verify CORS enabled in backend
2. Check API_BASE_URL in `index.js`
3. Inspect network tab in browser dev tools

### Performance Issues

**Slow backtests**:
- Reduce data length (bars parameter)
- Use vectorized backtester
- Close unnecessary browser tabs

**Slow optimization**:
- Reduce parameter ranges
- Decrease population size (GA)
- Use brute force for small spaces

---

## Security Considerations

### For Development

Current setup is suitable for **local development only**.

- Backend listens on all interfaces (0.0.0.0)
- CORS allows all origins
- Debug mode enabled
- No authentication

### For Production

**Do NOT deploy as-is to production**. Required changes:

1. **Disable debug mode**:
   ```python
   app.run(debug=False)
   ```

2. **Restrict CORS**:
   ```python
   CORS(app, origins=['https://yourdomain.com'])
   ```

3. **Add authentication**:
   ```python
   from flask_httpauth import HTTPBasicAuth
   auth = HTTPBasicAuth()
   ```

4. **Use production server**:
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

5. **Enable HTTPS**:
   Use reverse proxy (nginx, Apache)

6. **Rate limiting**:
   ```python
   from flask_limiter import Limiter
   limiter = Limiter(app)
   ```

---

## Development

### Adding New Strategies

1. **Backend** (`app.py`):
   ```python
   class NewStrategy(StrategyMixin):
       def __init__(self, param1=10, **kwargs):
           # Implementation
           pass
   
   # Add to registry
   STRATEGIES['new_strategy'] = NewStrategy
   ```

2. **Frontend** (`index.js`):
   ```javascript
   const strategies = {
       new_strategy: {
           name: "New Strategy",
           params: {
               param1: { name: "Parameter 1", val: 10, min: 5, max: 50, step: 1 }
           },
           calculateSignals: function(data, params) {
               // Implementation
           }
       }
   };
   ```

### Extending API

Add new endpoint in `app.py`:

```python
@app.route('/api/custom', methods=['POST'])
def custom_endpoint():
    try:
        data = request.json
        # Process request
        result = process_data(data)
        return jsonify({'success': True, 'result': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

---

## Performance Optimization

### Backend

1. **Caching**: Implement result caching
   ```python
   from functools import lru_cache
   
   @lru_cache(maxsize=128)
   def cached_backtest(params):
       # Expensive operation
       pass
   ```

2. **Async Processing**: Use Celery for long tasks
   ```python
   from celery import Celery
   celery = Celery(app.name)
   
   @celery.task
   def async_optimization(params):
       # Long-running optimization
       pass
   ```

3. **Database**: Store results
   ```python
   from flask_sqlalchemy import SQLAlchemy
   db = SQLAlchemy(app)
   ```

### Frontend

1. **Debouncing**: Limit API calls
   ```javascript
   const debounce = (func, wait) => {
       let timeout;
       return function(...args) {
           clearTimeout(timeout);
           timeout = setTimeout(() => func.apply(this, args), wait);
       };
   };
   ```

2. **Lazy Loading**: Load charts on demand
3. **Web Workers**: Offload calculations

---

## Testing

### Backend Tests

```bash
# Install test dependencies
pip install pytest pytest-flask

# Run tests
pytest tests/test_api.py -v
```

### Frontend Tests

```bash
# Install test dependencies
npm install -D jest @testing-library/dom

# Run tests
npm test
```

---

## Monitoring

### Backend Logging

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('stratestic.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)
logger.info('Server started')
```

### Performance Metrics

```python
from flask import g
import time

@app.before_request
def before_request():
    g.start = time.time()

@app.after_request
def after_request(response):
    diff = time.time() - g.start
    logger.info(f"Request completed in {diff:.2f}s")
    return response
```

---

## Support

### Getting Help

- **Documentation**: See main Stratestic docs
- **Issues**: [GitHub Issues](https://github.com/diogomatoschaves/stratestic/issues)
- **Community**: GitHub Discussions

### Reporting Bugs

Include:
1. Operating system and Python version
2. Browser and version
3. Error messages (backend logs + browser console)
4. Steps to reproduce
5. Expected vs actual behavior

---

## Changelog

### v2.0.0 (June 2026)
- Initial web interface release
- Flask backend with REST API
- Interactive dashboard
- MT5 EA converter
- Strategy validator
- Parameter optimization
- Real-time visualization

---

## License

MIT License - see main LICENSE file

---

## Contributors

- Backend API: Stratestic core team
- Web Interface: Stratestic v2.0 team
- Design: Custom glassmorphism theme

---

*Last Updated: June 20, 2026*
