import xeggexApi from './xeggexApi.js'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { v4 as uuidv4 } from 'uuid';
import Big from 'big.js';
import { onShutdown } from "node-graceful-shutdown";
import process from 'process';
import fs from 'fs';

const argv = yargs(hideBin(process.argv)).argv


const opts = {
    apiKey: argv.apiKey,            	/// API key
    apiSecret: argv.apiSecret,      	/// API secret
    spread: argv.spread / 100,      	/// Spread to maintain
    baseexposure: argv.baseexposure / 100,  /// Amount of base account to have exposed at a given time
    stockexposure: argv.stockexposure / 100,  /// Amount of stock account to have exposed at a given time
    basemax: argv.basemax,                	/// Max Qty can use for base exposure
    stockmax: argv.stockmax,               	/// Max Qty can use for stock exposre
    base: argv.base,                	/// Base asset to use e.g. BTC for BTC_ETH
    stock: argv.stock,               	/// Stock to use e.g. ETH for BTC_ETH
    numorders: parseInt(argv.numorders)	/// Number of orders per side
}

// Get the command line args and save into opts
Object.keys(opts).forEach(key => {
    if (opts[key] === undefined) {
        console.log(`
            ${key} must be passed into the program
            e.g. node . run --${key}=<value>
            `)
        process.exit(1);
    }
});

console.log(
    `
        Running market maker with the following options;
        Spread: ${opts.spread}
        Base Exposure: ${opts.baseexposure}
        Stock Exposure: ${opts.stockexposure}
        Base Max: ${opts.basemax}
        Stock Max: ${opts.stockmax}
        Base Asset: ${opts.base}
        Stock Asset: ${opts.stock}
        NumOrders: ${opts.numorders}
    `)

console.log(opts.stock + '_' + opts.base + " process id is " + process.pid);

fs.writeFileSync("./pidfiles/" + opts.stock + "_" + opts.base + ".pid", process.pid.toString());

const restapi = new xeggexApi(opts.apiKey, opts.apiSecret);


restapi.cancelAllOrders(opts.stock + '/' + opts.base, 'all');


var lastPrice = 0;
var is_initialised = false;
var rebalancing = false;
var lastTradeSide = null;
var lastCheckTime = Date.now(); // ms


runIt();

// On Shutdown - Cancel open orders
onShutdown("main", async function () {

  return new Promise((resolve, reject) => {

    (async () => {
			
      var apiresp = await restapi.cancelAllOrders(opts.stock + '/' + opts.base, 'all');
					
      console.log('Cancel open orders');
      
      fs.unlinkSync("./pidfiles/" + opts.stock + "_" + opts.base + ".pid")

	  console.log('Remove PID file');
	  
      resolve(apiresp);
				
    })();
			
  });
	
});


async function runIt()
{

	if (!is_initialised) {
	  await recalculate_and_enter();
	  is_initialised = true;
	}

	// Get last trade
    var apiresp = await restapi.getTradeHistorySince(opts.stock + '/' + opts.base, lastCheckTime);

	for (let t = 0; t < apiresp.length; t++)
	{
	
		var thistrade = apiresp[t];
	
		// A Trade Has Occurred

		lastTradeSide = thistrade.side;
		lastPrice = thistrade.price;
		lastCheckTime = thistrade.createdAt;
		
		if (lastTradeSide == 'buy') // we need to sell
		{

			let uuid = uuidv4();

    		var newprice = (lastPrice + (lastPrice * (opts.spread / 2))).toFixed(10);

    		var orderinfo = await restapi.createLimitOrder(opts.stock + '/' +  opts.base, 'sell', thistrade.quantity, newprice, uuid);

console.log(orderinfo);

    		// Then cancel the sell order with the max price
    		
			var oomaxprice = null;
			var cxlorderid = null;
			var openorders = await restapi.getOpenOrders(opts.stock + '/' +  opts.base);
			for (let i = 0; i < openorders.length; i++)
			{
		
				if (openorders[i].side == 'sell')
				{
				
					if (oomaxprice == null || Big(openorders[i].price).gt(oomaxprice))
					{
						oomaxprice = openorders[i].price;
						cxlorderid = openorders[i].id;
					}
				
				}

			}
			
			if (cxlorderid != null)
			{
			
				await restapi.cancelOrder(cxlorderid);
			
			}

		}
		else // we need to buy
		{

			let uuid = uuidv4();

    		var newprice = (lastPrice - (lastPrice * (opts.spread / 2))).toFixed(10);

    		var orderinfo = await restapi.createLimitOrder(opts.stock + '/' +  opts.base, 'buy', thistrade.quantity, newprice, uuid);

console.log(orderinfo);

    		// Then cancel the buy order with the min price

			var oominprice = null;
			var cxlorderid = null;
			var openorders = await restapi.getOpenOrders(opts.stock + '/' +  opts.base);
			for (let i = 0; i < openorders.length; i++)
			{
		
				if (openorders[i].side == 'buy')
				{
				
					if (oominprice == null || Big(openorders[i].price).lt(oominprice))
					{
						oominprice = openorders[i].price;
						cxlorderid = openorders[i].id;
					}
				
				}

			}
			
			if (cxlorderid != null)
			{
			
				await restapi.cancelOrder(cxlorderid);
			
			}



		}
		
		// Check open orders
		
		var openorders = await restapi.getOpenOrders(opts.stock + '/' +  opts.base);
		
		var buycount = 0;
		var sellcount = 0;
		
		for (let i = 0; i < openorders.length; i++)
		{
		
			if (openorders[i].side == 'buy') buycount++;
			else sellcount++;

		}

		if (buycount < opts.numorders - 3 || sellcount < opts.numorders - 3)
		{
			// Rebuild
			await restapi.cancelAllOrders(opts.stock + '/' + opts.base, 'all');
			await recalculate_and_enter();
		}

	}

	setTimeout(function() {
	
		runIt();
	
	},30000);


}


// Enter a buy order with n% from account (y/2)% away from the last price
// Enter a sell order with n% from accoutn (y/2)% away from the last price

async function recalculate_and_enter() {

	console.log('recalulate and enter');

    var htrades = await restapi.getHistoricalTrades(opts.stock + '/' + opts.base, 1);

	if (htrades.length > 0)
	{
	
		lastPrice = parseFloat(htrades[0].price);
		
		let account_info = await restapi.getBalances();

		var balances = {};
		for (let i = 0; i < account_info.length; i++)
		{
	
			var thisitem = account_info[i];
		
			balances[thisitem.asset] = thisitem.available;

		}

		let base_balance = parseFloat(balances[opts.base]);
		let stock_balance = parseFloat(balances[opts.stock]);

		let sell_price = null;
		let buy_price = null;

		sell_price = (lastPrice + (lastPrice * (opts.spread / 2))).toFixed(10);
		buy_price = (lastPrice - (lastPrice * (opts.spread / 2))).toFixed(10);

		let quantity_stock = (stock_balance * opts.stockexposure / opts.numorders).toFixed(3);
		let quantity_base = ((base_balance * opts.baseexposure / opts.numorders)/buy_price).toFixed(3);
	
		if (stock_balance * opts.stockexposure > opts.stockmax)
		{
			quantity_stock = (opts.stockmax / opts.numorders).toFixed(3);
		}

		if (base_balance * opts.baseexposure > opts.basemax)
		{
			quantity_base = ((opts.basemax / opts.numorders)/buy_price).toFixed(3);
		}

		console.log(
			`
			Entering orders:
				Buy amount (${opts.stock}): ${quantity_base}
				Buy price (${opts.base}): ${buy_price}

				Sell amount (${opts.stock}): ${quantity_stock}
				Sell price (${opts.base}): ${sell_price}

				Last Price: ${lastPrice} 
			
				Num Orders: ${opts.numorders} 
			`)



		var slidermin = parseInt(opts.numorders / 2) - opts.numorders;

		for (const side of ["buy", "sell"]) {
		
		  var adjstart = slidermin;

		  for (let i = 0; i < opts.numorders; i++)
		  {
	
			let uuid = uuidv4();
			
			var slidequantity = 0;
			
			if (side === "buy")
			{
			
				var adjust = Big(quantity_base).times(adjstart).div(25).toFixed(8);
				
				slidequantity = Big(quantity_base).plus(adjust).toFixed(8);
				
			}
			else
			{
			
				var adjust = Big(quantity_stock).times(adjstart).div(25).toFixed(8);
				
				slidequantity = Big(quantity_stock).plus(adjust).toFixed(8);
			
			}
			
			adjstart = adjstart + 1;
	
			var orderinfo = await restapi.createLimitOrder(opts.stock + '/' +  opts.base, side, slidequantity, side === "buy" ? buy_price : sell_price, uuid);

console.log(orderinfo);

			if (side == 'buy')
			{
				buy_price = (parseFloat(buy_price) - (parseFloat(buy_price) * (opts.spread / 2))).toFixed(10);
			}
			else
			{
				sell_price = (parseFloat(sell_price) + (parseFloat(sell_price) * (opts.spread / 2))).toFixed(10);
			}
		
		  } 
	
		}
    
    }
    else
    {
    
    	console.log('Error, no historical trades to base pricing from');
    
    
    }
    
    return true;

}

