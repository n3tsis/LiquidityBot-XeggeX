#!/bin/bash
if  ! [ -x "$(command -v node)" ]; then
	curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
	apt-get install -y nodejs
	npm install
	mkdir pidfiles
	mkdir logs
	echo -e "--------------------------------------------------------------------------------------"
	printf "\n\n    Successfully installed!\n    See README file for run instructions \n\n"
else
	npm install
	mkdir pidfiles
	mkdir logs
	echo -e "--------------------------------------------------------------------------------------"
	printf "\n\n    Successfully installed!\n    See README file for run instructions \n\n"
fi

