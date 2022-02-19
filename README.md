# Liquidity Provider
Liquidity Provider bot for Xeggex, written in NodeJS

**Install Nodejs v12**
```
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
apt-get install -y nodejs
```

**To Install:**
```
git clone https://github.com/xeggex/liquidityBot
cd liquidityBot
chmod u+x ./install.sh
./install.sh
```

**Update Config**
edit api.config:
```
apiKey=*Your API Key*
apiSecret=*Your API Secret*
```

**Start a Bot using helper**
```
./startBot.sh
```

**Start a Bot raw command**
```
./liquidityProvider.sh --spread=3 --baseexposure=2 --stockexposure=2 --basemax=0.01 --stockmax=1 --base=BTC --stock=ETH --numorders=10
```

The program will run as a Daemon.   You can kill all running bots with this:
```
sh killAll.sh
```

You can view your running bots with this command:
```
./showBots.sh
```

If you need to stop one bot then run the showBots script, get the PID and:
```
kill PID
```

**Parameters**

`./liquidityProvider.sh` takes in 8 required arguments;
* `--spread=`: The spread percentage on the asset you would like to market make on
* `--baseexposure= or -be=`: The maximum percentage of your base account you want in the order book at any given time
* `--stockexposure= or -se=`: The maximum percentage of your stock account you want in the order book at any given time
* `--basemax=`: The maximum quantity of base asset can use to restrict max exposure
* `--stockmax=`: The maximum quantity of stock asset can use to restrict max exposure
* `--base= or -b=`: The base asset (e.g. in ETH/BTC, BTC is the base asset)
* `--stock= or -s=`: The stock asset (e.g. in ETH/BTC, ETH is the stock asset)
* `--numorders=`: How many orders do you want to place on each side. They will spread evenly according to your spread settings

The maximum amount of balance the bot will use will be whichever maximum is reached first, either the exposure % or the max amount

### How it works

It is recommended to run this bot on it's own account.

The bot will maintain a spread of a given percentage in the order book, based on the last price traded (or median price of best buy/sell if last price exceeds those boundaries).
If the bot receives a sell trade, the bot will place a new buy order below the sale price based on the spread settings.
If the bot receives a buy trade, the bot will place a new sell order above the sale price based on the spread settings.

The amount in each order is dependent on the `--baseexposure=` && `--stockexposure=` parameters. It will calculate the total {stock | base} balance * (stockexposure | baseexposure / 100).
