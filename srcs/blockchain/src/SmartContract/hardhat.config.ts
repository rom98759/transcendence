import { defineConfig, configVariable } from 'hardhat/config';
import hardhatIgnitionViemPlugin from '@nomicfoundation/hardhat-ignition-viem';
import { env } from '../config/env.js';

export default defineConfig({
  plugins: [hardhatIgnitionViemPlugin],
  solidity: {
    version: '0.8.28',
  },
  networks: {
    localhost: {
      url: 'http://0.0.0.0:8545',
    },
    fuji: {
      type: 'http',
      url: env.AVALANCHE_RPC_URL,
      accounts: [configVariable('BLOCKCHAIN_PRIVATE_KEY')],
    },
  },
});
