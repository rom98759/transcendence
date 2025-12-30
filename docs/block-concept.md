# Process to build and deploy a smart contract

> done with this tutorial https://hardhat.org/docs/tutorial/writing-and-testing

### Pre-requis

> Node.js 22+

### Install Hardhat (framework for local blockchain)

```bash
npm install --save-dev hardhat@3.0.16
```

### Create the directory

```bash
mkdir hardhat-tutorial
cd hardhat-tutorial
```

### Init the project

```bash
npx hardhat --init
```

> Project type: “A minimal Hardhat project”  
> current directory "."  
> dependencies yes

> Create a new file at contracts/GameStorage.sol

### Compile

```bash
npx hardhat build
```

### Test

> solidity \*.t.sol
> Create a new file at contracts/GameStorage.t.sol

### run test

```bash
npx hardhat test
```

#### Implement a assertion library forge-std for test

> test that checks the correct event is emitted when you call a function

```bash
npm add --save-dev "foundry-rs/forge-std#v1.11.0"
```

`import { Test } from "forge-std/Test.sol";`

```bash
npx hardhat test solidity
```

### Add fuzz test to test many times a function in the \*.t.sol

```solidity
 function testFuzz_Inc(uint8 x) public {
    for (uint8 i = 0; i < x; i++) {
      counter.inc();
    }
    require(counter.x() == x, "Value after calling inc x times should be x");
  }
}
```

### Plugins let you add new tasks, features, and integrations to Hardhat.

```bash
npm add --save-dev @nomicfoundation/hardhat-toolbox-viem @nomicfoundation/hardhat-ignition viem
```

### hardhat.config.ts

```solidity
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    version: "0.8.28",
  },
});
```

### add Typescript test

### run test

```bash
npx hardhat test nodejs
```

### run all test

```bash
npx hardhat test
```

### measuring coverage

```bash
npx hardhat test solidity --coverage
```

### measuring gas

```bash
npx hardhat test --gas-stats
```

### Deploying a contract

create file ignition/modules/GameStorage.ts

```solidity
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("GameStorageModule", (m) => {
  const counter = m.contract("GameStorage");

  m.call(counter, "incBy", [5n]);

  return { counter };
});
```

### Check deployement module

```bash
npx hardhat ignition deploy ignition/modules/GameStorage.ts
```

### Run local Blockchain an other terminal

```bash
npx hardhat node
```

### Deploy on localhost

```bash
npx hardhat ignition deploy ignition/modules/GameStorage.ts --network localhost
```

### Conf to deploy contract on live net work fuji

> hardhat.config.ts your wallet account private key is needed

```solidity
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    version: "0.8.28",
  },
  networks: {
    fuji: {
      type: "http",
      url: configVariable("FUJI_RPC_URL"),
      accounts: [configVariable("FUJI_PRIVATE_KEY")],
    },
  },
});
```

### Using hardhat-keystore **\***Add rule in make files

```bash
npx hardhat keystore set FUJI_RPC_URL
```

### Deploy

```bash
npx hardhat ignition deploy ignition/modules/GameStorage.ts --network fuji
```

### Verify your code

> add to hardhat.config.ts from an snowtrace API https://testnet.snowtrace.io/

```bash
npx hardhat keystore set SNOWTRACE_API_KEY
```

```solidity
verify: {
    etherscan: {
      apiKey: configVariable("SNOWTRACE_API_KEY"),
    },
  },
```

```bash
npx hardhat ignition deploy ignition/modules/GameStorage.ts --network fuji --verify
```
