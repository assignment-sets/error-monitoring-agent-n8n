# Variables
LOG_FILE=app.log
APP_DIR=nodeApp

.PHONY: dev clean

# Go into nodeApp, run npm, and pipe to the log file in the parent directory
dev:
	cd $(APP_DIR) && npm start 2>&1 | tee -a ../$(LOG_FILE)

# Clear the log file at the root
clean:
	> $(LOG_FILE)