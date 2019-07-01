.PHONY: build
build:
	npx tsc --project .

.PHONY: dev
dev:
	npx tsc --project . --watch

.PHONY: test
test:
	TERM=dumb TESTRAIL_REPORTER_TEST=true TESTRAIL_REPORTER_MOCK_SERVER_PORT=50009 npx jest
