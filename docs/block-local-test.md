# Test the Dapp localy

```bash
cd srcs/blockchain/src/SmartContract
npm i
npx hardhat node
#in other terminal same directory
npx hardhat ignition deploy ignition/modules/GameStorage.ts --network lochalhost
#copy if is different the Contract Address to .env.test.blockchain in blockchain directory
npm run dev:block
#or npm run dev //test without smart contract
```

> There is a rule in Makefile make block-test
