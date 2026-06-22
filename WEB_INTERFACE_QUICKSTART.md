# Stratestic v2.0 Web Interface - Quick Start Guide

A professional-grade web interface for backtesting, optimization, and MT5 EA conversion.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9 or higher
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Stratestic v2.0 installed

### Installation

1. **Install Stratestic v2.0**
   ```bash
   cd stratestic
   pip install -e .
   ```

2. **Install Web Dependencies**
   ```bash
   pip install -r requirements_web.txt
   ```

   This installs:
   - Flask (web framework)
   - Flask-CORS (cross-origin requests)

### Starting the Backend

1. **Start the Flask Server**
   ```bash
   python app.py
   ```

2. **Verify Server is Running**
   
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

3. **Test the Backend** (Optional)
   ```bash
   python test_flask_backend.py
   ```

### Opening the Frontend

**Option 1: Via Flask Server (Recommended)**
1. Open your browser
2. Navigate to: `http://localhost:5000`

**Option 2: Direct File**
1. Locate `index.html` in the project folder
2. Double-click to open in your default browser
3. Or right-click → "Open with" → Choose browser

### Verify Connection

Look at the header of the dashboard:
- ✅ **"BACKEND CONNECTED"** (green badge) = Full functionality
- ⚠️ **"DEMO MODE"** (yellow badge) = Frontend-only simulation

---

## 📊 Using the Dashboard

### 1. Backtesting

**Configure Your Backtest:**
1. Select a **Historical Dataset** (BTCUSDT, ETHUSDT, SOLUSDT, AAPL)
2. Choose **Backtest Model** (Vectorized or Iterative)
3. Set **Initial Capital** (default: $10,000)
4. Adjust **Trading Costs** (default: 0.05%)
5. Set **Leverage** (1x to 50x)
6. Choose **Short Position Model** (Static or Inverse)

**Strategy Parameters:**
- Adjust strategy-specific parameters in the sidebar
- Parameters change based on selected strategy

**Run Backtest:**
1. Click **"Run Backtest"** button in header
2. Wait for results (usually 1-3 seconds)
3. View performance metrics and charts

**View Results:**
- **KPI Tiles**: Key metrics at a glance
- **Charts**: Equity curve, drawdown, margin ratio
- **Detailed Ratios**: Complete performance breakdown
- **Trade Logs**: Individual trade details

---

### 2. Strategy Lab (MT5 Conversion)

**Convert MT5 Expert Advisor to Python:**

1. Navigate to **"Strategy Lab"** tab
2. Load a sample EA from dropdown or paste your own MQL5 code
3. Click **"Translate to Python"**
4. Review generated Python strategy code
5. Click **"Run Validator"** to check strategy validity
6. Copy the code for use in your projects

**Sample EAs Included:**
- SMA Crossover EA
- RSI Mean Reversion EA
- MACD Trend Follower EA

**Validation Checklist:**
- ✅ Inherits from StrategyMixin
- ✅ Implements calculate_positions()
- ✅ Implements get_signal()
- ✅ Defines parameters dictionary

---

### 3. Optimization Suite

**Optimize Strategy Parameters:**

1. Navigate to **"Optimization"** tab
2. Choose **Optimization Algorithm**:
   - **Brute Force**: Exhaustive grid search
   - **Genetic Algorithm**: Heuristic search
3. Select **Optimization Metric**:
   - Sharpe Ratio (recommended)
   - Total Return
   - Calmar Ratio
   - Sortino Ratio
   - Win Rate
   - Minimize Drawdown

**Configure Parameter Ranges:**
- Set min, max, and step values for each parameter
- Smaller steps = more thorough but slower

**Genetic Algorithm Settings** (if selected):
- Population Size (default: 20)
- Max Generations (default: 15)
- Mutation Rate (default: 0.1)
- Selection Strategy

**Run Optimization:**
1. Click **"Run Optimizer"**
2. Watch convergence in real-time
3. View best parameters and fitness value
4. Review optimizer logs

---

### 4. Trade Logs

**View Individual Trades:**

1. Navigate to **"Trade Logs"** tab after running a backtest
2. Review each trade's details:
   - Entry/Exit prices
   - Net return percentage
   - Profit/Loss in dollars
   - Leverage state
3. Click **"Export CSV"** to save trade history

---

## 🎯 Example Workflows

### Workflow 1: Quick Backtest
```
1. Open dashboard
2. Select BTCUSDT dataset
3. Keep default settings (MA Crossover, $10k capital, 1x leverage)
4. Click "Run Backtest"
5. Review results
```

### Workflow 2: Optimize & Test
```
1. Run initial backtest with default parameters
2. Navigate to Optimization tab
3. Set parameter ranges (e.g., SMA Short: 10-50, SMA Long: 100-200)
4. Select "Sharpe Ratio" as metric
5. Run optimization
6. Copy best parameters
7. Return to Dashboard
8. Update strategy parameters with optimized values
9. Run final backtest
```

### Workflow 3: Convert MT5 EA
```
1. Navigate to Strategy Lab
2. Select sample EA or paste your own MQL5 code
3. Click "Translate to Python"
4. Review conversion logs
5. Click "Run Validator"
6. If valid, copy Python code
7. Save to .py file for use in projects
```

---

## 🔧 Configuration Options

### Backend Settings

Edit `app.py` to customize:
```python
# Port
app.run(debug=True, host='0.0.0.0', port=5000)

# Max file size
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB
```

### Frontend Settings

Edit `index.js` to customize:
```javascript
// API endpoint
const API_BASE_URL = 'http://localhost:5000/api';

// Data generation settings
function generateDataset(symbol, length = 600) {
    // Modify dataset generation logic
}
```

---

## 📈 Built-in Strategies

### 1. Moving Average Crossover
**Parameters:**
- `sma_s`: Short SMA period (default: 20)
- `sma_l`: Long SMA period (default: 150)

**Logic:** Long when fast MA > slow MA, short otherwise

### 2. MACD Trend
**Parameters:**
- `fast`: Fast EMA period (default: 12)
- `slow`: Slow EMA period (default: 26)
- `signal`: Signal SMA period (default: 9)

**Logic:** Long when MACD > signal, short otherwise

### 3. Bollinger Bands Reversion
**Parameters:**
- `window`: MA window (default: 20)
- `dev`: Standard deviation multiplier (default: 2)

**Logic:** Long when price touches lower band, short when touches upper band

### 4. Momentum
**Parameters:**
- `window`: Momentum window (default: 30)

**Logic:** Long when momentum > 0, short otherwise

---

## 🐛 Troubleshooting

### Backend Not Starting

**Problem:** `ModuleNotFoundError: No module named 'flask'`  
**Solution:** Install dependencies: `pip install -r requirements_web.txt`

**Problem:** `Address already in use`  
**Solution:** Port 5000 is occupied. Stop other services or change port in `app.py`

**Problem:** Import errors for Stratestic modules  
**Solution:** Install Stratestic: `pip install -e .`

### Frontend Issues

**Problem:** "DEMO MODE" badge shows even with backend running  
**Solution:** 
1. Verify backend is running on port 5000
2. Check browser console (F12) for errors
3. Test health endpoint: `curl http://localhost:5000/api/health`

**Problem:** Charts not rendering  
**Solution:**
1. Check browser console for JavaScript errors
2. Ensure Chart.js is loading (check network tab)
3. Refresh page (Ctrl+F5 for hard refresh)

**Problem:** Optimization takes too long  
**Solution:**
1. Reduce parameter ranges
2. Increase step size
3. Use genetic algorithm instead of brute force
4. Reduce population size or generations

### Performance Issues

**Problem:** Slow backtests  
**Solution:**
1. Use vectorized backtester instead of iterative
2. Reduce dataset size
3. Simplify strategy logic

**Problem:** Browser freezes  
**Solution:**
1. Ensure backend is handling computation
2. Check "BACKEND CONNECTED" status
3. Reduce chart data points

---

## 📚 Additional Resources

- **Strategy Development Guide**: See `STRATEGY_GUIDE.md`
- **Migration Guide**: See `MIGRATION_GUIDE_v1_to_v2.md`
- **API Reference**: See `WEB_INTEGRATION_STATUS.md`
- **Codebase Documentation**: See `CODEBASE_INDEX.md`

---

## 🔐 Security Notes

**For Development Only:**
- Current setup is for local development
- Backend runs in debug mode
- No authentication/authorization

**For Production:**
- Add authentication (JWT, OAuth, etc.)
- Enable HTTPS
- Disable debug mode
- Add rate limiting
- Validate all inputs
- Use environment variables for secrets

---

## 💡 Tips & Best Practices

### Backtesting
- Start with 1x leverage to understand strategy behavior
- Use realistic trading costs (0.05-0.1% is typical)
- Test on multiple datasets to avoid overfitting
- Check drawdown and Sharpe ratio, not just returns

### Optimization
- Don't over-optimize (avoid curve fitting)
- Use walk-forward analysis for robustness
- Optimize on Sharpe ratio rather than raw returns
- Keep parameter ranges reasonable
- Validate optimized parameters on out-of-sample data

### Strategy Development
- Start simple, add complexity gradually
- Document your strategy logic
- Test edge cases (low volatility, high volatility, trends, ranges)
- Consider transaction costs and slippage
- Use stop losses and position sizing

---

## 🎓 Learning Path

**Beginner:**
1. Run backtests with built-in strategies
2. Experiment with different parameters
3. Understand performance metrics
4. Compare strategies on same dataset

**Intermediate:**
5. Convert MT5 EAs to Python
6. Modify generated strategies
7. Run parameter optimizations
8. Analyze trade logs

**Advanced:**
9. Create custom strategies from scratch
10. Implement ML-based strategies
11. Build strategy combiners
12. Perform portfolio backtests

---

## 📞 Support

**Documentation:**
- Check `DOCUMENTATION_INDEX.md` for all docs
- Review `QUICK_REFERENCE.md` for syntax

**Issues:**
- Check troubleshooting section above
- Review browser console for errors
- Check Flask server logs for backend errors

**Testing:**
- Run `python test_flask_backend.py` to verify backend
- Check backend health: `curl http://localhost:5000/api/health`

---

## 🎉 You're Ready!

Start the backend, open the dashboard, and begin backtesting your strategies!

```bash
# Start backend
python app.py

# In another terminal, test it
python test_flask_backend.py

# Open browser to:
http://localhost:5000
```

Happy trading! 📈

---

*Stratestic v2.0 - Universal Bring Your Own Strategy (BYOS) Framework*  
*Last Updated: June 20, 2026*
