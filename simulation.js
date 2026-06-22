// simulation.js - Mathematical and Local Simulation Logic for Stratestic Quant Dashboard

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

// Calculate Relative Strength Index (RSI)
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

// Calculate MACD (Moving Average Convergence Divergence)
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

// Calculate Bollinger Bands
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
        params: {
            ma_period: { name: "MA Period", val: 15, min: 5, max: 100, step: 1 },
            rsi_period: { name: "RSI Period", val: 14, min: 5, max: 50, step: 1 },
            rsi_overbought: { name: "RSI Overbought", val: 70, min: 50, max: 95, step: 1 },
            rsi_oversold: { name: "RSI Oversold", val: 30, min: 5, max: 50, step: 1 }
        },
        calculateSignals: function(data, params) {
            let sma = calculateSMA(data, params.ma_period);
            let rsi = calculateRSI(data, params.rsi_period);
            let signals = new Array(data.length).fill(0);
            let currentSignal = 0;

            for (let i = Math.max(params.ma_period, params.rsi_period); i < data.length; i++) {
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
    
    let equityCurve = [];
    let bhCurve = [];
    let drawdownCurve = [];
    let marginCurve = [];
    let signalsFiler = [];

    let isLiquidated = false;
    let liquidationIndex = -1;
    let maintenanceMarginRate = 0.05; 

    for (let i = 0; i < data.length; i++) {
        let price = data[i].close;
        let side = signals[i] || 0;
        
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

        let prevPrice = i > 0 ? data[i-1].close : price;
        let priceChangePct = (price - prevPrice) / prevPrice;

        let unrealizedPnL = 0;
        if (position !== 0) {
            if (position > 0) {
                unrealizedPnL = position * (price - prevPrice);
            } else {
                if (shortModel === "static") {
                    unrealizedPnL = -position * (prevPrice - price);
                } else {
                    unrealizedPnL = -position * (price - prevPrice);
                }
            }
            cash += unrealizedPnL;
        }

        equity = cash;
        peakEquity = Math.max(peakEquity, equity);

        let positionVal = Math.abs(position) * price;
        let marginUsed = leverage > 1 ? (positionVal / leverage) : 0;
        let marginRatio = 0;
        
        if (marginUsed > 0) {
            let maintenanceMargin = positionVal * maintenanceMarginRate;
            let accountValue = equity; 
            marginRatio = maintenanceMargin / accountValue;
            
            if (accountValue <= maintenanceMargin || equity <= 0) {
                isLiquidated = true;
                liquidationIndex = i;
                cash = 0;
                equity = 0;
                position = 0;
                
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
        marginCurve.push(Math.min(marginRatio, 2)); 

        if (isLiquidated) {
            equityCurve.push(0);
            drawdownCurve.push(-100);
            continue;
        }

        let currentSignal = position > 0 ? 1 : (position < 0 ? -1 : 0);
        signalsFiler.push(currentSignal);

        if (side !== currentSignal && !isLiquidated) {
            let tradeFee = 0;
            
            if (position !== 0) {
                let entryPrice = data[lastTradeIndex].close;
                let tradeReturn = (price - entryPrice) / entryPrice;
                if (position < 0) {
                    tradeReturn = shortModel === "static" ? (1 - price / entryPrice) : (entryPrice / price - 1);
                }
                
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

            if (side !== 0) {
                lastTradeIndex = i;
                let allocation = equity * leverage;
                position = side * (allocation / price);
                tradeFee = allocation * (costPct / 100);
                cash -= tradeFee;
                equity = cash;
            }
        }

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
    
    let totalReturn = ((results.finalEquity - capitalInit) / capitalInit) * 100;
    let bhReturn = ((bh[n - 1] - capitalInit) / capitalInit) * 100;
    
    let years = n / 8760;
    let annualizedReturn = (Math.pow((results.finalEquity / capitalInit), (1 / years)) - 1) * 100;
    if (results.finalEquity <= 0) annualizedReturn = -100;

    let dailyReturns = [];
    let step = 24;
    for (let i = step; i < n; i += step) {
        let dayRet = (equity[i] - equity[i - step]) / equity[i - step];
        dailyReturns.push(isNaN(dayRet) ? 0 : dayRet);
    }
    
    let avgDailyReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    let variance = dailyReturns.reduce((a, b) => a + Math.pow(b - avgDailyReturn, 2), 0) / dailyReturns.length;
    let dailyVol = Math.sqrt(variance);
    let annualizedVol = dailyVol * Math.sqrt(365) * 100; 

    let rfRate = 0.02;
    let excessReturn = (annualizedReturn / 100) - rfRate;
    let sharpe = annualizedVol > 0 ? (excessReturn / (annualizedVol / 100)) : 0;
    if (results.finalEquity <= 0) sharpe = 0;

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

    let negativeReturns = dailyReturns.filter(r => r < 0);
    let downVol = negativeReturns.length > 0 ? Math.sqrt(negativeReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / dailyReturns.length) * Math.sqrt(365) : 0;
    let sortino = downVol > 0 ? (excessReturn / downVol) : 0;
    let calmar = Math.abs(maxDrawdown) > 0 ? (annualizedReturn / Math.abs(maxDrawdown)) : 0;

    let trades = results.trades;
    let winCount = trades.filter(t => t.pnl > 0).length;
    let winRate = trades.length > 0 ? (winCount / trades.length) * 100 : 0;
    let bestTrade = trades.length > 0 ? Math.max(...trades.map(t => t.ret)) : 0;
    let worstTrade = trades.length > 0 ? Math.min(...trades.map(t => t.ret)) : 0;
    let avgTrade = trades.length > 0 ? trades.map(t => t.ret).reduce((a, b) => a + b, 0) / trades.length : 0;

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
    })(results.equityCurve.map((e, idx) => results.equityCurve[idx] > 0 ? 1 : 0)); 

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
    
    logs.push(timestamp() + "Translating trading signals inside OnTick()...");
    if (mqlCode.includes("Trade.Buy")) {
        logs.push(timestamp() + "Buy execution found: mapped to position vector 1.");
    }
    if (mqlCode.includes("Trade.Sell")) {
        logs.push(timestamp() + "Sell execution found: mapped to position vector -1.");
    }

    logs.push(timestamp() + "Generating Python StrategyMixin subclass...");
    
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
    
    let keys = Object.keys(paramBounds);
    let values = keys.map(k => {
        let b = paramBounds[k];
        let arr = [];
        for (let v = b.min; v <= b.max; v += b.step) {
            arr.push(v);
        }
        return arr;
    });

    function cartesian(args) {
        let r = [], max = args.length-1;
        function helper(arr, i) {
            for (let j=0, l=args[i].length; j<l; j++) {
                let a = arr.slice(); 
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
        
        let signals = strategies[currentStrategyId].calculateSignals(dataset, params);
        let backtestRes = runBacktestEngine(dataset, signals, capitalInit, costPct, leverage, shortModel, "vectorized");
        
        let stats = calculateMetrics(dataset, backtestRes, capitalInit);
        let score = 0;
        
        if (optMetric === "Sharpe Ratio") score = parseFloat(stats.sharpe);
        else if (optMetric === "Return") score = parseFloat(stats.totalReturn.replace('%', ''));
        else if (optMetric === "Calmar Ratio") score = parseFloat(stats.calmar);
        else if (optMetric === "Sortino Ratio") score = parseFloat(stats.sortino);
        else if (optMetric === "Win Rate") score = parseFloat(stats.winRate.replace('%', ''));
        else if (optMetric === "Maximum Drawdown") score = -parseFloat(stats.maxDrawdown.replace('%', '')); 

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
    
    function createRandomChromosome() {
        let chromosome = {};
        keys.forEach(k => {
            let b = paramBounds[k];
            let stepsCount = Math.floor((b.max - b.min) / b.step);
            let steps = Math.floor(Math.random() * (stepsCount + 1));
            chromosome[k] = b.min + steps * b.step;
            chromosome[k] = parseFloat(chromosome[k].toFixed(2));
        });
        return chromosome;
    }

    function evaluateFitness(chromosome) {
        let signals = strategies[currentStrategyId].calculateSignals(dataset, chromosome);
        let backtestRes = runBacktestEngine(dataset, signals, capitalInit, costPct, leverage, shortModel, "vectorized");
        
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

    for (let gen = 1; gen <= maxGen; gen++) {
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

        let nextPopulation = [];
        let eliteCount = Math.max(1, Math.floor(popSize * 0.2));
        for (let i = 0; i < eliteCount; i++) {
            nextPopulation.push({ ...population[i] });
        }

        while (nextPopulation.length < popSize) {
            let parentA, parentB;
            
            if (selectionStrategy === "roulette_wheel") {
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

            let childChrom = {};
            keys.forEach(k => {
                childChrom[k] = Math.random() > 0.5 ? parentA[k] : parentB[k];
            });

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
