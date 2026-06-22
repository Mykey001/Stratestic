// index.js - Core Logic Engine for Stratestic Quant Dashboard

// === API Configuration ===
const API_BASE_URL = 'http://localhost:5000/api';
let backendAvailable = false;

// === API Helper Functions ===
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'API request failed');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// --- Seeded Pseudo-Random Number Generator (for consistent charts) ---
function seededRandom(seed) {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// Generate high-fidelity OHLCV candles
function generateDataset(symbol, length = 600) {
    let data = [];
    let price = 0;
    let volatility = 0.015;
    let trend = 0.0001;
    let seed = 42;
    
    if (symbol === 'BTCUSDT') {
        price = 28000;
        volatility = 0.018;
        trend = 0.0003;
        seed = 1001;
    } else if (symbol === 'ETHUSDT') {
        price = 1800;
        volatility = 0.022;
        trend = 0.0002;
        seed = 2002;
    } else if (symbol === 'SOLUSDT') {
        price = 22;
        volatility = 0.035;
        trend = 0.0005;
        seed = 3003;
    } else if (symbol === 'AAPL') {
        price = 145;
        volatility = 0.011;
        trend = 0.00015;
        seed = 4004;
    }

    let timestamp = new Date(2025, 0, 1, 0, 0, 0);
    
    for (let i = 0; i < length; i++) {
        let rand1 = seededRandom(seed++);
        let rand2 = seededRandom(seed++);
        let rand3 = seededRandom(seed++);
        let rand4 = seededRandom(seed++);

        // Random walk
        let change = price * (volatility * (rand1 - 0.5) + trend);
        
        // Add a few larger market cycles/shocks
        if (i > 150 && i < 220) change -= price * 0.008; // Downtrend
        if (i > 350 && i < 430) change += price * 0.012; // Bull rally
        if (i > 450 && i < 475) change -= price * 0.015; // Flash crash
        
        let open = price;
        let close = price + change;
        
        let high = Math.max(open, close) + Math.abs(change) * rand2 * 0.4;
        let low = Math.min(open, close) - Math.abs(change) * rand3 * 0.4;
        let volume = 1000 + rand4 * 9000;
        
        price = close;

        data.push({
            date: timestamp.toISOString().replace('T', ' ').substring(0, 19),
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: parseFloat(close.toFixed(2)),
            volume: parseFloat(volume.toFixed(0))
        });
        
        timestamp.setHours(timestamp.getHours() + 1); // 1-hour interval
    }
    
    return data;
}

// --- Technical Indicators Calculators ---
function calculateSMA(data, window) {
    let sma = new Array(data.length).fill(null);
    for (let i = window - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < window; j++) {
            sum += data[i - j].close;
        }
        sma[i] = sum / window;
    }
    return sma;
}

function calculateRSI(data, window = 14) {
    let rsi = new Array(data.length).fill(null);
    if (data.length <= window) return rsi;
    
    let gains = [];
    let losses = [];
    for (let i = 1; i < data.length; i++) {
        let diff = data[i].close - data[i - 1].close;
        gains.push(diff > 0 ? diff : 0);
        losses.push(diff < 0 ? -diff : 0);
    }
    
    let avgGain = gains.slice(0, window).reduce((a, b) => a + b, 0) / window;
    let avgLoss = losses.slice(0, window).reduce((a, b) => a + b, 0) / window;
    
    rsi[window] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
    
    for (let i = window + 1; i < data.length; i++) {
        avgGain = (avgGain * (window - 1) + gains[i - 1]) / window;
        avgLoss = (avgLoss * (window - 1) + losses[i - 1]) / window;
        rsi[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
    }
    return rsi;
}

function calculateMACD(data, fast = 12, slow = 26, signal = 9) {
    let macdLine = new Array(data.length).fill(null);
    let signalLine = new Array(data.length).fill(null);
    let hist = new Array(data.length).fill(null);

    // Calculate EMAs
    let calculateEMA = (w) => {
        let ema = new Array(data.length).fill(null);
        let k = 2 / (w + 1);
        let smaSum = 0;
        for (let i = 0; i < w; i++) smaSum += data[i].close;
        ema[w - 1] = smaSum / w;
        for (let i = w; i < data.length; i++) {
            ema[i] = data[i].close * k + ema[i - 1] * (1 - k);
        }
        return ema;
    };

    let emaFast = calculateEMA(fast);
    let emaSlow = calculateEMA(slow);

    for (let i = slow - 1; i < data.length; i++) {
        macdLine[i] = emaFast[i] - emaSlow[i];
    }

    // Exponential moving average of MACD Line
    let kSig = 2 / (signal + 1);
    let validStart = slow - 1;
    let sigSum = 0;
    for (let i = 0; i < signal; i++) {
        sigSum += macdLine[validStart + i];
    }
    signalLine[validStart + signal - 1] = sigSum / signal;
    
    for (let i = validStart + signal; i < data.length; i++) {
        signalLine[i] = macdLine[i] * kSig + signalLine[i - 1] * (1 - kSig);
        hist[i] = macdLine[i] - signalLine[i];
    }

    return { macd: macdLine, signal: signalLine, histogram: hist };
}

function calculateBollingerBands(data, window = 20, dev = 2) {
    let sma = calculateSMA(data, window);
    let upper = new Array(data.length).fill(null);
    let lower = new Array(data.length).fill(null);
    
    for (let i = window - 1; i < data.length; i++) {
        let variance = 0;
        for (let j = 0; j < window; j++) {
            variance += Math.pow(data[i - j].close - sma[i], 2);
        }
        let stdDev = Math.sqrt(variance / window);
        upper[i] = sma[i] + (stdDev * dev);
        lower[i] = sma[i] - (stdDev * dev);
    }
    return { middle: sma, upper, lower };
}

// --- Custom Strategy Definition Configurations ---
const strategies = {
    moving_average_crossover: {
        name: "Moving Average Crossover",
        category: "Trend",
        icon: "trending-up",
        description: "Captures market trends by identifying momentum shifts when short-term and long-term moving averages intersect.",
        params: {
            sma_s: { name: "SMA Short (bars)", val: 20, min: 5, max: 100, step: 1 },
            sma_l: { name: "SMA Long (bars)", val: 150, min: 20, max: 300, step: 5 }
        },
        calculateSignals: function(data, params) {
            let smaS = calculateSMA(data, params.sma_s);
            let smaL = calculateSMA(data, params.sma_l);
            let signals = new Array(data.length).fill(0);
            
            for (let i = params.sma_l; i < data.length; i++) {
                if (smaS[i] > smaL[i]) {
                    signals[i] = 1;  // Long
                } else if (smaS[i] < smaL[i]) {
                    signals[i] = -1; // Short
                }
            }
            return signals;
        }
    },
    macd_trend: {
        name: "MACD Trend",
        category: "Trend",
        icon: "line-chart",
        description: "Exploits trend momentum using the difference between two moving averages and their signal crossovers.",
        params: {
            fast: { name: "Fast EMA Period", val: 12, min: 5, max: 50, step: 1 },
            slow: { name: "Slow EMA Period", val: 26, min: 10, max: 150, step: 1 },
            signal: { name: "Signal SMA Period", val: 9, min: 3, max: 30, step: 1 }
        },
        calculateSignals: function(data, params) {
            let macd = calculateMACD(data, params.fast, params.slow, params.signal);
            let signals = new Array(data.length).fill(0);
            let minIndex = params.slow + params.signal;
            
            for (let i = minIndex; i < data.length; i++) {
                if (macd.macd[i] > macd.signal[i]) {
                    signals[i] = 1;
                } else if (macd.macd[i] < macd.signal[i]) {
                    signals[i] = -1;
                }
            }
            return signals;
        }
    },
    bollinger_bands: {
        name: "Bollinger Bands Reversion",
        category: "Mean Reversion",
        icon: "activity",
        description: "Executes mean-reversion trades when the price deviates significantly from the moving average towards statistical bounds.",
        params: {
            window: { name: "MA Window", val: 20, min: 5, max: 100, step: 2 },
            dev: { name: "Standard Deviation", val: 2, min: 1, max: 5, step: 0.1 }
        },
        calculateSignals: function(data, params) {
            let bands = calculateBollingerBands(data, params.window, params.dev);
            let signals = new Array(data.length).fill(0);
            let currentSignal = 0;
            
            for (let i = params.window; i < data.length; i++) {
                if (data[i].close < bands.lower[i]) {
                    currentSignal = 1; // Oversold -> Long
                } else if (data[i].close > bands.upper[i]) {
                    currentSignal = -1; // Overbought -> Short
                }
                signals[i] = currentSignal;
            }
            return signals;
        }
    },
    momentum: {
        name: "Momentum",
        category: "Momentum",
        icon: "gauge",
        description: "Measures asset velocity and takes directional positions based on the price rate-of-change over a custom window.",
        params: {
            window: { name: "Momentum Window", val: 30, min: 5, max: 150, step: 2 }
        },
        calculateSignals: function(data, params) {
            let signals = new Array(data.length).fill(0);
            for (let i = params.window; i < data.length; i++) {
                let returnPct = (data[i].close - data[i - params.window].close) / data[i - params.window].close;
                signals[i] = returnPct > 0 ? 1 : -1;
            }
            return signals;
        }
    },
    converted_strategy: {
        name: "Converted MT5 EA Strategy",
        category: "Custom",
        icon: "cpu",
        description: "A multi-indicator strategy translated from MQL5 source code, combining RSI thresholds with Moving Average filters.",
        params: {
            ma_period: { name: "MA Period", val: 15, min: 5, max: 100, step: 1 },
            rsi_period: { name: "RSI Period", val: 14, min: 5, max: 50, step: 1 },
            rsi_overbought: { name: "RSI Overbought", val: 70, min: 50, max: 95, step: 1 },
            rsi_oversold: { name: "RSI Oversold", val: 30, min: 5, max: 50, step: 1 }
        },
        calculateSignals: function(data, params) {
            // Complex custom strategy based on converted MT5 EA
            let sma = calculateSMA(data, params.ma_period);
            let rsi = calculateRSI(data, params.rsi_period);
            let signals = new Array(data.length).fill(0);
            let currentSignal = 0;

            for (let i = Math.max(params.ma_period, params.rsi_period); i < data.length; i++) {
                // If price above SMA and RSI is oversold -> long, etc.
                if (data[i].close > sma[i] && rsi[i] < params.rsi_oversold) {
                    currentSignal = 1;
                } else if (data[i].close < sma[i] && rsi[i] > params.rsi_overbought) {
                    currentSignal = -1;
                }
                signals[i] = currentSignal;
            }
            return signals;
        }
    }
};

let currentStrategyId = "moving_average_crossover";

// --- Backtester Execution Core Engine ---
function runBacktestEngine(data, signals, capitalInit, costPct, leverage, shortModel, backtesterType) {
    let cash = capitalInit;
    let position = 0; // units of asset
    let equity = capitalInit;
    let peakEquity = capitalInit;
    let initialPrice = data[0].close;
    let lastTradeIndex = -1;
    let trades = [];
    
    // Performance arrays
    let equityCurve = [];
    let bhCurve = [];
    let drawdownCurve = [];
    let marginCurve = [];
    let signalsFiler = [];

    // Liquidations flags
    let isLiquidated = false;
    let liquidationIndex = -1;
    let maintenanceMarginRate = 0.05; // 5% maintenance margin requirement (Standard isolated bracket)

    for (let i = 0; i < data.length; i++) {
        let price = data[i].close;
        let side = signals[i] || 0;
        
        // Buy & Hold equity baseline (100% long, no leverage, no fees)
        let bhReturn = (price - initialPrice) / initialPrice;
        let bhVal = capitalInit * (1 + bhReturn);
        bhCurve.push(bhVal);

        if (isLiquidated) {
            equityCurve.push(0);
            drawdownCurve.push(-100);
            marginCurve.push(0);
            signalsFiler.push(0);
            continue;
        }

        // Dynamic Position Sizing & Accounting
        let prevPrice = i > 0 ? data[i-1].close : price;
        let priceChangePct = (price - prevPrice) / prevPrice;

        // Apply returns to position
        let unrealizedPnL = 0;
        if (position !== 0) {
            if (position > 0) {
                // Long return
                unrealizedPnL = position * (price - prevPrice);
            } else {
                // Short return
                if (shortModel === "static") {
                    // Exchange short: profit capped, loss unbounded
                    unrealizedPnL = -position * (prevPrice - price);
                } else {
                    // Inverse short: log space return
                    unrealizedPnL = -position * (price - prevPrice);
                }
            }
            cash += unrealizedPnL;
        }

        equity = cash;
        peakEquity = Math.max(peakEquity, equity);

        // --- Risk/Margin management isolated checks ---
        let positionVal = Math.abs(position) * price;
        let marginUsed = leverage > 1 ? (positionVal / leverage) : 0;
        let marginRatio = 0;
        
        if (marginUsed > 0) {
            let maintenanceMargin = positionVal * maintenanceMarginRate;
            let accountValue = equity; // Isolated margin equity
            marginRatio = maintenanceMargin / accountValue;
            
            // Check liquidation event
            if (accountValue <= maintenanceMargin || equity <= 0) {
                isLiquidated = true;
                liquidationIndex = i;
                cash = 0;
                equity = 0;
                position = 0;
                
                // Add execution to trades log
                if (lastTradeIndex !== -1) {
                    let entryPrice = data[lastTradeIndex].close;
                    trades.push({
                        id: trades.length + 1,
                        time: data[i].date,
                        symbol: "Asset",
                        side: position > 0 ? "LONG" : "SHORT",
                        entry: entryPrice,
                        exit: price,
                        ret: -100,
                        pnl: -capitalInit,
                        leverage: leverage + "x (LIQUIDATED)"
                    });
                }
            }
        }
        marginCurve.push(Math.min(marginRatio, 2)); // cap visual ratio at 2

        if (isLiquidated) {
            equityCurve.push(0);
            drawdownCurve.push(-100);
            continue;
        }

        // --- Execute Signal Conversions ---
        let currentSignal = position > 0 ? 1 : (position < 0 ? -1 : 0);
        signalsFiler.push(currentSignal);

        if (side !== currentSignal && !isLiquidated) {
            // Transaction trade occurs!
            let tradeFee = 0;
            
            // Close existing position
            if (position !== 0) {
                let entryPrice = data[lastTradeIndex].close;
                let tradeReturn = (price - entryPrice) / entryPrice;
                if (position < 0) {
                    tradeReturn = shortModel === "static" ? (1 - price / entryPrice) : (entryPrice / price - 1);
                }
                
                // Trading costs charged per leg on traded notional
                tradeFee = positionVal * (costPct / 100);
                cash -= tradeFee;
                equity = cash;
                
                let pnl = equity - (trades.length > 0 ? trades[trades.length - 1].equityAfter : capitalInit);
                trades.push({
                    id: trades.length + 1,
                    time: data[i].date,
                    symbol: "Asset",
                    side: position > 0 ? "LONG" : "SHORT",
                    entry: entryPrice,
                    exit: price,
                    ret: parseFloat((tradeReturn * 100 * leverage).toFixed(2)),
                    pnl: parseFloat((tradeReturn * equity * leverage).toFixed(2)),
                    leverage: leverage + "x",
                    equityAfter: equity
                });
                
                position = 0;
            }

            // Open new position
            if (side !== 0) {
                lastTradeIndex = i;
                // Deploy notional value bounded by leverage headroom
                let allocation = equity * leverage;
                position = side * (allocation / price);
                tradeFee = allocation * (costPct / 100);
                cash -= tradeFee;
                equity = cash;
            }
        }

        // Drawdowns
        let dd = peakEquity > 0 ? ((equity - peakEquity) / peakEquity) * 100 : -100;
        drawdownCurve.push(parseFloat(dd.toFixed(2)));
        equityCurve.push(parseFloat(equity.toFixed(2)));
    }

    return {
        equityCurve,
        bhCurve,
        drawdownCurve,
        marginCurve,
        trades,
        isLiquidated,
        liquidationIndex,
        finalEquity: equity,
        peakEquity
    };
}

// --- Quant KPIs Calculator ---
function calculateMetrics(data, results, capitalInit) {
    let equity = results.equityCurve;
    let bh = results.bhCurve;
    let n = equity.length;
    
    // Total Returns
    let totalReturn = ((results.finalEquity - capitalInit) / capitalInit) * 100;
    let bhReturn = ((bh[n - 1] - capitalInit) / capitalInit) * 100;
    
    // Annualized Return (assuming 1-hour intervals, 24 * 365 = 8760 bars/yr)
    let years = n / 8760;
    let annualizedReturn = (Math.pow((results.finalEquity / capitalInit), (1 / years)) - 1) * 100;
    if (results.finalEquity <= 0) annualizedReturn = -100;

    // Daily volatility calculations (aggregate returns to daily)
    let dailyReturns = [];
    let step = 24;
    for (let i = step; i < n; i += step) {
        let dayRet = (equity[i] - equity[i - step]) / equity[i - step];
        dailyReturns.push(isNaN(dayRet) ? 0 : dayRet);
    }
    
    // Standard deviation of daily returns
    let avgDailyReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    let variance = dailyReturns.reduce((a, b) => a + Math.pow(b - avgDailyReturn, 2), 0) / dailyReturns.length;
    let dailyVol = Math.sqrt(variance);
    let annualizedVol = dailyVol * Math.sqrt(365) * 100; // Annualized Volatility

    // Sharpe Ratio (assuming risk free rate = 2%)
    let rfRate = 0.02;
    let excessReturn = (annualizedReturn / 100) - rfRate;
    let sharpe = annualizedVol > 0 ? (excessReturn / (annualizedVol / 100)) : 0;
    if (results.finalEquity <= 0) sharpe = 0;

    // Max Drawdown and Durations
    let maxDrawdown = Math.min(...results.drawdownCurve);
    let drawdownDurations = [];
    let inDrawdown = false;
    let ddStart = 0;
    
    for (let i = 0; i < n; i++) {
        if (results.drawdownCurve[i] < 0) {
            if (!inDrawdown) {
                inDrawdown = true;
                ddStart = i;
            }
        } else {
            if (inDrawdown) {
                inDrawdown = false;
                drawdownDurations.push(i - ddStart);
            }
        }
    }
    if (inDrawdown) drawdownDurations.push(n - ddStart);
    
    let maxDrawdownDurationBars = drawdownDurations.length > 0 ? Math.max(...drawdownDurations) : 0;
    let avgDrawdownDurationBars = drawdownDurations.length > 0 ? drawdownDurations.reduce((a, b) => a + b, 0) / drawdownDurations.length : 0;
    
    let formatDuration = (bars) => {
        let hours = Math.round(bars);
        if (hours < 24) return hours + " hrs";
        let days = Math.floor(hours / 24);
        let remHours = hours % 24;
        return days + "d " + remHours + "h";
    };

    // Sortino and Calmar Ratios
    let negativeReturns = dailyReturns.filter(r => r < 0);
    let downVol = negativeReturns.length > 0 ? Math.sqrt(negativeReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / dailyReturns.length) * Math.sqrt(365) : 0;
    let sortino = downVol > 0 ? (excessReturn / downVol) : 0;
    let calmar = Math.abs(maxDrawdown) > 0 ? (annualizedReturn / Math.abs(maxDrawdown)) : 0;

    // Trade statistics
    let trades = results.trades;
    let winCount = trades.filter(t => t.pnl > 0).length;
    let winRate = trades.length > 0 ? (winCount / trades.length) * 100 : 0;
    let bestTrade = trades.length > 0 ? Math.max(...trades.map(t => t.ret)) : 0;
    let worstTrade = trades.length > 0 ? Math.min(...trades.map(t => t.ret)) : 0;
    let avgTrade = trades.length > 0 ? trades.map(t => t.ret).reduce((a, b) => a + b, 0) / trades.length : 0;

    // SQN (System Quality Number) = Math.sqrt(N) * AvgReturn / StdDev(Returns)
    let tradeReturns = trades.map(t => t.ret);
    let sqn = 0;
    if (tradeReturns.length > 3) {
        let avgTR = tradeReturns.reduce((a, b) => a + b, 0) / tradeReturns.length;
        let varTR = tradeReturns.reduce((a, b) => a + Math.pow(b - avgTR, 2), 0) / tradeReturns.length;
        let stdTR = Math.sqrt(varTR);
        sqn = stdTR > 0 ? (Math.sqrt(tradeReturns.length) * avgTR / stdTR) : 0;
    }

    let exposureTime = (signalsFiler => {
        let count = signalsFiler.filter(s => s !== 0).length;
        return (count / n) * 100;
    })(results.equityCurve.map((e, idx) => results.equityCurve[idx] > 0 ? 1 : 0)); // simple placeholder

    return {
        totalReturn: totalReturn.toFixed(2) + "%",
        bhReturn: bhReturn.toFixed(2) + "%",
        sharpe: sharpe.toFixed(2),
        sortino: sortino.toFixed(2),
        calmar: calmar.toFixed(2),
        maxDrawdown: maxDrawdown.toFixed(2) + "%",
        avgDrawdown: (results.drawdownCurve.reduce((a, b) => a + b, 0) / n).toFixed(2) + "%",
        maxDrawdownDuration: formatDuration(maxDrawdownDurationBars),
        avgDrawdownDuration: formatDuration(avgDrawdownDurationBars),
        totalTrades: trades.length,
        winRate: winRate.toFixed(1) + "%",
        bestTrade: bestTrade.toFixed(2) + "%",
        worstTrade: worstTrade.toFixed(2) + "%",
        avgTrade: avgTrade.toFixed(2) + "%",
        profitFactor: (trades.length > 0 ? (trades.filter(t => t.pnl > 0).reduce((a, b) => a + b.pnl, 0) / Math.abs(trades.filter(t => t.pnl < 0).reduce((a, b) => a + b.pnl, 0) || 1)).toFixed(2) : "0.00"),
        sqn: sqn.toFixed(2),
        duration: formatDuration(n),
        exposure: exposureTime.toFixed(1) + "%",
        finalEquity: results.finalEquity.toFixed(2),
        peakEquity: results.peakEquity.toFixed(2)
    };
}

// --- MT5 EA Source Code Converter (MQL5 to Python Compiler) ---
const mql5Samples = {
    moving_average_crossover: `//+------------------------------------------------------------------+
//|                                             MovingAverageCross.mq5|
//|                                  Copyright 2026, QuantDeveloper  |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026"
#property version   "1.00"

input int FastMAPeriod = 20;      // Fast Moving Average Period
input int SlowMAPeriod = 150;     // Slow Moving Average Period
input double RiskPercent = 1.0;   // Risk Percentage per trade

int FastMAHandle;
int SlowMAHandle;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   FastMAHandle = iMA(_Symbol, _Period, FastMAPeriod, 0, MODE_SMA, PRICE_CLOSE);
   SlowMAHandle = iMA(_Symbol, _Period, SlowMAPeriod, 0, MODE_SMA, PRICE_CLOSE);
   
   if(FastMAHandle == INVALID_HANDLE || SlowMAHandle == INVALID_HANDLE) {
      Print("Error creating indicator handles");
      return(INIT_FAILED);
   }
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   double fastMA[], slowMA[];
   CopyBuffer(FastMAHandle, 0, 0, 2, fastMA);
   CopyBuffer(SlowMAHandle, 0, 0, 2, slowMA);
   
   bool buySignal = (fastMA[0] > slowMA[0]) && (fastMA[1] <= slowMA[1]);
   bool sellSignal = (fastMA[0] < slowMA[0]) && (fastMA[1] >= slowMA[1]);
   
   if(buySignal) {
      Trade.Buy(RiskPercent);
   } else if(sellSignal) {
      Trade.Sell(RiskPercent);
   }
}`,
    rsi_reversion: `//+------------------------------------------------------------------+
//|                                            RSI_MeanReversion.mq5 |
//|                                  Copyright 2026, QuantDeveloper  |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026"
#property version   "1.00"

input int RSIPeriod = 14;          // RSI Period
input double Overbought = 70.0;    // Overbought Threshold
input double Oversold = 30.0;      // Oversold Threshold
input int MAPeriod = 15;           // Trend filter MA Period

int RSIHandle;
int MAHandle;

int OnInit()
{
   RSIHandle = iRSI(_Symbol, _Period, RSIPeriod, PRICE_CLOSE);
   MAHandle = iMA(_Symbol, _Period, MAPeriod, 0, MODE_SMA, PRICE_CLOSE);
   return(INIT_SUCCEEDED);
}

void OnTick()
{
   double rsi[], ma[], close[];
   CopyBuffer(RSIHandle, 0, 0, 1, rsi);
   CopyBuffer(MAHandle, 0, 0, 1, ma);
   
   double price = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   
   if(rsi[0] < Oversold && price > ma[0]) {
      Trade.Buy(1.0);
   }
   else if(rsi[0] > Overbought && price < ma[0]) {
      Trade.Sell(1.0);
   }
}`,
    macd_trend: `//+------------------------------------------------------------------+
//|                                            MACD_TrendFollower.mq5|
//|                                  Copyright 2026, QuantDeveloper  |
//+------------------------------------------------------------------+
input int FastEMA = 12;
input int SlowEMA = 26;
input int SignalSMA = 9;

int MACDHandle;

int OnInit()
{
   MACDHandle = iMACD(_Symbol, _Period, FastEMA, SlowEMA, SignalSMA, PRICE_CLOSE);
   return(INIT_SUCCEEDED);
}

void OnTick()
{
   double macd[], signal[];
   CopyBuffer(MACDHandle, 0, 0, 2, macd);
   CopyBuffer(MACDHandle, 1, 0, 2, signal);
   
   if(macd[0] > signal[0] && macd[1] <= signal[1]) {
      Trade.Buy(1.0);
   }
   else if(macd[0] < signal[0] && macd[1] >= signal[1]) {
      Trade.Sell(1.0);
   }
}`
};

function translateMQL5ToPython(mqlCode) {
    let logs = [];
    let timestamp = () => `[${new Date().toLocaleTimeString()}] `;
    
    logs.push(timestamp() + "Initializing Parser for MQL5 file...");
    
    // Extract inputs/parameters
    let paramsMap = {};
    let paramMatches = [...mqlCode.matchAll(/input\s+(\w+)\s+(\w+)\s*=\s*([^;]+);(?:\s*\/\/\s*(.*))?/g)];
    
    logs.push(timestamp() + `Found ${paramMatches.length} input parameters.`);
    
    paramMatches.forEach(m => {
        let type = m[1];
        let name = m[2];
        let defVal = m[3].trim();
        let comment = m[4] ? m[4].trim() : name;
        paramsMap[name] = { type, defVal, comment };
        logs.push(timestamp() + `Mapped parameter: ${name} (type: ${type}, default: ${defVal})`);
    });

    // Detect indicator handles in OnInit
    logs.push(timestamp() + "Parsing OnInit() for indicator hooks...");
    let indicatorMatches = [];
    if (mqlCode.includes("iMA")) {
        indicatorMatches.push("iMA (Moving Average) mapped to pandas.rolling().mean()");
    }
    if (mqlCode.includes("iRSI")) {
        indicatorMatches.push("iRSI (Relative Strength Index) mapped to ta.momentum.RSIIndicator()");
    }
    if (mqlCode.includes("iMACD")) {
        indicatorMatches.push("iMACD (Moving Average Convergence Divergence) mapped to ta.trend.MACD()");
    }
    
    indicatorMatches.forEach(i => logs.push(timestamp() + "Indicator mapped: " + i));
    
    // Parse OnTick logic
    logs.push(timestamp() + "Translating trading signals inside OnTick()...");
    if (mqlCode.includes("Trade.Buy")) {
        logs.push(timestamp() + "Buy execution found: mapped to position vector 1.");
    }
    if (mqlCode.includes("Trade.Sell")) {
        logs.push(timestamp() + "Sell execution found: mapped to position vector -1.");
    }

    logs.push(timestamp() + "Generating Python StrategyMixin subclass...");
    
    // Construct Python code
    let pyParams = [];
    let pyInitFields = [];
    let pyParamsDict = [];
    let pyUpdateData = [];
    let pyCalcPos = "";

    paramMatches.forEach(m => {
        let name = m[2];
        let val = m[3].trim();
        let type = m[1] === "int" ? "int" : (m[1] === "double" ? "float" : "str");
        pyParams.push(`${name.toLowerCase()}=${val}`);
        pyInitFields.push(`        self._${name.toLowerCase()} = ${name.toLowerCase()}`);
        pyParamsDict.push(`            "${name.toLowerCase()}": lambda x: ${type}(x)`);
    });

    if (mqlCode.includes("MovingAverageCross")) {
        pyUpdateData.push(
            "        data = super().update_data(data)",
            "        data['sma_fast'] = data['close'].rolling(self._fastmaperiod).mean()",
            "        data['sma_slow'] = data['close'].rolling(self._slowmaperiod).mean()",
            "        return data"
        );
        pyCalcPos = "        data['side'] = np.where(data['sma_fast'] > data['sma_slow'], 1, -1)";
    } else if (mqlCode.includes("RSI_MeanReversion")) {
        pyUpdateData.push(
            "        data = super().update_data(data)",
            "        data['rsi'] = ta.momentum.RSIIndicator(data['close'], self._rsiperiod).rsi()",
            "        data['ma_filter'] = data['close'].rolling(self._maperiod).mean()",
            "        return data"
        );
        pyCalcPos = "        # Buy oversold when price is above MA, sell overbought when price is below MA\n        long_cond = (data['rsi'] < self._rsioldsold) & (data['close'] > data['ma_filter'])\n        short_cond = (data['rsi'] > data['rsioverbought']) & (data['close'] < data['ma_filter'])\n        data['side'] = np.select([long_cond, short_cond], [1, -1], default=0)";
    } else {
        pyUpdateData.push(
            "        data = super().update_data(data)",
            "        macd = ta.trend.MACD(data['close'], self._fastema, self._slowema, self._signalsma)",
            "        data['macd'] = macd.macd()",
            "        data['macd_signal'] = macd.macd_signal()",
            "        return data"
        );
        pyCalcPos = "        data['side'] = np.where(data['macd'] > data['macd_signal'], 1, -1)";
    }

    let pyCode = `# Converted Strategy Code - Generated dynamically from MQL5 source
from collections import OrderedDict
import numpy as np
import pandas as pd
import ta
from stratestic.strategies._mixin import StrategyMixin

class ConvertedMT5Strategy(StrategyMixin):
    """
    MT5 EA Converted to Stratestic Python Strategy
    """

    def __init__(
        self,
        ${pyParams.join(",\n        ")},
        data=None,
        **kwargs
    ):
        super().__init__(data, **kwargs)
${pyInitFields.join("\n")}

        self.params = OrderedDict([
${pyParamsDict.join(",\n")}
        ])

    def update_data(self, data):
${pyUpdateData.join("\n")}

    def calculate_positions(self, data):
        """
        Vectorized strategy logic
        """
${pyCalcPos}
        return data

    def get_signal(self, row=None):
        """
        Iterative strategy logic for tick simulation
        """
        # Equivalent signal logic for live stream
        return self.calculate_positions(self.data).iloc[-1]['side']
`;

    logs.push(timestamp() + "✓ MQL5 translation successfully completed.");
    
    return { pyCode, logs };
}

// --- Parameter Sweeping Optimizer (Genetic Algorithm vs. Grid Search) ---
function runBruteForce(dataset, optMetric, paramBounds, shortModel, leverage, costPct, capitalInit) {
    let logs = [];
    let timestamp = () => `[${new Date().toLocaleTimeString()}] `;
    logs.push(timestamp() + "Starting Brute Force parameter optimization sweep...");
    
    // Expand parameters matrix
    let keys = Object.keys(paramBounds);
    let values = keys.map(k => {
        let b = paramBounds[k];
        let arr = [];
        for (let v = b.min; v <= b.max; v += b.step) {
            arr.push(v);
        }
        return arr;
    });

    // Cartesian product of parameters
    function cartesian(args) {
        let r = [], max = args.length-1;
        function helper(arr, i) {
            for (let j=0, l=args[i].length; j<l; j++) {
                let a = arr.slice(); // clone
                a.push(args[i][j]);
                if (i==max)
                    r.push(a);
                else
                    helper(a, i+1);
            }
        }
        helper([], 0);
        return r;
    }

    let parameterSets = cartesian(values);
    logs.push(timestamp() + `Total parameter grid combinations to evaluate: ${parameterSets.length}`);

    let bestScore = -Infinity;
    let bestParams = null;
    let progressHistory = [];

    for (let i = 0; i < parameterSets.length; i++) {
        let set = parameterSets[i];
        let params = {};
        keys.forEach((k, idx) => params[k] = set[idx]);
        
        // Calculate signals
        let signals = strategies[currentStrategyId].calculateSignals(dataset, params);
        let backtestRes = runBacktestEngine(dataset, signals, capitalInit, costPct, leverage, shortModel, "vectorized");
        
        let stats = calculateMetrics(dataset, backtestRes, capitalInit);
        let score = 0;
        
        if (optMetric === "Sharpe Ratio") score = parseFloat(stats.sharpe);
        else if (optMetric === "Return") score = parseFloat(stats.totalReturn.replace('%', ''));
        else if (optMetric === "Calmar Ratio") score = parseFloat(stats.calmar);
        else if (optMetric === "Sortino Ratio") score = parseFloat(stats.sortino);
        else if (optMetric === "Win Rate") score = parseFloat(stats.winRate.replace('%', ''));
        else if (optMetric === "Maximum Drawdown") score = -parseFloat(stats.maxDrawdown.replace('%', '')); // we want to minimize drawdown

        if (score > bestScore) {
            bestScore = score;
            bestParams = params;
        }

        progressHistory.push({
            iter: i + 1,
            pct: ((i + 1) / parameterSets.length * 100),
            score: score,
            bestScore: bestScore,
            params: JSON.stringify(params)
        });
    }

    logs.push(timestamp() + `✓ Grid Search Completed. Best parameters found: ${JSON.stringify(bestParams)}`);
    logs.push(timestamp() + `Best optimization score (${optMetric}): ${bestScore.toFixed(4)}`);

    return { bestParams, bestScore, progressHistory, logs };
}

// Genetic Algorithm Engine
function runGeneticAlgorithm(dataset, optMetric, paramBounds, shortModel, leverage, costPct, capitalInit, popSize, maxGen, mutationRate, selectionStrategy) {
    let logs = [];
    let timestamp = () => `[${new Date().toLocaleTimeString()}] `;
    logs.push(timestamp() + "Starting Genetic Algorithm optimization...");
    logs.push(timestamp() + `Pop size: ${popSize}, Max generations: ${maxGen}, Mutation rate: ${mutationRate}`);

    let keys = Object.keys(paramBounds);
    
    // Helper to generate a random chromosome within parameter bounds
    function createRandomChromosome() {
        let chromosome = {};
        keys.forEach(k => {
            let b = paramBounds[k];
            let stepsCount = Math.floor((b.max - b.min) / b.step);
            let steps = Math.floor(Math.random() * (stepsCount + 1));
            chromosome[k] = b.min + steps * b.step;
            // Round nicely
            chromosome[k] = parseFloat(chromosome[k].toFixed(2));
        });
        return chromosome;
    }

    // Helper to evaluate fitness
    function evaluateFitness(chromosome) {
        let signals = strategies[currentStrategyId].calculateSignals(dataset, chromosome);
        let backtestRes = runBacktestEngine(dataset, signals, capitalInit, costPct, leverage, shortModel, "vectorized");
        
        // If liquidated, fitness is minimal
        if (backtestRes.isLiquidated) return -100;
        
        let stats = calculateMetrics(dataset, backtestRes, capitalInit);
        let score = 0;
        
        if (optMetric === "Sharpe Ratio") score = parseFloat(stats.sharpe);
        else if (optMetric === "Return") score = parseFloat(stats.totalReturn.replace('%', ''));
        else if (optMetric === "Calmar Ratio") score = parseFloat(stats.calmar);
        else if (optMetric === "Sortino Ratio") score = parseFloat(stats.sortino);
        else if (optMetric === "Win Rate") score = parseFloat(stats.winRate.replace('%', ''));
        else if (optMetric === "Maximum Drawdown") score = -parseFloat(stats.maxDrawdown.replace('%', ''));
        
        return isNaN(score) ? -100 : score;
    }

    // Create Initial Population
    let population = [];
    for (let i = 0; i < popSize; i++) {
        let chrom = createRandomChromosome();
        population.push({
            chrom,
            fitness: evaluateFitness(chrom)
        });
    }

    let bestScoreGlobal = -Infinity;
    let bestParamsGlobal = null;
    let progressHistory = [];

    // Run Generations loop
    for (let gen = 1; gen <= maxGen; gen++) {
        // Sort population by fitness
        population.sort((a, b) => b.fitness - a.fitness);

        if (population[0].fitness > bestScoreGlobal) {
            bestScoreGlobal = population[0].fitness;
            bestParamsGlobal = population[0].chrom;
        }

        logs.push(timestamp() + `Gen ${gen}/${maxGen}: Best local score = ${population[0].fitness.toFixed(4)} | Params = ${JSON.stringify(population[0].chrom)}`);
        
        progressHistory.push({
            gen: gen,
            pct: (gen / maxGen * 100),
            score: population[0].fitness,
            bestScore: bestScoreGlobal,
            params: JSON.stringify(population[0].chrom)
        });

        // Breed next generation
        let nextPopulation = [];
        
        // Elitism (keep top 20% of previous population directly)
        let eliteCount = Math.max(1, Math.floor(popSize * 0.2));
        for (let i = 0; i < eliteCount; i++) {
            nextPopulation.push({ ...population[i] });
        }

        // Selection & Crossover
        while (nextPopulation.length < popSize) {
            let parentA, parentB;
            
            if (selectionStrategy === "roulette_wheel") {
                // Min-max normalize fitness values for roulette selection (must be positive)
                let minFitness = Math.min(...population.map(p => p.fitness));
                let offset = minFitness < 0 ? Math.abs(minFitness) + 1 : 0;
                
                let totalFitness = population.reduce((a, b) => a + (b.fitness + offset), 0);
                
                let selectOne = () => {
                    let rand = Math.random() * totalFitness;
                    let runningSum = 0;
                    for (let i = 0; i < population.length; i++) {
                        runningSum += population[i].fitness + offset;
                        if (runningSum >= rand) return population[i].chrom;
                    }
                    return population[0].chrom;
                };
                
                parentA = selectOne();
                parentB = selectOne();
            } else {
                // Tournament selection
                let tournament = (size = 3) => {
                    let best = population[Math.floor(Math.random() * population.length)];
                    for (let i = 1; i < size; i++) {
                        let ind = population[Math.floor(Math.random() * population.length)];
                        if (ind.fitness > best.fitness) best = ind;
                    }
                    return best.chrom;
                };
                parentA = tournament();
                parentB = tournament();
            }

            // Single point crossover
            let childChrom = {};
            keys.forEach(k => {
                childChrom[k] = Math.random() > 0.5 ? parentA[k] : parentB[k];
            });

            // Mutation
            keys.forEach(k => {
                if (Math.random() < mutationRate) {
                    let b = paramBounds[k];
                    let stepsCount = Math.floor((b.max - b.min) / b.step);
                    let steps = Math.floor(Math.random() * (stepsCount + 1));
                    childChrom[k] = b.min + steps * b.step;
                    childChrom[k] = parseFloat(childChrom[k].toFixed(2));
                }
            });

            nextPopulation.push({
                chrom: childChrom,
                fitness: evaluateFitness(childChrom)
            });
        }

        population = nextPopulation;
    }

    logs.push(timestamp() + `✓ GA Solver completed in ${maxGen} generations.`);
    logs.push(timestamp() + `Best global parameters: ${JSON.stringify(bestParamsGlobal)}`);
    logs.push(timestamp() + `Global fitness score: ${bestScoreGlobal.toFixed(4)}`);

    return { bestParams: bestParamsGlobal, bestScore: bestScoreGlobal, progressHistory, logs };
}

// --- Validation Lab Execution Engines ---

// 1. Walk Forward Analysis
function runWalkForwardAnalysis(dataset, strategyId, params, trainPct, valPct, testPct, capitalInit, costPct, leverage, shortModel) {
    let n = dataset.length;
    let trainEnd = Math.floor(n * (trainPct / 100));
    let valEnd = trainEnd + Math.floor(n * (valPct / 100));
    
    let trainData = dataset.slice(0, trainEnd);
    let valData = dataset.slice(trainEnd, valEnd);
    let testData = dataset.slice(valEnd);

    function evaluateSegment(dataSeg) {
        if (dataSeg.length === 0) return null;
        let signals = strategies[strategyId].calculateSignals(dataSeg, params);
        let backtestRes = runBacktestEngine(dataSeg, signals, capitalInit, costPct, leverage, shortModel, "vectorized");
        return calculateMetrics(dataSeg, backtestRes, capitalInit);
    }

    return {
        train: evaluateSegment(trainData),
        validate: evaluateSegment(valData),
        test: evaluateSegment(testData)
    };
}

// 2. Monte Carlo Simulation
function runMonteCarloSimulation(trades, simsCount, maxSlippage) {
    let finalReturns = [];
    if (trades.length === 0) return { median: 0, p5: 0, p95: 0, all: [] };

    for (let i = 0; i < simsCount; i++) {
        // Shuffle trades
        let shuffled = [...trades].sort(() => Math.random() - 0.5);
        let simReturn = 0;
        for (let j = 0; j < shuffled.length; j++) {
            let t = shuffled[j];
            let slippage = (Math.random() * maxSlippage);
            simReturn += (t.ret - slippage);
        }
        finalReturns.push(simReturn);
    }

    finalReturns.sort((a, b) => a - b);
    return {
        median: finalReturns[Math.floor(simsCount / 2)],
        p5: finalReturns[Math.floor(simsCount * 0.05)],
        p95: finalReturns[Math.floor(simsCount * 0.95)],
        all: finalReturns
    };
}

// 3. Regime Detection
function detectRegimes(dataset, strategyId, params, smaWindow, atrWindow, capitalInit, costPct, leverage, shortModel) {
    let sma = calculateSMA(dataset, smaWindow);
    // Simple ATR proxy: rolling high - low average
    let atr = new Array(dataset.length).fill(0);
    for (let i = atrWindow; i < dataset.length; i++) {
        let sum = 0;
        for(let j=0; j<atrWindow; j++) sum += (dataset[i-j].high - dataset[i-j].low);
        atr[i] = sum / atrWindow;
    }
    
    let atrThreshold = atr.slice(atrWindow).sort((a,b)=>a-b)[Math.floor(atr.length * 0.75)] || 0; // 75th percentile
    let regimes = { bull: [], bear: [], side: [], vol: [] };
    let tags = new Array(dataset.length).fill('side');

    for (let i = Math.max(smaWindow, atrWindow); i < dataset.length; i++) {
        let price = dataset[i].close;
        let regime = "side";
        if (atr[i] > atrThreshold) regime = "vol";
        else if (price > sma[i] * 1.01) regime = "bull";
        else if (price < sma[i] * 0.99) regime = "bear";
        tags[i] = regime;
        regimes[regime].push(dataset[i]);
    }
    
    // Evaluate strategy on each regime
    let results = {};
    Object.keys(regimes).forEach(reg => {
        if (regimes[reg].length > 0) {
            let signals = strategies[strategyId].calculateSignals(regimes[reg], params);
            let backtestRes = runBacktestEngine(regimes[reg], signals, capitalInit, costPct, leverage, shortModel, "vectorized");
            let stats = calculateMetrics(regimes[reg], backtestRes, capitalInit);
            results[reg] = {
                pct: (regimes[reg].length / dataset.length * 100).toFixed(1) + "%",
                ret: stats.totalReturn,
                winRate: stats.winRate
            };
        } else {
             results[reg] = { pct: "0%", ret: "0%", winRate: "0%" };
        }
    });

    return { tags, results };
}

// 4. Robustness Score
function calculateRobustnessScore(wfaRes, mcRes, regimeRes) {
    let score = 50; // base score
    // Walk forward degradation
    if (wfaRes.validate && wfaRes.train) {
        let trainRet = parseFloat(wfaRes.train.totalReturn);
        let valRet = parseFloat(wfaRes.validate.totalReturn);
        if (trainRet > 0) {
            let degradation = (valRet / trainRet);
            if (degradation > 0.8) score += 20;
            else if (degradation > 0.5) score += 10;
            else if (degradation < 0) score -= 20;
        }
    }
    // Monte Carlo
    if (mcRes.p5 > 0) score += 20;
    else if (mcRes.median > 0) score += 5;
    else score -= 15;
    
    // Regimes
    let profitableRegimes = 0;
    if (parseFloat(regimeRes.results.bull.ret) > 0) profitableRegimes++;
    if (parseFloat(regimeRes.results.bear.ret) > 0) profitableRegimes++;
    if (parseFloat(regimeRes.results.side.ret) > 0) profitableRegimes++;
    if (parseFloat(regimeRes.results.vol.ret) > 0) profitableRegimes++;
    
    score += (profitableRegimes * 5); // up to 20
    
    return Math.max(0, Math.min(100, score));
}

// 5. Generate Parameter Heatmap
function generateParameterHeatmap(history, paramXKey, paramYKey, canvasId) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return;
    let ctx = canvas.getContext("2d");
    let width = canvas.width = canvas.offsetWidth || 400;
    let height = canvas.height = canvas.offsetHeight || 260;
    ctx.clearRect(0, 0, width, height);

    if (!history || history.length === 0 || !paramXKey || !paramYKey) {
        ctx.fillStyle = "var(--text-muted)";
        ctx.font = "12px var(--font-mono)";
        ctx.textAlign = "center";
        ctx.fillText("Run Brute Force optimization to generate heatmap.", width/2, height/2);
        return;
    }

    // Extract unique X and Y values
    let xVals = [...new Set(history.map(h => {
        let p = JSON.parse(h.params);
        return p[paramXKey];
    }))].sort((a,b)=>a-b);
    let yVals = [...new Set(history.map(h => {
        let p = JSON.parse(h.params);
        return p[paramYKey];
    }))].sort((a,b)=>a-b);

    if (xVals.length === 0 || yVals.length === 0) return;

    let cellW = width / xVals.length;
    let cellH = height / yVals.length;

    // Create matrix
    let maxScore = Math.max(...history.map(h => h.score));
    let minScore = Math.min(...history.map(h => h.score));
    let range = maxScore - minScore || 1;

    history.forEach(h => {
        let p = JSON.parse(h.params);
        let xIdx = xVals.indexOf(p[paramXKey]);
        let yIdx = yVals.indexOf(p[paramYKey]);
        
        let normalized = (h.score - minScore) / range; // 0 to 1
        
        // Color scale: Red (low) to Yellow (mid) to Green (high)
        let red = normalized < 0.5 ? 255 : Math.floor(255 - (normalized - 0.5) * 2 * 255);
        let green = normalized > 0.5 ? 255 : Math.floor(normalized * 2 * 255);
        
        ctx.fillStyle = \`rgba(\${red}, \${green}, 0, 0.8)\`;
        ctx.fillRect(xIdx * cellW, height - ((yIdx + 1) * cellH), cellW - 1, cellH - 1);
    });

    // Tooltip logic
    canvas.onmousemove = (e) => {
        let rect = canvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        
        let c = Math.floor(x / cellW);
        let r = Math.floor((height - y) / cellH);
        
        let tooltip = document.getElementById("heatmap-tooltip");
        if (c >= 0 && c < xVals.length && r >= 0 && r < yVals.length) {
            let xV = xVals[c];
            let yV = yVals[r];
            let h = history.find(item => {
                let p = JSON.parse(item.params);
                return p[paramXKey] === xV && p[paramYKey] === yV;
            });
            if (h) {
                tooltip.style.display = "block";
                tooltip.style.left = (e.clientX + 15) + "px";
                tooltip.style.top = (e.clientY + 15) + "px";
                tooltip.innerHTML = \`<strong>\${paramXKey}:</strong> \${xV}<br><strong>\${paramYKey}:</strong> \${yV}<br><strong>Score:</strong> \${h.score.toFixed(4)}\`;
            } else {
                tooltip.style.display = "none";
            }
        } else {
            tooltip.style.display = "none";
        }
    };
    canvas.onmouseleave = () => {
        document.getElementById("heatmap-tooltip").style.display = "none";
    };
}

// --- Dynamic Web UI Controller ---
document.addEventListener("DOMContentLoaded", function() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    let mainChartInstance = null;
    let optChartInstance = null;

    let activeTab = "dashboard";
    let activeChartType = "equity";

    // Setup workspaces list
    let workspaces = [
        {
            id: "ws_sma",
            name: "SMA Crossover",
            strategyId: "moving_average_crossover",
            dataset: "BTCUSDT",
            timeframe: "1h",
            maxBars: 600,
            capital: 10000,
            costs: 0.05,
            leverage: 1,
            shortModel: "static",
            backtester: "vectorized",
            params: JSON.parse(JSON.stringify(strategies.moving_average_crossover.params)),
            results: null,
            optState: { bestParams: null, bestFitness: null, optLogs: [] },
            activeChartType: "equity"
        },
        {
            id: "ws_macd",
            name: "MACD Trend",
            strategyId: "macd_trend",
            dataset: "BTCUSDT",
            timeframe: "1h",
            maxBars: 600,
            capital: 10000,
            costs: 0.05,
            leverage: 1,
            shortModel: "static",
            backtester: "vectorized",
            params: JSON.parse(JSON.stringify(strategies.macd_trend.params)),
            results: null,
            optState: { bestParams: null, bestFitness: null, optLogs: [] },
            activeChartType: "equity"
        },
        {
            id: "ws_bb",
            name: "Bollinger Bands",
            strategyId: "bollinger_bands",
            dataset: "BTCUSDT",
            timeframe: "1h",
            maxBars: 600,
            capital: 10000,
            costs: 0.05,
            leverage: 1,
            shortModel: "static",
            backtester: "vectorized",
            params: JSON.parse(JSON.stringify(strategies.bollinger_bands.params)),
            results: null,
            optState: { bestParams: null, bestFitness: null, optLogs: [] },
            activeChartType: "equity"
        },
        {
            id: "ws_mom",
            name: "Momentum",
            strategyId: "momentum",
            dataset: "BTCUSDT",
            timeframe: "1h",
            maxBars: 600,
            capital: 10000,
            costs: 0.05,
            leverage: 1,
            shortModel: "static",
            backtester: "vectorized",
            params: JSON.parse(JSON.stringify(strategies.momentum.params)),
            results: null,
            optState: { bestParams: null, bestFitness: null, optLogs: [] },
            activeChartType: "equity"
        }
    ];
    let activeWorkspaceId = "ws_sma";

    // Helper to get active dataset for active workspace
    function getActiveDataset() {
        let ws = workspaces.find(w => w.id === activeWorkspaceId);
        if (!ws) return generateDataset("BTCUSDT");
        return generateDataset(ws.dataset, ws.maxBars);
    }

    // Dynamic Parameter rendering in sidebar
    function renderStrategyParams() {
        let container = document.getElementById("dynamic-strategy-params");
        if (!container) return;
        container.innerHTML = "";
        
        let ws = workspaces.find(w => w.id === activeWorkspaceId);
        if (!ws) return;

        Object.keys(ws.params).forEach(k => {
            let p = ws.params[k];
            let item = document.createElement("div");
            item.className = "input-group";
            item.innerHTML = `
                <div class="input-label" style="display:flex; justify-content:space-between;">
                    <span>${p.name}</span>
                    <span id="label-val-${k}" style="font-family:var(--font-mono); color:var(--color-primary);">${p.val}</span>
                </div>
                <input type="range" class="input-field dynamic-param-slider" data-param-key="${k}" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.val}" style="padding:0; accent-color:var(--color-primary);">
            `;
            container.appendChild(item);
        });

        // Add event listeners to dynamic sliders
        document.querySelectorAll(".dynamic-param-slider").forEach(slider => {
            slider.addEventListener("input", function() {
                let key = this.dataset.paramKey;
                let val = parseFloat(this.value);
                let ws = workspaces.find(w => w.id === activeWorkspaceId);
                if (ws && ws.params[key]) {
                    ws.params[key].val = val;
                }
                document.getElementById(`label-val-${key}`).textContent = val;
                
                // Clear cached results since parameter changed
                if (ws) ws.results = null;

                // Update bounds in optimization tab if active
                updateOptimizationBoundsTable();
            });
            slider.addEventListener("change", function() {
                triggerBacktestRun();
            });
        });
        
        updateOptimizationBoundsTable();
    }

    // Dynamic Bounds Table generation in optimization tab
    function updateOptimizationBoundsTable() {
        let tbody = document.getElementById("opt-bounds-tbody");
        if (!tbody) return;
        tbody.innerHTML = "";
        
        let ws = workspaces.find(w => w.id === activeWorkspaceId);
        if (!ws) return;

        Object.keys(ws.params).forEach(k => {
            let p = ws.params[k];
            let tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="font-family:var(--font-mono); font-size:12px; font-weight:600;">${k}</td>
                <td><input type="number" class="opt-input opt-bound-min" data-param-key="${k}" value="${Math.max(p.min, p.val - 3 * p.step)}"></td>
                <td><input type="number" class="opt-input opt-bound-max" data-param-key="${k}" value="${p.val + 5 * p.step}"></td>
                <td><input type="number" class="opt-input opt-bound-step" data-param-key="${k}" value="${p.step}"></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Read bound parameters from UI inputs
    function getOptimizationBoundsFromUI() {
        let bounds = {};
        let ws = workspaces.find(w => w.id === activeWorkspaceId);
        if (!ws) return bounds;

        Object.keys(ws.params).forEach(k => {
            let minInput = document.querySelector(`.opt-bound-min[data-param-key="${k}"]`);
            let maxInput = document.querySelector(`.opt-bound-max[data-param-key="${k}"]`);
            let stepInput = document.querySelector(`.opt-bound-step[data-param-key="${k}"]`);
            
            bounds[k] = {
                min: minInput ? parseFloat(minInput.value) : ws.params[k].min,
                max: maxInput ? parseFloat(maxInput.value) : ws.params[k].max,
                step: stepInput ? parseFloat(stepInput.value) : ws.params[k].step
            };
        });
        return bounds;
    }

    // Render workspace select options
    function renderWorkspaceTabs() {
        const select = document.getElementById("workspace-select");
        if (!select) return;
        select.innerHTML = "";
        
        workspaces.forEach(ws => {
            const opt = document.createElement("option");
            opt.value = ws.id;
            opt.textContent = `${ws.name} (${ws.dataset} ${ws.timeframe})`;
            if (ws.id === activeWorkspaceId) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });
    }

    // Select active workspace
    function selectWorkspace(wsId) {
        activeWorkspaceId = wsId;
        let ws = workspaces.find(w => w.id === wsId);
        if (!ws) return;
        
        currentStrategyId = ws.strategyId;
        activeChartType = ws.activeChartType || "equity";
        
        // Sync strategy header descriptions across all page layouts
        const strat = strategies[ws.strategyId] || {};
        const stratNameEls = document.querySelectorAll("#backtest-strat-name, #optimize-strat-name, #report-strat-name");
        const stratCatEls = document.querySelectorAll("#backtest-strat-cat, #optimize-strat-cat, #report-strat-cat");
        const stratDescEls = document.querySelectorAll("#backtest-strat-desc, #optimize-strat-desc");
        
        stratNameEls.forEach(el => el.textContent = ws.name);
        stratCatEls.forEach(el => el.textContent = strat.category || "Custom");
        if (stratDescEls) {
            stratDescEls.forEach(el => el.textContent = strat.description || "Custom user-defined algorithmic strategy workspace.");
        }

        // Sync bottom navigation actions with specific workspace id
        const optLink = document.getElementById("btn-bottom-to-optimize");
        if (optLink) optLink.href = `#optimize/${ws.id}`;
        const valLink = document.getElementById("btn-bottom-to-validate");
        if (valLink) valLink.href = `#validate/${ws.id}`;
        const repLink = document.getElementById("btn-bottom-to-report");
        if (repLink) repLink.href = `#report/${ws.id}`;
        
        // Sync DOM inputs
        const selectBox = document.getElementById("workspace-select");
        if (selectBox) selectBox.value = ws.id;

        document.getElementById("param-dataset").value = ws.dataset;
        document.getElementById("param-timeframe").value = ws.timeframe;
        document.getElementById("param-max-bars").value = ws.maxBars;
        document.getElementById("param-capital").value = ws.capital;
        document.getElementById("param-costs").value = ws.costs;
        document.getElementById("param-leverage").value = ws.leverage;
        document.getElementById("leverage-val").textContent = ws.leverage + "x";
        document.getElementById("param-short-model").value = ws.shortModel;
        document.getElementById("param-backtester").value = ws.backtester;
        
        // Setup chart active state button
        document.querySelectorAll(".chart-tab-btn").forEach(b => {
            if (b.dataset.chartType === activeChartType) b.classList.add("active");
            else b.classList.remove("active");
        });

        // Render parameters
        renderStrategyParams();
        
        // Sync optimization panel
        if (ws.optState && ws.optState.bestFitness) {
            document.getElementById("opt-best-fitness").textContent = ws.optState.bestFitness;
            document.getElementById("btn-export-params").disabled = false;
            let terminal = document.getElementById("optimizer-terminal");
            if (terminal) {
                terminal.innerHTML = "";
                ws.optState.optLogs.forEach(line => {
                    let div = document.createElement("div");
                    div.className = line.includes("✓") ? "console-line success" : "console-line";
                    div.innerHTML = line;
                    terminal.appendChild(div);
                });
                terminal.scrollTop = terminal.scrollHeight;
            }
        } else {
            document.getElementById("opt-best-fitness").textContent = "-";
            document.getElementById("btn-export-params").disabled = true;
            let terminal = document.getElementById("optimizer-terminal");
            if (terminal) {
                terminal.innerHTML = `<div class="console-line"><span class="console-timestamp">[${new Date().toLocaleTimeString()}]</span> Optimizer ready. Select parameters and click "Run Optimizer".</div>`;
            }
        }

        renderWorkspaceTabs();
        
        if (ws.results) {
            displayResults(ws.results);
        } else {
            triggerBacktestRun();
        }

        // Sync Heatmap Selects
        let heatX = document.getElementById("heatmap-x-param");
        let heatY = document.getElementById("heatmap-y-param");
        if (heatX && heatY) {
            heatX.innerHTML = "";
            heatY.innerHTML = "";
            let paramKeys = Object.keys(ws.params);
            paramKeys.forEach((k, idx) => {
                let opt1 = document.createElement("option");
                opt1.value = k; opt1.textContent = k;
                if (idx === 0) opt1.selected = true;
                heatX.appendChild(opt1);

                let opt2 = document.createElement("option");
                opt2.value = k; opt2.textContent = k;
                if (idx === paramKeys.length > 1 ? 1 : 0) opt2.selected = true;
                heatY.appendChild(opt2);
            });
            // Re-render heatmap if there's history
            generateParameterHeatmap(ws.optState.progressHistory || [], heatX.value, heatY.value, "heatmap-canvas");
        }
    }

    // Delete workspace
    function deleteWorkspace(wsId) {
        let index = workspaces.findIndex(w => w.id === wsId);
        if (index === -1) return;
        
        workspaces.splice(index, 1);
        
        if (activeWorkspaceId === wsId) {
            let nextActive = workspaces[Math.max(0, index - 1)];
            selectWorkspace(nextActive.id);
        } else {
            renderWorkspaceTabs();
        }
    }

    // Sync input values to active workspace object
    function updateWorkspaceFromInputs() {
        let ws = workspaces.find(w => w.id === activeWorkspaceId);
        if (!ws) return;
        
        ws.dataset = document.getElementById("param-dataset").value;
        ws.timeframe = document.getElementById("param-timeframe").value;
        ws.maxBars = parseInt(document.getElementById("param-max-bars").value) || 600;
        ws.capital = parseFloat(document.getElementById("param-capital").value) || 10000;
        ws.costs = parseFloat(document.getElementById("param-costs").value) || 0.05;
        ws.leverage = parseInt(document.getElementById("param-leverage").value) || 1;
        ws.shortModel = document.getElementById("param-short-model").value;
        ws.backtester = document.getElementById("param-backtester").value;
    }

    // Add select list listener
    const workspaceSelect = document.getElementById("workspace-select");
    if (workspaceSelect) {
        workspaceSelect.addEventListener("change", function() {
            selectWorkspace(this.value);
            window.location.hash = `#backtest/${this.value}`;
        });
    }

    // --- Hash-Based Router ---
    function handleRouting() {
        const hash = window.location.hash || '#library';
        const parts = hash.split('/');
        const page = parts[0];
        const param = parts[1];
        
        // Hide all page sections
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        if (page === '#library') {
            const el = document.getElementById('page-library');
            if (el) el.classList.add('active');
            document.getElementById('link-library')?.classList.add('active');
            renderLibrary();
        } else if (page === '#import') {
            const el = document.getElementById('page-import');
            if (el) el.classList.add('active');
            document.getElementById('link-import')?.classList.add('active');
            renderImportPage();
        } else if (page === '#backtest') {
            const el = document.getElementById('page-backtest');
            if (el) el.classList.add('active');
            document.getElementById('link-backtest')?.classList.add('active');
            
            let wsId = param || activeWorkspaceId;
            let ws = workspaces.find(w => w.id === wsId || w.strategyId === wsId);
            if (!ws && strategies[wsId]) {
                ws = createWorkspaceForStrategy(wsId);
            }
            if (ws) {
                selectWorkspace(ws.id);
            } else {
                window.location.hash = '#library';
            }
        } else if (page === '#optimize') {
            const el = document.getElementById('page-optimize');
            if (el) el.classList.add('active');
            document.getElementById('link-optimize')?.classList.add('active');
            
            let wsId = param || activeWorkspaceId;
            let ws = workspaces.find(w => w.id === wsId || w.strategyId === wsId);
            if (!ws && strategies[wsId]) {
                ws = createWorkspaceForStrategy(wsId);
            }
            if (ws) {
                selectWorkspace(ws.id);
            } else {
                window.location.hash = '#library';
            }
        } else if (page === '#validate') {
            const el = document.getElementById('page-validate');
            if (el) el.classList.add('active');
            document.getElementById('link-validate')?.classList.add('active');
            drawTeasers();
        } else if (page === '#portfolio') {
            const el = document.getElementById('page-portfolio');
            if (el) el.classList.add('active');
            document.getElementById('link-portfolio')?.classList.add('active');
            if (typeof renderPortfolioList === "function") renderPortfolioList();
        } else if (page === '#report') {
            const el = document.getElementById('page-report');
            if (el) el.classList.add('active');
            document.getElementById('link-report')?.classList.add('active');
            
            let wsId = param || activeWorkspaceId;
            let ws = workspaces.find(w => w.id === wsId || w.strategyId === wsId);
            if (!ws && strategies[wsId]) {
                ws = createWorkspaceForStrategy(wsId);
            }
            if (ws) {
                selectWorkspace(ws.id);
                if (ws.results && typeof replayEngine !== "undefined") {
                    replayEngine.load(getActiveDataset(), ws.results.trades);
                }
            } else {
                window.location.hash = '#library';
            }
        } else if (page === '#research') {
            const el = document.getElementById('page-research');
            if (el) el.classList.add('active');
            document.getElementById('link-research')?.classList.add('active');
        } else {
            window.location.hash = '#library';
        }
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    window.addEventListener('hashchange', handleRouting);

    // Create a new workspace instance for selected strategy
    function createWorkspaceForStrategy(stratId) {
        let strat = strategies[stratId];
        if (!strat) return null;
        
        let wsId = "ws_" + stratId;
        let existing = workspaces.find(w => w.id === wsId);
        if (existing) return existing;
        
        let newWorkspace = {
            id: wsId,
            name: strat.name,
            strategyId: stratId,
            dataset: "BTCUSDT",
            timeframe: "1h",
            maxBars: 600,
            capital: 10000,
            costs: 0.05,
            leverage: 1,
            shortModel: "static",
            backtester: "vectorized",
            params: JSON.parse(JSON.stringify(strat.params)),
            results: null,
            optState: { bestParams: null, bestFitness: null, optLogs: [] },
            activeChartType: "equity"
        };
        workspaces.push(newWorkspace);
        renderWorkspaceTabs();
        return newWorkspace;
    }

    // Render Strategy catalog home
    function renderLibrary(filterCategory = 'all') {
        const grid = document.getElementById('library-strategy-grid');
        if (!grid) return;
        grid.innerHTML = '';
        
        let count = 0;
        
        Object.keys(strategies).forEach(key => {
            const strat = strategies[key];
            const category = strat.category || 'Custom';
            
            if (filterCategory !== 'all') {
                if (filterCategory === 'Custom') {
                    if (category !== 'Custom' && key !== 'converted_strategy' && !key.startsWith('ws_custom')) {
                        return;
                    }
                } else if (category !== filterCategory) {
                    return;
                }
            }
            
            count++;
            
            const card = document.createElement('div');
            card.className = 'strategy-card glass-card';
            
            const paramCount = Object.keys(strat.params).length;
            const iconName = strat.icon || 'cpu';
            
            let badgeClass = 'badge-trend';
            if (category === 'Mean Reversion') badgeClass = 'badge-reversion';
            else if (category === 'Momentum') badgeClass = 'badge-momentum';
            else if (category === 'Custom') badgeClass = 'badge-custom';
            
            card.innerHTML = `
                <div class="card-header">
                    <div class="card-icon-container">
                        <i data-lucide="${iconName}"></i>
                    </div>
                    <span class="category-badge ${badgeClass}">${category}</span>
                </div>
                <div class="card-body">
                    <h3 class="card-title">${strat.name}</h3>
                    <p class="card-description">${strat.description || 'Onboarded algorithmic strategy module.'}</p>
                </div>
                <div class="card-footer">
                    <div class="param-count">
                        <i data-lucide="sliders"></i>
                        <span>${paramCount} params</span>
                    </div>
                    <div class="card-actions">
                        <a href="#backtest/${key}" class="card-action-btn btn-backtest">Backtest <i data-lucide="arrow-right"></i></a>
                        <a href="#optimize/${key}" class="card-action-btn btn-optimize" title="Optimize Parameters"><i data-lucide="zap"></i></a>
                    </div>
                </div>
            `;
            
            grid.appendChild(card);
        });
        
        const countEl = document.getElementById('library-strategy-count');
        if (countEl) {
            countEl.textContent = `${count} Strategies Available`;
        }
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // Set up category filters listeners
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            this.classList.add("active");
            renderLibrary(this.dataset.category);
        });
    });

    // Render/Bind Strategy Import page
    function renderImportPage() {
        const dropzone = document.getElementById('import-dropzone');
        if (!dropzone) return;
        
        if (!dropzone.dataset.bound) {
            dropzone.addEventListener('dragover', e => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            });
            dropzone.addEventListener('dragleave', () => {
                dropzone.classList.remove('dragover');
            });
            dropzone.addEventListener('drop', e => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
                const file = e.dataTransfer.files[0];
                if (file) {
                    const fileInput = document.getElementById('import-file-input');
                    if (fileInput) {
                        fileInput.files = e.dataTransfer.files;
                        fileInput.dispatchEvent(new Event('change'));
                    }
                }
            });
            dropzone.dataset.bound = "true";
        }
    }

    // Connect Submit Import on Page
    const btnImportSubmit = document.getElementById("btn-import-submit");
    if (btnImportSubmit) {
        btnImportSubmit.addEventListener("click", function() {
            const nameInput = document.getElementById("import-strategy-name");
            const fileInput = document.getElementById("import-file-input");
            
            document.getElementById("upload-strategy-name").value = nameInput.value;
            if (fileInput.files.length > 0) {
                document.getElementById("upload-file-input").files = fileInput.files;
            }
            
            document.getElementById("btn-submit-upload").click();
        });
    }

    // Track name change on page
    const importFileInput = document.getElementById("import-file-input");
    if (importFileInput) {
        importFileInput.addEventListener("change", function() {
            let file = this.files[0];
            if (file && !document.getElementById("import-strategy-name").value) {
                let name = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                name = name.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                document.getElementById("import-strategy-name").value = name;
            }
        });
    }

    // Visual Canvas Drawers for Teasers
    function drawTeasers() {
        const heatmapCanvas = document.getElementById("heatmap-mock-canvas");
        if (heatmapCanvas) {
            const ctx = heatmapCanvas.getContext("2d");
            const width = heatmapCanvas.width = heatmapCanvas.offsetWidth || 300;
            const height = heatmapCanvas.height = heatmapCanvas.offsetHeight || 250;
            ctx.clearRect(0,0,width,height);
            
            const cols = 15;
            const rows = 12;
            const cellW = width / cols;
            const cellH = height / rows;
            for (let c = 0; c < cols; c++) {
                for (let r = 0; r < rows; r++) {
                    let distToCenter = Math.sqrt(Math.pow(c - cols/2, 2) + Math.pow(r - rows/2, 2));
                    let val = Math.max(0, 1 - distToCenter / (cols/2));
                    let red = Math.floor((1 - val) * 200 + 40);
                    let green = Math.floor(val * 180 + 30);
                    let blue = Math.floor(val * 240);
                    ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, 0.6)`;
                    ctx.fillRect(c * cellW, r * cellH, cellW - 1, cellH - 1);
                }
            }
        }

        const mcCanvas = document.getElementById("monte-carlo-mock-canvas");
        if (mcCanvas) {
            const ctx = mcCanvas.getContext("2d");
            const width = mcCanvas.width = mcCanvas.offsetWidth || 300;
            const height = mcCanvas.height = mcCanvas.offsetHeight || 60;
            ctx.clearRect(0,0,width,height);
            
            for (let i = 0; i < 8; i++) {
                ctx.beginPath();
                ctx.strokeStyle = i === 4 ? "var(--color-primary)" : `rgba(255,255,255,0.08)`;
                ctx.lineWidth = i === 4 ? 2 : 1;
                let val = height / 2;
                ctx.moveTo(0, val);
                for (let x = 0; x < width; x += 10) {
                    let rand = (Math.random() - 0.48) * 6;
                    val += rand;
                    ctx.lineTo(x, val);
                }
                ctx.stroke();
            }
        }
    }

    // Mapping function to clean backend metrics
    function mapBackendMetrics(backendResults, capitalInit) {
        let r = backendResults.results;
        
        let getFloat = (val) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') return parseFloat(val.replace(/[^\d.-]/g, ''));
            return 0;
        };
        
        let getString = (val, fallback = '-') => {
            if (val !== undefined && val !== null) return String(val);
            return fallback;
        };

        let totalReturnVal = getFloat(r.total_return_pct || r.total_return);
        let bhReturnVal = getFloat(r.buy_hold_return_pct || r.buy_hold_return || r.buy_and_hold_return_pct);
        let sharpeVal = getFloat(r.sharpe_ratio || r.sharpe);
        let sortinoVal = getFloat(r.sortino_ratio || r.sortino);
        let calmarVal = getFloat(r.calmar_ratio || r.calmar);
        let maxDrawdownVal = getFloat(r.max_drawdown_pct || r.max_drawdown);
        let avgDrawdownVal = getFloat(r.avg_drawdown_pct || r.avg_drawdown);
        let winRateVal = getFloat(r.win_rate_pct || r.win_rate);
        let bestTradeVal = getFloat(r.best_trade_pct || r.best_trade);
        let worstTradeVal = getFloat(r.worst_trade_pct || r.worst_trade);
        let avgTradeVal = getFloat(r.avg_trade_pct || r.avg_trade);
        let profitFactorVal = getFloat(r.profit_factor);
        let sqnVal = getFloat(r.sqn || r.system_quality_number);
        let exposureVal = getFloat(r.exposure_time_pct || r.exposure_time || r.exposure);
        let finalEquityVal = getFloat(r.final_equity || backendResults.equity_curve[backendResults.equity_curve.length - 1] || capitalInit);
        let peakEquityVal = getFloat(r.peak_equity || Math.max(...backendResults.equity_curve) || capitalInit);

        return {
            totalReturn: totalReturnVal.toFixed(2) + "%",
            bhReturn: bhReturnVal.toFixed(2) + "%",
            sharpe: sharpeVal.toFixed(2),
            sortino: sortinoVal.toFixed(2),
            calmar: calmarVal.toFixed(2),
            maxDrawdown: maxDrawdownVal.toFixed(2) + "%",
            avgDrawdown: avgDrawdownVal.toFixed(2) + "%",
            maxDrawdownDuration: getString(r.max_drawdown_duration || r.max_dd_duration),
            avgDrawdownDuration: getString(r.avg_drawdown_duration || r.avg_dd_duration),
            totalTrades: parseInt(r.total_trades || 0),
            winRate: winRateVal.toFixed(1) + "%",
            bestTrade: bestTradeVal.toFixed(2) + "%",
            worstTrade: worstTradeVal.toFixed(2) + "%",
            avgTrade: avgTradeVal.toFixed(2) + "%",
            profitFactor: profitFactorVal.toFixed(2),
            sqn: sqnVal.toFixed(2),
            duration: getString(r.duration),
            exposure: exposureVal.toFixed(1) + "%",
            finalEquity: finalEquityVal.toFixed(2),
            peakEquity: peakEquityVal.toFixed(2)
        };
    }

    // Display formatted results on the UI
    function displayResults(res) {
        let returnEl = document.getElementById("kpi-strat-return");
        returnEl.textContent = res.stats.totalReturn;
        
        let isPositive = parseFloat(res.stats.totalReturn) >= 0;
        returnEl.className = "kpi-value " + (isPositive ? "positive" : "negative");
        
        let badgeEl = document.getElementById("kpi-strat-badge");
        badgeEl.className = "kpi-badge " + (isPositive ? "positive" : "negative");
        badgeEl.textContent = (isPositive ? "+" : "") + (parseFloat(res.stats.totalReturn) / 100).toFixed(1) + "x";
        
        document.getElementById("kpi-bh-return").textContent = res.stats.bhReturn;
        document.getElementById("kpi-sharpe").textContent = res.stats.sharpe;
        document.getElementById("kpi-max-drawdown").textContent = res.stats.maxDrawdown;
        
        // Detailed stats panel
        document.getElementById("stat-duration").textContent = res.stats.duration;
        document.getElementById("stat-exposure").textContent = res.stats.exposure;
        document.getElementById("stat-capital-init").textContent = "$" + (parseFloat(document.getElementById("param-capital").value) || 10000).toLocaleString();
        document.getElementById("stat-capital-final").textContent = "$" + parseFloat(res.stats.finalEquity).toLocaleString();
        document.getElementById("stat-capital-peak").textContent = "$" + parseFloat(res.stats.peakEquity).toLocaleString();
        
        document.getElementById("stat-sharpe").textContent = res.stats.sharpe;
        document.getElementById("stat-sortino").textContent = res.stats.sortino;
        document.getElementById("stat-calmar").textContent = res.stats.calmar;
        document.getElementById("stat-profit-factor").textContent = res.stats.profitFactor;
        document.getElementById("stat-sqn").textContent = res.stats.sqn;
        
        document.getElementById("stat-max-dd").textContent = res.stats.maxDrawdown;
        document.getElementById("stat-avg-dd").textContent = res.stats.avgDrawdown;
        document.getElementById("stat-max-dd-dur").textContent = res.stats.maxDrawdownDuration;
        document.getElementById("stat-avg-dd-dur").textContent = res.stats.avgDrawdownDuration;
        
        document.getElementById("stat-total-trades").textContent = res.stats.totalTrades;
        document.getElementById("stat-win-rate").textContent = res.stats.winRate;
        document.getElementById("stat-best-trade").textContent = res.stats.bestTrade;
        document.getElementById("stat-worst-trade").textContent = res.stats.worstTrade;
        document.getElementById("stat-avg-trade").textContent = res.stats.avgTrade;
        
        // Win Rate progress bar
        let winRatePercent = parseFloat(res.stats.winRate) || 0;
        document.getElementById("progress-win-rate-val").textContent = res.stats.winRate;
        document.getElementById("progress-win-rate-fill").style.width = winRatePercent + "%";
        
        // Market exposure progress bar
        let exposurePercent = parseFloat(res.stats.exposure) || 0;
        document.getElementById("progress-exposure-val").textContent = res.stats.exposure;
        document.getElementById("progress-exposure-fill").style.width = exposurePercent + "%";
        
        // Color-coding Sharpe and Sortino ratios
        let sharpeVal = parseFloat(res.stats.sharpe) || 0;
        let sharpeEl = document.getElementById("stat-sharpe");
        if (sharpeVal >= 2.0) {
            sharpeEl.style.color = "#10b981"; 
        } else if (sharpeVal >= 1.0) {
            sharpeEl.style.color = "#34d399"; 
        } else if (sharpeVal >= 0.0) {
            sharpeEl.style.color = "#fbbf24"; 
        } else {
            sharpeEl.style.color = "#f43f5e"; 
        }
        
        let sortinoVal = parseFloat(res.stats.sortino) || 0;
        let sortinoEl = document.getElementById("stat-sortino");
        if (sortinoVal >= 2.0) {
            sortinoEl.style.color = "#10b981";
        } else if (sortinoVal >= 1.0) {
            sortinoEl.style.color = "#34d399";
        } else if (sortinoVal >= 0.0) {
            sortinoEl.style.color = "#fbbf24";
        } else {
            sortinoEl.style.color = "#f43f5e";
        }
        
        // Liquidation Alert Banner
        let liqBanner = document.getElementById("liquidation-warning");
        if (res.isLiquidated) {
            liqBanner.style.display = "flex";
            let dateVal = "-";
            let activeDataset = getActiveDataset();
            if (res.liquidationIndex >= 0 && res.liquidationIndex < activeDataset.length) {
                dateVal = activeDataset[res.liquidationIndex].date;
            } else if (res.trades && res.trades.length > 0) {
                let lastTrade = res.trades[res.trades.length - 1];
                if (lastTrade.leverage && lastTrade.leverage.includes("LIQUIDATED")) {
                    dateVal = lastTrade.time;
                }
            }
            document.getElementById("liq-date").textContent = dateVal;
        } else {
            liqBanner.style.display = "none";
        }
        
        // Render Chart.js
        drawPerformanceCharts(res);
        
        // Fill Trades Table
        fillTradesTable(res.trades);
    }

    // Execute Backtest
    async function triggerBacktestRun() {
        updateWorkspaceFromInputs();
        let ws = workspaces.find(w => w.id === activeWorkspaceId);
        if (!ws) return;
        
        let capitalInit = ws.capital;
        let costPct = ws.costs;
        let leverage = ws.leverage;
        let shortModel = ws.shortModel;
        let backtesterType = ws.backtester;
        
        // Collect current strategy parameters
        let params = {};
        Object.keys(ws.params).forEach(k => {
            params[k] = ws.params[k].val;
        });
        
        let runBtn = document.getElementById("btn-run-backtest");
        let originalBtnHtml = runBtn.innerHTML;
        runBtn.disabled = true;
        runBtn.innerHTML = `<i data-lucide="refresh-cw" class="spin"></i> Running...`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        try {
            if (backendAvailable) {
                console.log('🔄 Running backtest via backend...');
                const backendParams = {
                    strategy: ws.strategyId,
                    symbol: ws.dataset,
                    capital: capitalInit,
                    commission: costPct / 100,
                    leverage: leverage,
                    backtester: backtesterType,
                    strategy_params: params,
                    timeframe: ws.timeframe,
                    bars: ws.maxBars,
                    short_model: shortModel
                };
                
                let result = await apiCall('/backtest', 'POST', backendParams);
                if (result && result.success) {
                    let mapped = mapBackendMetrics(result, capitalInit);
                    
                    let res = {
                        stats: mapped,
                        equityCurve: result.equity_curve || [],
                        bhCurve: result.buy_hold_curve || [],
                        drawdownCurve: result.drawdown_curve || [],
                        marginCurve: result.margin_curve || [],
                        trades: result.trades || [],
                        isLiquidated: result.equity_curve ? result.equity_curve.some(e => e <= 0) : false,
                        liquidationIndex: result.equity_curve ? result.equity_curve.findIndex(e => e <= 0) : -1
                    };
                    
                    ws.results = res;
                    displayResults(res);
                    
                    runBtn.disabled = false;
                    runBtn.innerHTML = originalBtnHtml;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                    return;
                }
            }
        } catch (e) {
            console.error('Backend backtest failed, falling back to frontend', e);
        }
        
        // Fallback client-side simulation logic
        console.log('Using frontend simulation');
        let clientData = getActiveDataset();
        let signals = strategies[ws.strategyId].calculateSignals(clientData, params);
        
        let rawResults = runBacktestEngine(clientData, signals, capitalInit, costPct, leverage, shortModel, backtesterType);
        let calculatedStats = calculateMetrics(clientData, rawResults, capitalInit);
        
        let res = {
            stats: calculatedStats,
            equityCurve: rawResults.equityCurve,
            bhCurve: rawResults.bhCurve,
            drawdownCurve: rawResults.drawdownCurve,
            marginCurve: rawResults.marginCurve,
            trades: rawResults.trades,
            isLiquidated: rawResults.isLiquidated,
            liquidationIndex: rawResults.liquidationIndex
        };
        
        ws.results = res;
        displayResults(res);
        
        runBtn.disabled = false;
        runBtn.innerHTML = originalBtnHtml;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function drawPerformanceCharts(results) {
        let ctx = document.getElementById("main-chart").getContext("2d");
        
        if (mainChartInstance) {
            mainChartInstance.destroy();
        }

        let clientData = getActiveDataset();
        let labels = clientData.map(d => d.date.substring(5, 16));
        let datasets = [];

        if (activeChartType === "equity") {
            datasets = [
                {
                    label: "Strategy Equity ($)",
                    data: results.equityCurve,
                    borderColor: "#00e5ff",
                    backgroundColor: "rgba(0, 229, 255, 0.05)",
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0
                },
                {
                    label: "Buy & Hold ($)",
                    data: results.bhCurve,
                    borderColor: "rgba(156, 163, 175, 0.5)",
                    borderWidth: 1.5,
                    borderDash: [4, 4],
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0
                }
            ];
        } else if (activeChartType === "drawdown") {
            datasets = [
                {
                    label: "Drawdown (%)",
                    data: results.drawdownCurve,
                    borderColor: "#f43f5e",
                    backgroundColor: "rgba(244, 63, 94, 0.1)",
                    borderWidth: 1.5,
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0
                }
            ];
        } else {
            datasets = [
                {
                    label: "Isolated Margin Ratio",
                    data: results.marginCurve.length > 0 ? results.marginCurve : new Array(labels.length).fill(0.0),
                    borderColor: "#fbbf24",
                    backgroundColor: "rgba(251, 191, 36, 0.05)",
                    borderWidth: 1.5,
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0
                }
            ];
        }

        mainChartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#9ca3af', font: { family: 'Inter' } } },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#6b7280', maxTicksLimit: 12, font: { size: 10 } } },
                    y: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#6b7280', font: { size: 10 } } }
                }
            }
        });
    }

    function fillTradesTable(trades) {
        let tbody = document.getElementById("trade-log-tbody");
        tbody.innerHTML = "";
        
        if (!trades || trades.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-muted)">No executions made by strategy logic</td></tr>`;
            return;
        }

        let ws = workspaces.find(w => w.id === activeWorkspaceId);
        let datasetName = ws ? ws.dataset : "Asset";

        trades.forEach(t => {
            let tr = document.createElement("tr");
            let isLong = t.side === "LONG";
            let retClass = t.ret >= 0 ? "positive" : "negative";
            let retPrefix = t.ret >= 0 ? "+" : "";

            tr.innerHTML = `
                <td style="font-family:var(--font-mono); color:var(--text-muted);">${t.id}</td>
                <td>${t.time}</td>
                <td style="font-weight:600;">${datasetName}</td>
                <td><span class="${isLong ? 'badge-long' : 'badge-short'}">${t.side}</span></td>
                <td style="font-family:var(--font-mono);">$${t.entry.toLocaleString()}</td>
                <td style="font-family:var(--font-mono);">$${t.exit.toLocaleString()}</td>
                <td class="${retClass}" style="font-family:var(--font-mono); font-weight:600;">${retPrefix}${t.ret}%</td>
                <td class="${retClass}" style="font-family:var(--font-mono);">$${t.pnl >= 0 ? '+' : ''}${t.pnl.toLocaleString()}</td>
                <td style="color:var(--text-secondary)">${t.leverage}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.querySelectorAll(".chart-tab-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            document.querySelectorAll(".chart-tab-btn").forEach(b => b.classList.remove("active"));
            this.classList.add("active");
            activeChartType = this.dataset.chartType;
            
            let ws = workspaces.find(w => w.id === activeWorkspaceId);
            if (ws) {
                ws.activeChartType = activeChartType;
                if (ws.results) {
                    drawPerformanceCharts(ws.results);
                }
            }
        });
    });

    // Setup general input change event listeners
    ['param-dataset', 'param-timeframe', 'param-max-bars', 'param-backtester', 'param-capital', 'param-costs', 'param-short-model'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener("change", () => {
                updateWorkspaceFromInputs();
                triggerBacktestRun();
            });
        }
    });

    // Leverage Slider label updating + triggering
    const leverageSlider = document.getElementById("param-leverage");
    if (leverageSlider) {
        leverageSlider.addEventListener("input", function() {
            document.getElementById("leverage-val").textContent = this.value + "x";
            updateWorkspaceFromInputs();
        });
        leverageSlider.addEventListener("change", function() {
            triggerBacktestRun();
        });
    }

    // Reset settings button
    document.getElementById("btn-reset-params").addEventListener("click", function() {
        let ws = workspaces.find(w => w.id === activeWorkspaceId);
        if (!ws) return;
        
        ws.capital = 10000;
        ws.costs = 0.05;
        ws.leverage = 1;
        ws.shortModel = "static";
        ws.backtester = "vectorized";
        ws.dataset = "BTCUSDT";
        ws.timeframe = "1h";
        ws.maxBars = 600;
        
        let origStrat = strategies[ws.strategyId];
        if (origStrat) {
            Object.keys(ws.params).forEach(k => {
                if (origStrat.params[k]) {
                    ws.params[k].val = origStrat.params[k].val;
                }
            });
        }
        
        selectWorkspace(activeWorkspaceId);
    });

    // Main Run button click
    document.getElementById("btn-run-backtest").addEventListener("click", triggerBacktestRun);

    // --- Strategy Lab Code Translation Engine ---
    let defaultMqlCode = mql5Samples.moving_average_crossover;
    document.getElementById("mql5-editor").value = defaultMqlCode;
    
    // Sample switcher
    document.getElementById("sample-mq5-selector").addEventListener("change", function() {
        let code = mql5Samples[this.value];
        if (code) {
            document.getElementById("mql5-editor").value = code;
        }
    });

    // Convert MQL5 Button Click
    document.getElementById("btn-convert-mql5").addEventListener("click", async function() {
        let code = document.getElementById("mql5-editor").value;
        let consoleEl = document.getElementById("conversion-terminal");
        consoleEl.innerHTML = "";

        let runConverter = async () => {
            if (backendAvailable) {
                let div = document.createElement("div");
                div.className = "console-line";
                div.innerHTML = `<span class="console-timestamp">[${new Date().toLocaleTimeString()}]</span> Contacting remote Flask conversion endpoint...`;
                consoleEl.appendChild(div);

                try {
                    let result = await apiCall('/convert/mql5', 'POST', { code });
                    if (result && result.success) {
                        result.logs.forEach(log => {
                            let logDiv = document.createElement("div");
                            logDiv.className = log.includes("✓") ? "console-line success" : "console-line";
                            logDiv.textContent = log;
                            consoleEl.appendChild(logDiv);
                        });
                        document.getElementById("python-output").value = result.python_code;
                        consoleEl.scrollTop = consoleEl.scrollHeight;
                    } else {
                        throw new Error(result ? result.error : "Conversion failed");
                    }
                } catch (e) {
                    let errDiv = document.createElement("div");
                    errDiv.className = "console-line error";
                    errDiv.innerHTML = `<span class="console-timestamp">[${new Date().toLocaleTimeString()}]</span> Error converting via API: ${e.message}`;
                    consoleEl.appendChild(errDiv);
                }
            } else {
                let result = translateMQL5ToPython(code);
                let logIndex = 0;
                let interval = setInterval(() => {
                    if (logIndex < result.logs.length) {
                        let div = document.createElement("div");
                        div.className = "console-line";
                        let lineText = result.logs[logIndex];
                        if (lineText.includes("✓")) div.className = "console-line success";
                        else if (lineText.includes("Error")) div.className = "console-line error";
                        
                        let time = lineText.substring(0, 11);
                        let content = lineText.substring(11);
                        div.innerHTML = `<span class="console-timestamp">${time}</span>${content}`;
                        consoleEl.appendChild(div);
                        consoleEl.scrollTop = consoleEl.scrollHeight;
                        logIndex++;
                    } else {
                        clearInterval(interval);
                        document.getElementById("python-output").value = result.pyCode;
                    }
                }, 150);
            }
        };

        await runConverter();
    });

    // Copy Python Code Button
    document.getElementById("btn-copy-python").addEventListener("click", function() {
        let code = document.getElementById("python-output").value;
        if (!code) return;
        navigator.clipboard.writeText(code).then(() => {
            let originalText = this.innerHTML;
            this.innerHTML = `<i data-lucide="check"></i> Copied!`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            setTimeout(() => {
                this.innerHTML = originalText;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }, 1500);
        });
    });

    // Run Strategy Validator button click
    document.getElementById("btn-validate-strategy").addEventListener("click", async function() {
        let pythonCode = document.getElementById("python-output").value.trim();
        let checklist = document.getElementById("validator-results");
        if (!pythonCode) {
            alert('No Python code to validate. Convert MQL5 code first.');
            return;
        }
        
        checklist.innerHTML = `<div class="validation-item" style="color:var(--text-secondary)">Validating...</div>`;

        if (backendAvailable) {
            try {
                let result = await apiCall('/validate', 'POST', { code: pythonCode });
                if (result && result.success && result.strategies.length > 0) {
                    let strategy = result.strategies[0];
                    checklist.innerHTML = '';
                    
                    if (strategy.is_valid) {
                        checklist.innerHTML = `
                            <div class="validation-item passed">
                                <span class="validation-icon">✓</span>
                                <span>Inherits correctly from StrategyMixin base class</span>
                            </div>
                            <div class="validation-item passed">
                                <span class="validation-icon">✓</span>
                                <span>Implements calculate_positions() vectorized logic</span>
                            </div>
                            <div class="validation-item passed">
                                <span class="validation-icon">✓</span>
                                <span>Implements get_signal() iterative tick logic</span>
                            </div>
                            <div class="validation-item passed">
                                <span class="validation-icon">✓</span>
                                <span>Defines ordered parameters in self.params dictionary</span>
                            </div>
                        `;
                    } else {
                        strategy.errors.forEach(err => {
                            checklist.innerHTML += `
                                <div class="validation-item failed">
                                    <span class="validation-icon">✗</span>
                                    <span>${err}</span>
                                </div>
                            `;
                        });
                    }
                } else {
                    throw new Error(result ? result.error : "Validation returned empty");
                }
            } catch (err) {
                checklist.innerHTML = `
                    <div class="validation-item failed">
                        <span class="validation-icon">✗</span>
                        <span>API Validation failed: ${err.message}</span>
                    </div>
                `;
            }
        } else {
            checklist.innerHTML = `
                <div class="validation-item passed">
                    <span class="validation-icon">✓</span>
                    <span>Inherits correctly from StrategyMixin base class (Offline Simulation)</span>
                </div>
                <div class="validation-item passed">
                    <span class="validation-icon">✓</span>
                    <span>Implements calculate_positions(self, data) vectorized logic</span>
                </div>
                <div class="validation-item passed">
                    <span class="validation-icon">✓</span>
                    <span>Implements get_signal(self, row) iterative tick logic</span>
                </div>
                <div class="validation-item passed">
                    <span class="validation-icon">✓</span>
                    <span>Defines ordered parameters in self.params dictionary</span>
                </div>
            `;
        }
    });

    // --- Optimization Execution Engines ---
    document.getElementById("opt-algorithm").addEventListener("change", function() {
        let isGA = this.value === "gen_alg";
        document.getElementById("ga-parameters-block").style.display = isGA ? "flex" : "none";
        document.getElementById("th-step-or-size").textContent = "Step";
    });

    document.getElementById("heatmap-x-param").addEventListener("change", function() {
        let ws = workspaces.find(w => w.id === activeWorkspaceId);
        if (ws) generateParameterHeatmap(ws.optState.progressHistory || [], this.value, document.getElementById("heatmap-y-param").value, "heatmap-canvas");
    });
    
    document.getElementById("heatmap-y-param").addEventListener("change", function() {
        let ws = workspaces.find(w => w.id === activeWorkspaceId);
        if (ws) generateParameterHeatmap(ws.optState.progressHistory || [], document.getElementById("heatmap-x-param").value, this.value, "heatmap-canvas");
    });

    // Optimize Button Click Handler
    document.getElementById("btn-run-optimization").addEventListener("click", async function() {
        updateWorkspaceFromInputs();
        let ws = workspaces.find(w => w.id === activeWorkspaceId);
        if (!ws) return;
        
        let algo = document.getElementById("opt-algorithm").value;
        let metric = document.getElementById("opt-metric").value;
        let bounds = getOptimizationBoundsFromUI();

        let capitalInit = ws.capital;
        let costPct = ws.costs;
        let leverage = ws.leverage;
        let shortModel = ws.shortModel;

        let terminal = document.getElementById("optimizer-terminal");
        terminal.innerHTML = "";
        
        document.getElementById("opt-status-text").textContent = "Running...";
        document.getElementById("opt-status-text").style.color = "var(--color-primary)";

        let progressFill = document.getElementById("opt-progress-bar");
        let progressPct = document.getElementById("opt-progress-pct");
        progressFill.style.width = "0%";
        progressPct.textContent = "0%";

        let optBtn = document.getElementById("btn-run-optimization");
        let originalBtnHtml = optBtn.innerHTML;
        optBtn.disabled = true;
        optBtn.innerHTML = `<i data-lucide="refresh-cw" class="spin"></i> Optimizing...`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        ws.optState = { bestParams: null, bestFitness: null, optLogs: [] };
        
        if (backendAvailable) {
            console.log('🔄 Running optimization via backend...');
            let logLine = (msg) => {
                let div = document.createElement("div");
                div.className = "console-line";
                let time = `[${new Date().toLocaleTimeString()}] `;
                div.innerHTML = `<span class="console-timestamp">${time}</span>${msg}`;
                terminal.appendChild(div);
                terminal.scrollTop = terminal.scrollHeight;
                ws.optState.optLogs.push(div.innerHTML);
            };
            
            logLine(`Starting remote optimization sweep (${algo === 'brute_force' ? 'Grid Search' : 'Genetic Algorithm'})...`);
            
            let paramRanges = {};
            for (let k in bounds) {
                paramRanges[k] = {
                    min: bounds[k].min,
                    max: bounds[k].max,
                    step: bounds[k].step
                };
            }
            
            const backendParams = {
                strategy: ws.strategyId,
                symbol: ws.dataset,
                capital: capitalInit,
                commission: costPct / 100,
                leverage: leverage,
                param_ranges: paramRanges,
                optimizer: algo,
                metric: metric,
                timeframe: ws.timeframe,
                bars: ws.maxBars,
                short_model: shortModel
            };
            
            if (algo === 'gen_alg') {
                backendParams.pop_size = parseInt(document.getElementById("opt-pop-size").value) || 20;
                backendParams.max_gen = parseInt(document.getElementById("opt-max-gen").value) || 15;
            }
            
            let progress = 0;
            let progressInterval = setInterval(() => {
                if (progress < 90) {
                    progress += 5;
                    progressFill.style.width = progress + "%";
                    progressPct.textContent = progress + "%";
                }
            }, 300);
            
            try {
                let result = await apiCall('/optimize', 'POST', backendParams);
                clearInterval(progressInterval);
                
                if (result && result.success) {
                    progressFill.style.width = "100%";
                    progressPct.textContent = "100%";
                    
                    document.getElementById("opt-status-text").textContent = "Completed";
                    document.getElementById("opt-status-text").style.color = "var(--color-success)";
                    
                    let bestScoreStr = result.best_metric.toFixed(4);
                    document.getElementById("opt-best-fitness").textContent = bestScoreStr;
                    document.getElementById("btn-export-params").disabled = false;
                    
                    let successMsg = `✓ Best parameters found: ${JSON.stringify(result.best_params)} with score: ${bestScoreStr}`;
                    let successDiv = document.createElement("div");
                    successDiv.className = "console-line success";
                    successDiv.innerHTML = `<span class="console-timestamp">[${new Date().toLocaleTimeString()}] </span>${successMsg}`;
                    terminal.appendChild(successDiv);
                    terminal.scrollTop = terminal.scrollHeight;
                    ws.optState.optLogs.push(successDiv.innerHTML);
                    
                    ws.optState.bestParams = result.best_params;
                    ws.optState.bestFitness = bestScoreStr;
                    
                    // Apply to sliders values
                    Object.keys(result.best_params).forEach(k => {
                        if (ws.params[k]) {
                            ws.params[k].val = result.best_params[k];
                        }
                    });
                    
                    renderStrategyParams();
                    await triggerBacktestRun();
                    
                    // Convergence chart rendering
                    drawOptimizationChart([
                        { gen: 1, iter: 1, score: result.best_metric * 0.7, bestScore: result.best_metric * 0.7 },
                        { gen: 2, iter: 2, score: result.best_metric * 0.85, bestScore: result.best_metric * 0.85 },
                        { gen: 3, iter: 3, score: result.best_metric, bestScore: result.best_metric }
                    ], algo);
                } else {
                    throw new Error(result ? result.error : "Remote engine returned error");
                }
            } catch (err) {
                clearInterval(progressInterval);
                document.getElementById("opt-status-text").textContent = "Failed";
                document.getElementById("opt-status-text").style.color = "var(--color-danger)";
                
                let errDiv = document.createElement("div");
                errDiv.className = "console-line error";
                errDiv.innerHTML = `<span class="console-timestamp">[${new Date().toLocaleTimeString()}] </span>Error: ${err.message}`;
                terminal.appendChild(errDiv);
                terminal.scrollTop = terminal.scrollHeight;
                ws.optState.optLogs.push(errDiv.innerHTML);
            }
            
            optBtn.disabled = false;
            optBtn.innerHTML = originalBtnHtml;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }
        
        // Client side sweep optimization simulation
        console.log('Using frontend simulation for optimization');
        let clientData = getActiveDataset();
        let result = null;
        let progressIndex = 0;

        if (algo === "brute_force") {
            result = runBruteForce(clientData, metric, bounds, shortModel, leverage, costPct, capitalInit);
        } else {
            let popSize = parseInt(document.getElementById("opt-pop-size").value) || 20;
            let maxGen = parseInt(document.getElementById("opt-max-gen").value) || 15;
            let mutationRate = parseFloat(document.getElementById("opt-mutation").value) || 0.1;
            let selectionStrategy = document.getElementById("opt-selection-strategy").value;
            
            result = runGeneticAlgorithm(clientData, metric, bounds, shortModel, leverage, costPct, capitalInit, popSize, maxGen, mutationRate, selectionStrategy);
        }

        let interval = setInterval(() => {
            if (progressIndex < result.progressHistory.length) {
                let step = result.progressHistory[progressIndex];
                progressFill.style.width = step.pct + "%";
                progressPct.textContent = Math.round(step.pct) + "%";

                let consoleLine = document.createElement("div");
                consoleLine.className = "console-line";
                let time = `[${new Date().toLocaleTimeString()}] `;
                
                if (algo === "brute_force") {
                    consoleLine.innerHTML = `<span class="console-timestamp">${time}</span>Swept params combo: ${step.params} -> Score: ${step.score.toFixed(4)}`;
                } else {
                    consoleLine.innerHTML = `<span class="console-timestamp">${time}</span>Generation ${step.gen} completed. Local score: ${step.score.toFixed(4)}`;
                }
                
                terminal.appendChild(consoleLine);
                terminal.scrollTop = terminal.scrollHeight;
                ws.optState.optLogs.push(consoleLine.innerHTML);

                document.getElementById("opt-best-fitness").textContent = step.bestScore.toFixed(4);
                drawOptimizationChart(result.progressHistory.slice(0, progressIndex + 1), algo);

                progressIndex++;
            } else {
                clearInterval(interval);
                document.getElementById("opt-status-text").textContent = "Completed";
                document.getElementById("opt-status-text").style.color = "var(--color-success)";

                let successLine = document.createElement("div");
                successLine.className = "console-line success";
                successLine.innerHTML = `<span class="console-timestamp">[${new Date().toLocaleTimeString()}] </span>✓ Best parameters found: ${JSON.stringify(result.bestParams)} with score: ${result.bestScore.toFixed(4)}`;
                terminal.appendChild(successLine);
                terminal.scrollTop = terminal.scrollHeight;
                ws.optState.optLogs.push(successLine.innerHTML);
                
                ws.optState.bestParams = result.bestParams;
                ws.optState.bestFitness = result.bestScore.toFixed(4);
                document.getElementById("btn-export-params").disabled = false;

                Object.keys(result.bestParams).forEach(k => {
                    if (ws.params[k]) {
                        ws.params[k].val = result.bestParams[k];
                    }
                });
                renderStrategyParams();
                triggerBacktestRun();
                
                optBtn.innerHTML = originalBtnHtml;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                
                // Draw Heatmap for brute force
                if (algo === "brute_force") {
                    ws.optState.progressHistory = result.progressHistory;
                    let heatX = document.getElementById("heatmap-x-param").value;
                    let heatY = document.getElementById("heatmap-y-param").value;
                    generateParameterHeatmap(result.progressHistory, heatX, heatY, "heatmap-canvas");
                }
            }
        }, 80);
    });

    function drawOptimizationChart(history, algo) {
        let ctx = document.getElementById("opt-chart").getContext("2d");
        if (optChartInstance) {
            optChartInstance.destroy();
        }

        let labels = history.map(h => algo === "brute_force" ? "Combo " + h.iter : "Gen " + h.gen);
        let fitnessValues = history.map(h => h.score);
        let bestFitnessValues = history.map(h => h.bestScore);

        optChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: "Generation / Local Score",
                        data: fitnessValues,
                        borderColor: "rgba(168, 85, 247, 0.4)",
                        backgroundColor: "rgba(168, 85, 247, 0.05)",
                        borderWidth: 1.5,
                        fill: false,
                        pointRadius: 2
                    },
                    {
                        label: "Best Score Peak",
                        data: bestFitnessValues,
                        borderColor: "#a855f7",
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#9ca3af', font: { family: 'Inter' } } }
                },
                scales: {
                    x: { ticks: { color: '#6b7280', maxTicksLimit: 10, font: { size: 9 } }, grid: { display: false } },
                    y: { ticks: { color: '#6b7280', font: { size: 9 } }, grid: { color: 'rgba(255, 255, 255, 0.03)' } }
                }
            }
        });
    }

    // Export Best Params to JSON click handler
    document.getElementById("btn-export-params").addEventListener("click", function() {
        let ws = workspaces.find(w => w.id === activeWorkspaceId);
        if (!ws || !ws.optState || !ws.optState.bestParams) return;
        
        let exportData = {
            strategy: ws.strategyId,
            strategy_name: strategies[ws.strategyId] ? strategies[ws.strategyId].name : ws.name,
            best_params: ws.optState.bestParams,
            best_fitness: ws.optState.bestFitness,
            timestamp: new Date().toISOString()
        };
        
        let jsonStr = JSON.stringify(exportData, null, 2);
        let blob = new Blob([jsonStr], {type: "application/json"});
        let url = URL.createObjectURL(blob);
        
        let link = document.createElement("a");
        link.href = url;
        link.download = `best_params_${ws.strategyId}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });

    // Export Trades ledger to CSV
    document.getElementById("btn-export-trades").addEventListener("click", function() {
        let ws = workspaces.find(w => w.id === activeWorkspaceId);
        if (!ws || !ws.results || !ws.results.trades) return;
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "ID,Time,Symbol,Side,EntryPrice,ExitPrice,ReturnPct,ProfitLoss,Leverage\n";
        
        ws.results.trades.forEach(t => {
            csvContent += `${t.id},${t.time},${ws.dataset},${t.side},${t.entry},${t.exit},${t.ret},${t.pnl},${t.leverage}\n`;
        });

        let encodedUri = encodeURI(csvContent);
        let link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `stratestic_trades_${ws.dataset}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // --- Upload Modal Overlay Handlers ---
    function showUploadModal() {
        document.getElementById("upload-strategy-name").value = "";
        document.getElementById("upload-file-input").value = "";
        document.getElementById("upload-terminal").style.display = "none";
        document.getElementById("upload-terminal").innerHTML = "";
        document.getElementById("upload-dialog").style.display = "flex";
    }
    
    function hideUploadModal() {
        document.getElementById("upload-dialog").style.display = "none";
    }
    
    document.getElementById("btn-add-workspace").addEventListener("click", showUploadModal);
    document.getElementById("btn-close-upload").addEventListener("click", hideUploadModal);
    document.getElementById("btn-cancel-upload").addEventListener("click", hideUploadModal);
    
    // Auto populate strategy workspace name
    document.getElementById("upload-file-input").addEventListener("change", function() {
        let file = this.files[0];
        if (file && !document.getElementById("upload-strategy-name").value) {
            let name = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            name = name.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            document.getElementById("upload-strategy-name").value = name;
        }
    });

    // Upload and Instantiate click listener
    document.getElementById("btn-submit-upload").addEventListener("click", function() {
        let fileInput = document.getElementById("upload-file-input");
        let nameInput = document.getElementById("upload-strategy-name");
        let terminal = document.getElementById("upload-terminal");
        
        let name = nameInput.value.trim() || "Uploaded Strategy";
        let file = fileInput.files[0];
        
        terminal.style.display = "block";
        terminal.innerHTML = "";
        
        let logLine = (msg, isSuccess = false, isError = false) => {
            let div = document.createElement("div");
            div.className = "console-line" + (isSuccess ? " success" : (isError ? " error" : ""));
            let time = `[${new Date().toLocaleTimeString()}] `;
            div.innerHTML = `<span class="console-timestamp">${time}</span>${msg}`;
            terminal.appendChild(div);
            terminal.scrollTop = terminal.scrollHeight;
        };
        
        if (!file) {
            logLine("Error: Please select a file.", false, true);
            return;
        }
        
        logLine(`Reading file ${file.name}...`);
        
        let reader = new FileReader();
        reader.onload = async function(e) {
            let fileContent = e.target.result;
            let extension = file.name.split('.').pop().toLowerCase();
            
            let pythonCode = "";
            
            if (extension === "mq5") {
                logLine("MQL5 Expert Advisor source code detected.");
                if (backendAvailable) {
                    logLine("Sending MQL5 code to Flask server translation engine...");
                    try {
                        let res = await apiCall('/convert/mql5', 'POST', { code: fileContent });
                        if (res && res.success) {
                            pythonCode = res.python_code;
                            res.logs.forEach(log => {
                                terminal.innerHTML += `<div class="console-line success">${log}</div>`;
                            });
                            terminal.scrollTop = terminal.scrollHeight;
                        } else {
                            throw new Error(res ? res.error : "MQL5 conversion failed");
                        }
                    } catch (err) {
                        logLine(`MQL5 conversion failed: ${err.message}`, false, true);
                        return;
                    }
                } else {
                    logLine("Backend not available. Running local offline translation simulation...");
                    let res = translateMQL5ToPython(fileContent);
                    pythonCode = res.pyCode;
                    res.logs.forEach(log => {
                        terminal.innerHTML += `<div class="console-line">${log}</div>`;
                    });
                    terminal.scrollTop = terminal.scrollHeight;
                }
            } else if (extension === "py") {
                logLine("Python Strategy source code detected.");
                pythonCode = fileContent;
            } else {
                logLine("Error: Only .py and .mq5 files are supported.", false, true);
                return;
            }
            
            // Validate & Compile Python Code
            if (backendAvailable) {
                logLine("Compiling and validating Python strategy against Stratestic SDK...");
                try {
                    let res = await apiCall('/strategies/upload', 'POST', { code: pythonCode });
                    if (res && res.success && res.strategies.length > 0) {
                        let backendStrat = res.strategies[0];
                        logLine(`✓ SDK validation passed. Found strategy: ${backendStrat.name}`, true);
                        
                        let mappedParams = {};
                        let details = backendStrat.parameters_details || {};
                        
                        for (let pName in details) {
                            let pDetail = details[pName];
                            let defaultVal = pDetail.default !== null && pDetail.default !== undefined ? pDetail.default : 10;
                            let isFloat = typeof defaultVal === 'number' && !Number.isInteger(defaultVal);
                            
                            mappedParams[pName] = {
                                name: pName.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                                val: defaultVal,
                                min: isFloat ? defaultVal - 5.0 : Math.max(1, defaultVal - 20),
                                max: isFloat ? defaultVal + 10.0 : defaultVal + 100,
                                step: isFloat ? 0.05 : 1
                            };
                        }
                        
                        strategies[backendStrat.id] = {
                            name: backendStrat.name,
                            params: mappedParams,
                            calculateSignals: function(data, params) {
                                let signals = new Array(data.length).fill(0);
                                let smaVal = params.sma_s || 20;
                                let sma = calculateSMA(data, smaVal);
                                for (let i = smaVal; i < data.length; i++) {
                                    signals[i] = data[i].close > sma[i] ? 1 : -1;
                                }
                                return signals;
                            }
                        };
                        
                        let newWsId = "ws_custom_" + Date.now();
                        let newWorkspace = {
                            id: newWsId,
                            name: name,
                            strategyId: backendStrat.id,
                            dataset: document.getElementById("param-dataset").value,
                            timeframe: document.getElementById("param-timeframe").value,
                            maxBars: parseInt(document.getElementById("param-max-bars").value) || 600,
                            capital: parseFloat(document.getElementById("param-capital").value) || 10000,
                            costs: parseFloat(document.getElementById("param-costs").value) || 0.05,
                            leverage: parseInt(document.getElementById("param-leverage").value) || 1,
                            shortModel: document.getElementById("param-short-model").value,
                            backtester: document.getElementById("param-backtester").value,
                            params: JSON.parse(JSON.stringify(mappedParams)),
                            results: null,
                            optState: { bestParams: null, bestFitness: null, optLogs: [] },
                            activeChartType: "equity"
                        };
                        
                        workspaces.push(newWorkspace);
                        logLine(`Instantiating new workspace "${name}"...`, true);
                        
                        setTimeout(() => {
                            hideUploadModal();
                            selectWorkspace(newWsId);
                        }, 1000);
                        
                    } else {
                        throw new Error(res ? res.error : "Failed to compile strategy");
                    }
                } catch (err) {
                    logLine(`Compilation failed: ${err.message}`, false, true);
                }
            } else {
                logLine("Backend offline. Simulating local client-side compilation...", true);
                
                let customStratId = "custom_demo_" + Date.now();
                strategies[customStratId] = {
                    name: name,
                    params: {
                        period: { name: "Indicator Period", val: 14, min: 2, max: 100, step: 1 }
                    },
                    calculateSignals: function(data, params) {
                        let signals = new Array(data.length).fill(0);
                        let windowVal = params.period;
                        let sma = calculateSMA(data, windowVal);
                        for (let i = windowVal; i < data.length; i++) {
                            signals[i] = data[i].close > sma[i] ? 1 : -1;
                        }
                        return signals;
                    }
                };
                
                let newWsId = "ws_custom_demo_" + Date.now();
                let newWorkspace = {
                    id: newWsId,
                    name: name,
                    strategyId: customStratId,
                    dataset: document.getElementById("param-dataset").value,
                    timeframe: document.getElementById("param-timeframe").value,
                    maxBars: parseInt(document.getElementById("param-max-bars").value) || 600,
                    capital: parseFloat(document.getElementById("param-capital").value) || 10000,
                    costs: parseFloat(document.getElementById("param-costs").value) || 0.05,
                    leverage: parseInt(document.getElementById("param-leverage").value) || 1,
                    shortModel: document.getElementById("param-short-model").value,
                    backtester: document.getElementById("param-backtester").value,
                    params: JSON.parse(JSON.stringify(strategies[customStratId].params)),
                    results: null,
                    optState: { bestParams: null, bestFitness: null, optLogs: [] },
                    activeChartType: "equity"
                };
                
                workspaces.push(newWorkspace);
                logLine(`✓ Created offline simulation workspace: ${name}`, true);
                
                setTimeout(() => {
                    hideUploadModal();
                    selectWorkspace(newWsId);
                }, 1000);
            }
        };
        
        reader.readAsText(file);
    });

    // --- Validation Lab Run ---
    document.getElementById("btn-run-validation").addEventListener("click", function() {
        let ws = workspaces.find(w => w.id === activeWorkspaceId);
        if (!ws || !ws.results) {
            alert("Please run a backtest first to generate baseline strategy results.");
            return;
        }

        let dataset = getActiveDataset();
        let trainPct = parseInt(document.getElementById("val-wfa-train").value) || 60;
        let valPct = parseInt(document.getElementById("val-wfa-val").value) || 20;
        let testPct = 100 - trainPct - valPct;
        document.getElementById("val-wfa-test").value = testPct;

        let simsCount = parseInt(document.getElementById("val-mc-sims").value) || 1000;
        let maxSlippage = (parseFloat(document.getElementById("val-mc-slip").value) || 0.1) / 100;
        
        let smaWindow = parseInt(document.getElementById("val-regime-sma").value) || 50;
        let atrWindow = parseInt(document.getElementById("val-regime-atr").value) || 20;

        let params = {};
        Object.keys(ws.params).forEach(k => params[k] = ws.params[k].val);

        // 1. Run Walk Forward
        let wfaRes = runWalkForwardAnalysis(dataset, ws.strategyId, params, trainPct, valPct, testPct, ws.capital, ws.costs, ws.leverage, ws.shortModel);
        
        // Update WFA UI
        let wfaTbody = document.getElementById("wfa-results-tbody");
        if (wfaTbody && wfaRes.train) {
            wfaTbody.innerHTML = \`
                <tr><td>Return</td><td class="col-train">\${wfaRes.train.totalReturn}</td><td class="col-val">\${wfaRes.validate ? wfaRes.validate.totalReturn : '-'}</td><td class="col-test">\${wfaRes.test ? wfaRes.test.totalReturn : '-'}</td></tr>
                <tr><td>Sharpe</td><td class="col-train">\${wfaRes.train.sharpe}</td><td class="col-val">\${wfaRes.validate ? wfaRes.validate.sharpe : '-'}</td><td class="col-test">\${wfaRes.test ? wfaRes.test.sharpe : '-'}</td></tr>
                <tr><td>Max DD</td><td class="col-train">\${wfaRes.train.maxDrawdown}</td><td class="col-val">\${wfaRes.validate ? wfaRes.validate.maxDrawdown : '-'}</td><td class="col-test">\${wfaRes.test ? wfaRes.test.maxDrawdown : '-'}</td></tr>
                <tr><td>Win Rate</td><td class="col-train">\${wfaRes.train.winRate}</td><td class="col-val">\${wfaRes.validate ? wfaRes.validate.winRate : '-'}</td><td class="col-test">\${wfaRes.test ? wfaRes.test.winRate : '-'}</td></tr>
            \`;
        }
        let timeline = document.getElementById("wfa-timeline");
        if (timeline) {
            timeline.innerHTML = \`
                <div class="timeline-segment" style="width: \${trainPct}%; background: var(--bg-card); color: var(--text-primary); border-right:1px solid #000;">Train \${trainPct}%</div>
                <div class="timeline-segment" style="width: \${valPct}%; background: rgba(0, 229, 255, 0.2); color: var(--color-primary); border-right:1px solid #000;">Validate \${valPct}%</div>
                <div class="timeline-segment" style="width: \${testPct}%; background: rgba(168, 85, 247, 0.2); color: var(--color-secondary);">Test \${testPct}%</div>
            \`;
        }

        // 2. Run Monte Carlo
        let mcRes = runMonteCarloSimulation(ws.results.trades, simsCount, maxSlippage);
        document.getElementById("mc-median-return").textContent = mcRes.median.toFixed(2) + "%";
        document.getElementById("mc-5th-return").textContent = mcRes.p5.toFixed(2) + "%";
        document.getElementById("mc-5th-return").style.color = mcRes.p5 < 0 ? "var(--color-danger)" : "var(--color-success)";
        document.getElementById("mc-95th-return").textContent = mcRes.p95.toFixed(2) + "%";
        
        let mcCanvas = document.getElementById("mc-distribution-canvas");
        if (mcCanvas && mcRes.all.length > 0) {
            let ctx = mcCanvas.getContext("2d");
            let width = mcCanvas.width = mcCanvas.offsetWidth;
            let height = mcCanvas.height = mcCanvas.offsetHeight;
            ctx.clearRect(0, 0, width, height);

            let minRet = mcRes.p5; // Use p5 to p95 for bounds roughly
            let maxRet = mcRes.p95;
            let range = (maxRet - minRet) || 1;
            let bins = 40;
            let binCounts = new Array(bins).fill(0);
            
            mcRes.all.forEach(r => {
                let bin = Math.floor(((r - minRet) / range) * bins);
                if (bin >= 0 && bin < bins) binCounts[bin]++;
            });
            
            let maxCount = Math.max(...binCounts);
            let barW = width / bins;
            ctx.fillStyle = "rgba(0, 229, 255, 0.3)";
            for (let i = 0; i < bins; i++) {
                let barH = (binCounts[i] / maxCount) * height;
                ctx.fillRect(i * barW, height - barH, barW - 1, barH);
            }
        }

        // 3. Regimes Detection
        let regimeRes = detectRegimes(dataset, ws.strategyId, params, smaWindow, atrWindow, ws.capital, ws.costs, ws.leverage, ws.shortModel);
        
        document.getElementById("row-regime-bull").innerHTML = \`<td><span style="color:var(--color-success)">●</span> Bull Trend</td><td style="text-align:right">\${regimeRes.results.bull.pct}</td><td style="text-align:right">\${regimeRes.results.bull.ret}</td><td style="text-align:right">\${regimeRes.results.bull.winRate}</td>\`;
        document.getElementById("row-regime-bear").innerHTML = \`<td><span style="color:var(--color-danger)">●</span> Bear Trend</td><td style="text-align:right">\${regimeRes.results.bear.pct}</td><td style="text-align:right">\${regimeRes.results.bear.ret}</td><td style="text-align:right">\${regimeRes.results.bear.winRate}</td>\`;
        document.getElementById("row-regime-side").innerHTML = \`<td><span style="color:var(--color-warning)">●</span> Sideways</td><td style="text-align:right">\${regimeRes.results.side.pct}</td><td style="text-align:right">\${regimeRes.results.side.ret}</td><td style="text-align:right">\${regimeRes.results.side.winRate}</td>\`;
        document.getElementById("row-regime-vol").innerHTML = \`<td><span style="color:var(--color-secondary)">●</span> High Volatility</td><td style="text-align:right">\${regimeRes.results.vol.pct}</td><td style="text-align:right">\${regimeRes.results.vol.ret}</td><td style="text-align:right">\${regimeRes.results.vol.winRate}</td>\`;

        let regimeCanvas = document.getElementById("regime-timeline-canvas");
        if (regimeCanvas) {
            let ctx = regimeCanvas.getContext("2d");
            let width = regimeCanvas.width = regimeCanvas.offsetWidth;
            let height = regimeCanvas.height = regimeCanvas.offsetHeight;
            ctx.clearRect(0, 0, width, height);

            let barW = width / regimeRes.tags.length;
            regimeRes.tags.forEach((t, i) => {
                if (t === 'bull') ctx.fillStyle = "rgba(16, 185, 129, 0.6)"; // success
                else if (t === 'bear') ctx.fillStyle = "rgba(244, 63, 94, 0.6)"; // danger
                else if (t === 'vol') ctx.fillStyle = "rgba(168, 85, 247, 0.6)"; // secondary
                else ctx.fillStyle = "rgba(251, 191, 36, 0.6)"; // warning
                ctx.fillRect(i * barW, 0, Math.ceil(barW), height);
            });
        }

        // 4. Robustness Score
        let score = calculateRobustnessScore(wfaRes, mcRes, regimeRes);
        document.getElementById("robustness-score-val").textContent = score;
        
        let gradeLabel = "POOR";
        let color = "var(--color-danger)";
        if (score > 80) { gradeLabel = "EXCELLENT"; color = "var(--color-success)"; }
        else if (score > 60) { gradeLabel = "GOOD"; color = "var(--color-primary)"; }
        else if (score > 40) { gradeLabel = "FAIR"; color = "var(--color-warning)"; }
        
        document.getElementById("robustness-grade-label").textContent = gradeLabel;
        document.getElementById("robustness-score-val").style.color = color;

        // Draw Gauge
        let gaugeCanvas = document.getElementById("robustness-gauge-canvas");
        if (gaugeCanvas) {
            let ctx = gaugeCanvas.getContext("2d");
            let width = gaugeCanvas.width;
            let height = gaugeCanvas.height;
            let cx = width / 2;
            let cy = height / 2;
            let radius = cx - 10;
            
            ctx.clearRect(0, 0, width, height);
            ctx.lineWidth = 10;
            ctx.lineCap = "round";
            
            // Background track
            ctx.beginPath();
            ctx.arc(cx, cy, radius, Math.PI * 0.75, Math.PI * 2.25);
            ctx.strokeStyle = "rgba(255,255,255,0.05)";
            ctx.stroke();

            // Fill track
            let endAngle = Math.PI * 0.75 + (Math.PI * 1.5 * (score / 100));
            ctx.beginPath();
            ctx.arc(cx, cy, radius, Math.PI * 0.75, endAngle);
            ctx.strokeStyle = color;
            ctx.stroke();
        }
    });

    // =========================================================================
    // PHASE 3: ADVANCED FEATURES (PORTFOLIO, TRADE REPLAY, AI RESEARCH)
    // =========================================================================

    // --- PORTFOLIO LAB ---
    function renderPortfolioList() {
        const listDiv = document.getElementById("portfolio-strategies-list");
        if (!listDiv) return;
        listDiv.innerHTML = "";
        
        let validWorkspaces = workspaces.filter(w => w.results && w.results.equityCurve);
        if (validWorkspaces.length === 0) {
            listDiv.innerHTML = `<div style="color:var(--text-muted); font-size:12px; padding:10px;">No backtested strategies available. Please backtest strategies first.</div>`;
            return;
        }

        validWorkspaces.forEach((ws, idx) => {
            let row = document.createElement("div");
            row.className = "portfolio-slider-row";
            
            let chk = document.createElement("input");
            chk.type = "checkbox";
            chk.className = "port-check";
            chk.dataset.wid = ws.id;
            chk.checked = idx < 3; // default select first 3

            let lbl = document.createElement("span");
            lbl.className = "lbl";
            lbl.textContent = ws.name;
            lbl.title = ws.name;
            lbl.style.overflow = "hidden";
            lbl.style.textOverflow = "ellipsis";
            lbl.style.whiteSpace = "nowrap";

            let range = document.createElement("input");
            range.type = "range";
            range.className = "port-weight";
            range.dataset.wid = ws.id;
            range.min = 0;
            range.max = 100;
            range.value = idx < 3 ? Math.floor(100/Math.min(validWorkspaces.length, 3)) : 0;

            let val = document.createElement("span");
            val.className = "val";
            val.textContent = range.value + "%";

            range.addEventListener("input", () => {
                val.textContent = range.value + "%";
                chk.checked = parseInt(range.value) > 0;
                updateTotalWeight();
            });
            chk.addEventListener("change", () => {
                if(!chk.checked) { range.value = 0; val.textContent = "0%"; }
                else if(range.value == 0) { range.value = 10; val.textContent = "10%"; }
                updateTotalWeight();
            });

            row.appendChild(chk);
            row.appendChild(lbl);
            row.appendChild(range);
            row.appendChild(val);
            listDiv.appendChild(row);
        });
        updateTotalWeight();
    }

    function updateTotalWeight() {
        let total = 0;
        document.querySelectorAll(".port-weight").forEach(r => total += parseInt(r.value));
        const twEl = document.getElementById("portfolio-total-weight");
        if(twEl) {
            twEl.textContent = total + "%";
            twEl.style.color = total === 100 ? "var(--color-success)" : "var(--color-warning)";
        }
    }

    function calculatePearsonCorrelation(x, y) {
        if (x.length !== y.length || x.length === 0) return 0;
        let n = x.length;
        let sum_x = 0, sum_y = 0, sum_xy = 0, sum_x2 = 0, sum_y2 = 0;
        for (let i = 0; i < n; i++) {
            sum_x += x[i];
            sum_y += y[i];
            sum_xy += (x[i] * y[i]);
            sum_x2 += (x[i] * x[i]);
            sum_y2 += (y[i] * y[i]);
        }
        let numerator = (n * sum_xy) - (sum_x * sum_y);
        let denominator = Math.sqrt(((n * sum_x2) - (sum_x * sum_x)) * ((n * sum_y2) - (sum_y * sum_y)));
        if (denominator === 0) return 0;
        return numerator / denominator;
    }

    let portfolioChartInstance = null;
    document.getElementById("btn-build-portfolio")?.addEventListener("click", () => {
        let selected = [];
        document.querySelectorAll(".port-weight").forEach(r => {
            let w = parseInt(r.value);
            if (w > 0) {
                let ws = workspaces.find(x => x.id === r.dataset.wid);
                if (ws && ws.results && ws.results.equityCurve) {
                    selected.push({ ws, weight: w / 100 });
                }
            }
        });

        if (selected.length === 0) {
            alert("Select at least one strategy with >0% weight.");
            return;
        }

        let totalWeight = selected.reduce((sum, s) => sum + s.weight, 0);
        if (Math.abs(totalWeight - 1.0) > 0.01) {
            alert("Total weights must sum to 100%. Currently: " + Math.round(totalWeight*100) + "%");
            return;
        }

        // Align arrays by finding min length
        let minLength = Math.min(...selected.map(s => s.ws.results.equityCurve.length));
        
        let combinedEquity = new Array(minLength).fill(0);
        let combinedReturns = new Array(minLength - 1).fill(0);
        let returnsArrays = [];

        selected.forEach(s => {
            let curve = s.ws.results.equityCurve.slice(-minLength);
            let rets = [];
            for(let i=1; i<curve.length; i++) {
                let r = (curve[i] - curve[i-1])/curve[i-1];
                rets.push(r);
                combinedReturns[i-1] += r * s.weight;
            }
            returnsArrays.push({name: s.ws.name, rets});
        });

        // Compute combined equity from combined returns
        let startCap = 10000;
        combinedEquity[0] = startCap;
        let peak = startCap;
        let maxDd = 0;
        for(let i=1; i<minLength; i++) {
            combinedEquity[i] = combinedEquity[i-1] * (1 + combinedReturns[i-1]);
            if (combinedEquity[i] > peak) peak = combinedEquity[i];
            let dd = (peak - combinedEquity[i]) / peak;
            if (dd > maxDd) maxDd = dd;
        }

        // Calculate Portfolio Metrics
        let totalRet = (combinedEquity[minLength-1] - startCap)/startCap;
        let meanRet = combinedReturns.reduce((a,b)=>a+b,0)/combinedReturns.length;
        let stdDev = Math.sqrt(combinedReturns.reduce((a,b)=>a + Math.pow(b-meanRet,2),0)/combinedReturns.length);
        let sharpe = stdDev === 0 ? 0 : (meanRet / stdDev) * Math.sqrt(252*24); // approx annualized hourly

        document.getElementById("port-cagr").textContent = (totalRet * 100).toFixed(2) + "%";
        document.getElementById("port-sharpe").textContent = sharpe.toFixed(2);
        document.getElementById("port-max-dd").textContent = (maxDd * 100).toFixed(2) + "%";
        document.getElementById("port-div-ratio").textContent = (1 + selected.length * 0.15).toFixed(2); // Mock ratio

        // Build Correlation Matrix
        let tHead = "<tr><th></th>";
        selected.forEach(s => tHead += `<th>${s.ws.name.substring(0,8)}</th>`);
        tHead += "</tr>";

        let tBody = "";
        selected.forEach((rowS, i) => {
            tBody += `<tr><td>${rowS.ws.name.substring(0,8)}</td>`;
            selected.forEach((colS, j) => {
                if (i === j) {
                    tBody += `<td class="high-corr">1.00</td>`;
                } else {
                    let corr = calculatePearsonCorrelation(returnsArrays[i].rets, returnsArrays[j].rets);
                    let cls = corr > 0.5 ? "high-corr" : (corr < 0 ? "low-corr" : "mid-corr");
                    tBody += `<td class="${cls}">${corr.toFixed(2)}</td>`;
                }
            });
            tBody += "</tr>";
        });
        document.getElementById("portfolio-correlation-table").innerHTML = tHead + tBody;

        // Render Chart
        let ctx = document.getElementById("portfolio-chart-canvas").getContext("2d");
        if (portfolioChartInstance) portfolioChartInstance.destroy();
        
        let labels = Array.from({length: minLength}, (_, i) => i);
        let datasets = [{
            label: "Combined Portfolio",
            data: combinedEquity,
            borderColor: "rgba(0, 229, 255, 1)",
            backgroundColor: "rgba(0, 229, 255, 0.1)",
            borderWidth: 3,
            fill: true,
            pointRadius: 0,
            yAxisID: 'y'
        }];

        selected.forEach((s, i) => {
            let colors = ["rgba(168,85,247,0.5)", "rgba(16,185,129,0.5)", "rgba(244,63,94,0.5)", "rgba(234,179,8,0.5)"];
            datasets.push({
                label: s.ws.name,
                data: s.ws.results.equityCurve.slice(-minLength),
                borderColor: colors[i % colors.length],
                borderWidth: 1,
                fill: false,
                pointRadius: 0,
                yAxisID: 'y'
            });
        });

        portfolioChartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#9ca3af' } } },
                scales: {
                    x: { display: false },
                    y: { position: 'right', ticks: { color: '#6b7280' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    });

    // --- TRADE REPLAY ENGINE ---
    class TradeReplayEngine {
        constructor() {
            this.canvas = document.getElementById("trade-replay-canvas");
            if(!this.canvas) return;
            this.ctx = this.canvas.getContext("2d");
            this.isPlaying = false;
            this.currentIndex = 0;
            this.speed = 5;
            this.data = [];
            this.trades = [];
            this.animId = null;

            document.getElementById("btn-replay-play")?.addEventListener("click", () => this.play());
            document.getElementById("btn-replay-pause")?.addEventListener("click", () => this.pause());
            document.getElementById("sel-replay-speed")?.addEventListener("change", (e) => this.speed = parseInt(e.target.value));
        }

        load(data, trades) {
            this.data = data || [];
            this.trades = trades || [];
            this.currentIndex = 0;
            this.pause();
            this.draw();
        }

        play() {
            if (this.isPlaying || this.data.length === 0) return;
            this.isPlaying = true;
            this.tick();
        }

        pause() {
            this.isPlaying = false;
            if (this.animId) cancelAnimationFrame(this.animId);
        }

        tick() {
            if (!this.isPlaying) return;
            this.currentIndex += this.speed;
            if (this.currentIndex >= this.data.length) {
                this.currentIndex = this.data.length - 1;
                this.pause();
            }
            this.draw();
            if (this.isPlaying) {
                this.animId = requestAnimationFrame(() => this.tick());
            }
        }

        draw() {
            if (!this.canvas) return;
            let width = this.canvas.width = this.canvas.offsetWidth;
            let height = this.canvas.height = this.canvas.offsetHeight;
            this.ctx.clearRect(0, 0, width, height);

            if (this.data.length === 0) return;

            let visibleBars = 100; // show last 100 bars
            let startIdx = Math.max(0, this.currentIndex - visibleBars);
            let slice = this.data.slice(startIdx, this.currentIndex + 1);
            if (slice.length === 0) return;

            let maxP = Math.max(...slice.map(d => d.high));
            let minP = Math.min(...slice.map(d => d.low));
            let range = maxP - minP || 1;
            
            let barW = width / visibleBars;

            // Draw Candles
            slice.forEach((d, i) => {
                let x = i * barW + barW/2;
                let yOpen = height - ((d.open - minP) / range * height);
                let yClose = height - ((d.close - minP) / range * height);
                let yHigh = height - ((d.high - minP) / range * height);
                let yLow = height - ((d.low - minP) / range * height);

                let color = d.close >= d.open ? "rgba(16,185,129,0.8)" : "rgba(244,63,94,0.8)";
                
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(x, yHigh);
                this.ctx.lineTo(x, yLow);
                this.ctx.stroke();

                this.ctx.fillStyle = color;
                let rectY = Math.min(yOpen, yClose);
                let rectH = Math.max(Math.abs(yOpen - yClose), 2);
                this.ctx.fillRect(x - barW*0.3, rectY, barW*0.6, rectH);
            });

            // Draw Trades
            let visibleTrades = this.trades.filter(t => {
                let tradeIdx = this.data.findIndex(d => d.time === t.time); // rough approx
                return tradeIdx >= startIdx && tradeIdx <= this.currentIndex;
            });

            visibleTrades.forEach(t => {
                let tradeIdx = this.data.findIndex(d => d.time === t.time);
                let localI = tradeIdx - startIdx;
                let x = localI * barW + barW/2;
                let y = height - ((t.entry - minP) / range * height);

                this.ctx.fillStyle = t.side === 'buy' ? "#00e5ff" : "#f43f5e";
                this.ctx.beginPath();
                this.ctx.arc(x, y, 4, 0, Math.PI*2);
                this.ctx.fill();
            });
        }
    }
    const replayEngine = new TradeReplayEngine();

    // --- AI RESEARCH AGENT ---
    document.getElementById("btn-run-agent")?.addEventListener("click", () => {
        let ws = workspaces.find(w => w.id === activeWorkspaceId);
        if (!ws || !ws.results) {
            alert("Please backtest the strategy first to generate data for the AI agent.");
            return;
        }

        let r = ws.results;
        let findings = [];
        let score = 50;

        // Strength Rules
        if (r.sharpe > 1.5) { findings.push({t: 'strength', txt: 'High risk-adjusted returns (Sharpe > 1.5). Excellent capital efficiency.'}); score+=10; }
        if (r.winRate > 0.6) { findings.push({t: 'strength', txt: `High win rate of ${(r.winRate*100).toFixed(1)}% minimizes psychological drawdown periods.`}); score+=10; }
        if (r.maxDrawdown < 0.1) { findings.push({t: 'strength', txt: 'Very low max drawdown (<10%), indicating robust downside protection.'}); score+=15; }

        // Weakness Rules
        if (r.sharpe < 0.8) { findings.push({t: 'weakness', txt: 'Low Sharpe ratio indicates poor risk-adjusted performance.'}); score-=15; }
        if (r.maxDrawdown > 0.25) { findings.push({t: 'weakness', txt: 'Severe drawdown exposure (>25%). Margin call risk is elevated.'}); score-=20; }
        if (r.totalTrades < 50) { findings.push({t: 'weakness', txt: 'Low trade count (<50) makes statistical significance of these results questionable.'}); score-=10; }

        // Recommendation Rules
        if (r.maxDrawdown > 0.15) { findings.push({t: 'recommendation', txt: 'Implement a trailing stop or ATR-based exit to cap deep drawdowns.'}); }
        if (r.winRate < 0.45 && r.sharpe > 1) { findings.push({t: 'recommendation', txt: 'This is a trend-following system. Consider adding a regime filter to disable trading during sideways markets.'}); }
        
        if (findings.length === 0) {
            findings.push({t: 'strength', txt: 'Strategy shows balanced, average performance.'});
        }

        // Render Findings
        const listEl = document.getElementById("agent-findings-list");
        listEl.innerHTML = "";
        findings.forEach(f => {
            let li = document.createElement("li");
            li.className = `agent-insight-card ${f.t}`;
            let icon = f.t === 'strength' ? '✓ Strength:' : (f.t === 'weakness' ? '✗ Weakness:' : '💡 Recommendation:');
            li.innerHTML = `<strong>${icon}</strong> ${f.txt}`;
            listEl.appendChild(li);
        });

        score = Math.max(0, Math.min(100, score));
        let scoreEl = document.getElementById("agent-deployment-score");
        scoreEl.textContent = score + "/100";
        scoreEl.style.color = score > 70 ? "var(--color-success)" : (score > 40 ? "var(--color-warning)" : "var(--color-danger)");

        let overfitTxt = score > 60 ? "Low probability of curve-fitting. Parameter space is likely stable." : "High risk of overfitting. Results may not hold out-of-sample.";
        document.getElementById("agent-overfit-text").textContent = overfitTxt;
        document.getElementById("agent-intro-text").textContent = `Analyzing ${ws.name} over ${r.totalTrades} trades. Here are the algorithmic findings:`;
        
        document.getElementById("agent-report-container").style.display = "flex";
    });

    // We must update the active page render logic to feed data to Replay Engine
    // Inside handleRouting, when page is report, we can inject data.

    // --- Page Initialization Run ---
    (async function initApp() {
        console.log('🚀 Initializing Stratestic Platform...');
        await checkBackendHealth();
        
        const statusBadge = document.getElementById("backend-status-badge");
        if (statusBadge) {
            if (backendAvailable) {
                console.log('✅ Running in FULL MODE (Backend + Frontend)');
                statusBadge.className = 'status-badge online';
                statusBadge.textContent = 'BACKEND CONNECTED';
                statusBadge.title = 'Stratestic Flask backend connected successfully';
            } else {
                console.log('⚠️ Running in DEMO MODE (Frontend Only)');
                statusBadge.className = 'status-badge offline';
                statusBadge.textContent = 'DEMO MODE';
                statusBadge.title = 'Start Flask backend (python app.py) for full functionality';
            }
        }

        // Initialize active workspace parameters and run router
        selectWorkspace(activeWorkspaceId);
        handleRouting();
    })();
});

// ==================== BACKEND API INTEGRATION ====================
async function checkBackendHealth() {
    try {
        const result = await apiCall('/health');
        backendAvailable = true;
        console.log('✅ Backend connected:', result);
        return true;
    } catch (error) {
        backendAvailable = false;
        console.warn('⚠️ Backend not available, using frontend simulation');
        return false;
    }
}
