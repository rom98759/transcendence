import { defineConfig, configVariable } from 'hardhat/config';
import hardhatIgnitionViemPlugin from '@nomicfoundation/hardhat-ignition-viem';
import hardhatKeystore from '@nomicfoundation/hardhat-keystore';

export default defineConfig({
  plugins: [hardhatIgnitionViemPlugin, hardhatKeystore],
  solidity: {
    version: '0.8.28',
  },
  networks: {
    localhost: {
      url: 'http://0.0.0.0:8545',
    },
    fuji: {
      type: 'http',
      url: configVariable('FUJI_RPC_URL'),
      accounts: [configVariable('FUJI_PRIVATE_KEY')],
    },
  },
});
