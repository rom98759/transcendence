import { defineConfig } from "hardhat/config";
import hardhatIgnitionViemPlugin from "@nomicfoundation/hardhat-ignition-viem";


export default defineConfig({
  plugins: [hardhatIgnitionViemPlugin],
  solidity: {
    version: "0.8.28",
  },
  networks: {
    localhost: {
      url: "http://0.0.0.0:8545"
    }
  },
});
