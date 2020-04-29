default: build

CMD := ""

VERSION := node:12
NODE := docker run -it --rm \
		--user $(id -u):$(id -g) \
		-v `pwd`/.npmrc:/root/.npmrc \
		-v `pwd`:/usr/src/app \
		-w /usr/src/app

TERRAFORM := docker run -i -t \
		-v `pwd`/terraform:/app/ \
		--user $(id -u):$(id -g) \
		-w /app hashicorp/terraform:0.12.13

.PHONY: testy
testy:
	$(NODE) $(VERSION) bash

.PHONY: build
build:
	$(NODE) $(VERSION) npm run build

.PHONY: publish
publish:
	$(NODE) $(VERSION) npm publish

.PHONY: install
install:
	$(NODE) $(VERSION) npm install $(CMD)

.PHONY: update
update:
	$(NODE) $(VERSION) npm update

.PHONY: audit-fix
audit-fix:
	$(NODE) $(VERSION) npm audit fix

.PHONY: lint-fix
lint-fix:
	$(NODE) $(VERSION) npm run lint:fix

.PHONY: lint
lint:
	$(NODE) $(VERSION) npm run lint

.PHONY: test
test:
	$(NODE) $(VERSION) npm test
