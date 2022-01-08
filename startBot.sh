#!/bin/bash

echo 'Enter Market Symbol (ie. DOGE/USDT)'

IFS='/'
read -ra PAIR 

echo "OK, Your stock is ${PAIR[0]} and your base is ${PAIR[1]}"

echo "What percentage spread do you want to keep between buy and sell?  2 means 2%"

read SPREAD

echo "Ok, your spread is set to ${SPREAD}%"

echo "What is the maximum percentage of your available balance of ${PAIR[0]} you want to use in total?"

read stockexposure

echo "What is the maximum percentage of your available balance of ${PAIR[1]} you want to use in total?"

read baseexposure

echo "What is the maximum amount of your available balance of ${PAIR[0]} you want to use in total?"

read stockmax

echo "What is the maximum amount of your available balance of ${PAIR[1]} you want to use in total?"

read basemax

echo "How many orders do you want to place on each side of the orderbooks?"

read numorders
echo ""
echo "------------------------"
echo "Stock: ${PAIR[0]}"
echo "Base: ${PAIR[1]}"
echo "Spread: ${SPREAD}%"
echo "Max ${PAIR[0]} Percent: ${stockexposure}%"
echo "Max ${PAIR[1]} Percent: ${baseexposure}%"
echo "Max ${PAIR[0]} Amount: $stockmax"
echo "Max ${PAIR[1]} Amount: $basemax"
echo "Orders Per Side: $numorders"
echo "------------------------"
echo ""
echo "Is This Correct? (Y/N)"

read confirm

if [ $confirm == 'Y' ]
then

	./liquidityProvider.sh --spread=${SPREAD} --baseexposure=${baseexposure} --stockexposure=${stockexposure} --basemax=${basemax} --stockmax=${stockmax} --base=${PAIR[1]} --stock=${PAIR[0]} --numorders=${numorders}
	
	sleep 1
	
	./showBots.sh
	
fi
