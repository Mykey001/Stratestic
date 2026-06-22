# Stratestic Web Interface

Professional-grade web interface for backtesting, optimization, and strategy development.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements_web.txt
```

### 2. Start Backend
```bash
python app.py
```

You should see:
```
============================================================
  Stratestic v2.0 - Flask Backend Server
============================================================

🚀 Starting server...
📍 Server: http://localhost:5000
📊 Dashboard: http://localhost:5000/
🔌 API Base: http://localhost:5000/api/

✅ Ready to accept connections!
```

### 3. Open Dashboard
Open your browser and navigate to:
```
http://localhost:5000
```

Look for the **"BACKEND CONNECTED"** badge in the header to confirm everything is working!

---

## 📊 Features

### ✨ Backtesting Dashboard
- Run backtests with customizable parameters
- Multiple datasets (BTCUSDT, ETHUSDT, SOLUSDT, AAPL)
- Vectorized or iterative backtester
- Real-time performance charts
- 20+ performance metrics
- Trade-by-trade analysis

### 🔬 Strategy Lab
- Convert MT5 Expert Advisors to Python
- Validate strategy code
- Sample EAs included
- Real-time conversion logs

### ⚡ Optimization Suite
- Brute force grid search
- Genetic algorithm optimization
- Multiple optimization metrics
- Real-time convergence visualization
- Customizable parameter ranges

### 📈 Trade Logs
- Individual trade details
- Export to CSV
- Filter and sort

---

## 🛠️ Built-in Strategies

The web interface includes 4 demo strategies:

1. **Moving Average Crossover** - Classic SMA crossover
2. **MACD Trend** - MACD signal line crossover
3. **Bollinger Bands** - Mean reversion strategy
4. **Momentum** - Simple momentum-based strategy

These are for demonstration only. Use the Strategy Lab to create your own!

---

## 📚 Documentation

- **Quick Start**: `WEB_INTERFACE_QUICKSTART.md` - Complete usage guide
- **API Reference**: `WEB_INTEGRATION_STATUS.md` - API documentation
- **Testing**: `test_flask_backend.py` - Automated test suite

---

## 🧪 Testing

### Quick Health Check
```bash
curl http://localhost:5000/api/health
```

### Comprehensive Tests
```bash
python test_flask_backend.py
```

---

## 🎯 Example Workflows

### Basic Backtest
1. Open dashboard
2. Select dataset (e.g., BTCUSDT)
3. Choose strategy parameters
4. Click "Run Backtest"
5. Review results and charts

### Optimize Strategy
1. Navigate to Optimization tab
2. Set parameter ranges
3. Choose optimization algorithm
4. Select optimization metric
5. Run optimizer
6. Apply best parameters to backtest

### Convert MT5 EA
1. Go to Strategy Lab
2. Select sample EA or paste your own
3. Click "Translate to Python"
4. Review generated code
5. Validate strategy
6. Copy code for use

---

## 📖 API Endpoints

The backend provides these REST endpoints:

- `GET /api/health` - Health check
- `GET /api/strategies` - List strategies
- `POST /api/backtest` - Run backtest
- `POST /api/optimize` - Optimize parameters
- `POST /api/validate` - Validate strategy
- `POST /api/convert/mql5` - Convert MQL5 to Python
- `GET /api/data/<symbol>` - Get historical data

See `WEB_INTEGRATION_STATUS.md` for detailed API documentation.

---

## 🔧 Configuration

### Backend Port
Edit `app.py`:
```python
app.run(debug=True, host='0.0.0.0', port=5000)
```

### Frontend API URL
Edit `index.js`:
```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

---

## 🐛 Troubleshooting

### Backend won't start
- Install dependencies: `pip install -r requirements_web.txt`
- Check port 5000 is free: `netstat -ano | findstr :5000`
- Verify Stratestic is installed: `pip install -e .`

### "DEMO MODE" badge showing
- Ensure backend is running: `python app.py`
- Check console for errors (F12 in browser)
- Verify URL is correct: `http://localhost:5000`

### Optimization takes too long
- Reduce parameter ranges
- Increase step size
- Use genetic algorithm instead of brute force
- Reduce population size or generations

See `WEB_INTERFACE_QUICKSTART.md` for more troubleshooting tips.

---

## 💡 Tips

- Start with 1x leverage to understand strategy behavior
- Use realistic trading costs (0.05-0.1%)
- Test on multiple datasets to avoid overfitting
- Optimize on Sharpe ratio rather than raw returns
- Keep parameter ranges reasonable

---

## 🔐 Security Note

**This is a development server.** For production deployment:
- Add authentication (JWT, OAuth)
- Enable HTTPS
- Disable debug mode
- Add rate limiting
- Use a production WSGI server (gunicorn, uwsgi)

---

## 📞 Support

- **Documentation**: See `DOCUMENTATION_INDEX.md`
- **Issues**: Check `WEB_INTERFACE_QUICKSTART.md` troubleshooting
- **Testing**: Run `python test_flask_backend.py`

---

## 🎉 Happy Trading!

Open your browser to `http://localhost:5000` and start backtesting!

For detailed usage instructions, see `WEB_INTERFACE_QUICKSTART.md`.

---

*Stratestic v2.0 - Universal Backtesting Framework*
