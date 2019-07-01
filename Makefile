.PHONY: install
install:
	yarn install --frozen-lockfile

.PHONY: format
format:
	npx eslint --ext .ts,.js --fix .
	npx prettier --write '**/*.{js,ts}'

.PHONY: test
test:
	npx eslint --ext .ts,.js .
	npx prettier --check '**/*.{js,ts}'
	make -C modules/testrail-reporter build
	make -C modules/testrail-reporter test
