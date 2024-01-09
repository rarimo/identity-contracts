FROM node:16-alpine
RUN apk add --no-cache make gcc g++ python3

WORKDIR /identity-contracts

COPY docker/package.json ./
COPY docker/package-lock.json ./
COPY docker/hardhat.config.ts ./

COPY contracts ./
COPY deploy ./

RUN npm install

ENTRYPOINT ["npm", "run"]
