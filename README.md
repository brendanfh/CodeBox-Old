# CodeBox

Codebox is a platform made for hosting programming competitions.

### Prequisites
Before getting started, we must install some dependencies. Here is a list of all the dependencies CodeBox needs:
* Running on Linux system
	* Tested on Debian and Ubuntu systems
* NodeJS v8 or greater
* GCC (for running C programs)
* G++ (for running C++ programs)
* Python 3 (etc...)
* Go 1.10
* Make, for running build scripts
* Yarn, to install dependencies

### Getting started
To get started, clone the repo:
> git clone https://github.com/brendanfh/CodeBox

Then, from inside the new directory, install dependencies with yarn:
> cd CodeBox && yarn

### Setting up a competition
Everything about a competition is stored in a single folder, that has a structure like this:
	competition/
		problems/  --Stores all the problem information
			problem_name1/
				description.md --The description of the problem, as it will be displayed to competitors
				problem.json --Problem configuration
				test-1.in  --Input for test 1
				test-1.out --Output for test 1
				...
				test-n.in  --Input for test n
				test-n.out --Output for test n
			problem_name2/
			problem_name3/
			...

		temp/ --Empty folder that temporary files will be stored

		cbdb.sqlite --Sqlite3 database

		config.json --Configuration for the competition (see below)

Most of the magic happens in the *config.json*. An exmaple *config.json* is something like this:
	{
	    "hosting_name": "NAME OF HOSTING LOCATION",

	    "email_verify_regex": ".+@example\\.com$",

	    "forgot_password_email": "someone@something.com",
	    "forgot_password_email_password": "Password1!",

	    "port": 80,
	    "ssl_port": 443,

	    "ssl_cert": "/path/to/ssl.crt",
	    "ssl_key": "/path/to/ssl.key",

	    "start_time": "2018-09-22T10:00:00-05:00", //UTC timestamp for start and end
	    "end_time": "2018-09-22T15:00:00-05:00",
	    "problems": {
	    	"A": "folder_name1", // Maps problem letters to folder names in competition folder
	    	"B": "folder_name2",
	    	...
	    }
	}

### Starting the competition
We can start the competition by doing the following.
1. We open a terminal and set the *ROOT_DIR* environment variable to our competition folder.
	export ROOT_DIR=/path/to/competition/folder
2. We then run the webserver using *make*.
	make server
3. This starts our web server, but at the moment, any submissions will not be run. To fix that, we open another terminal and set the *ROOT_DIR* to the same as we did before. Then we run the executer with the following *make* command.
	make executer
4. The server and executer will automatically link together. You have started your own competition!