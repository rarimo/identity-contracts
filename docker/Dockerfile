FROM node:16-alpine
RUN apk add --no-cache make gcc g++ python3

WORKDIR /identity-contracts

COPY docker/*.json docker/hardhat.config.ts tsconfig.json ./
COPY contracts ./contracts
COPY deploy ./deploy

RUN npm install

ENTRYPOINT ["npm", "run"]
