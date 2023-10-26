# Rarimo identity contracts

#### Test

To run the tests, execute the following command:

```bash
npm run test
```

Or to see the coverage, run:

```bash
npm run coverage
```

#### Deployment

Before deployment, you need to create an **.env** file following the example from **.env.example**

Next you need to fill in the config file `deploy/data/config.json`

The config has the following structure:

```json
{
  "validatorContractInfo": {
    "validatorAddr": "",
    "identitiesStatesUpdateTime": "3600",
    "isMtpValidator": "true"
  },
  "stateContractInfo": {
    "stateAddr": "0xD843...889",
    "stateInitParams": {
      "signer": "0xf39F...266",
      "sourceStateContract": "0xf39F...266",
      "sourceChainName": "Rarimo",
      "chainName": "Sepolia"
    },
    "isLightweight": "true"
  },
  "poseidonFacade": "0x4EE6...07B",
  "zkpQueriesStorage": "",
  "identityVerifierInfo": {
    "identityVerifierAddr": "",
    "verifierInitParams": {
      "verifiedSBTAddr": "",
      "verifiedSBTInfo": {
        "name": "testSBT",
        "symbol": "TSBT",
        "tokenURI": "test uri"
      }
    },
    "isSBTIdentityVerifier": "true"
  },
  "zkpQueries": [
    {
      "queryId": "IDENTITY_PROOF",
      "validatorAddr": "",
      "query": {
        "schema": "281137295283288650707099064285754478104",
        "claimPathKey": "16153502378554866159038850585713705546745830858436223350513476757548188765156",
        "operator": "1",
        "value": ["1"],
        "queryHash": "0",
        "circuitId": "credentialAtomicQueryMTPV2OnChain"
      }
    }
  ]
}
```

To deploy new contracts it is enough to leave the fields with addresses empty while filling in the fields with init values.
If you already have contract addresses, just fill in the corresponding fields. In this configuration, the specified contract addresses will be used during deployment

If you don't have any `zkpQuery` then just leave an empty array

To deploy, run command `npm run deploy-<network>`, where *network* is the network name from the **hardhat.config.ts** file. The list of available commands and their settings can be found in **package.json** file

#### Local deployment

To deploy the contracts locally, run the following commands (in the different terminals):

```bash
npm run private-network
npm run deploy-local
```

#### Bindings

The command to generate the bindings is as follows:

```bash
npm run generate-types
```

> See the full list of available commands in the `package.json` file.
