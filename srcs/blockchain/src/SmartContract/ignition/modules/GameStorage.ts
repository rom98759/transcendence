import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("GameStorageModule", (m) => {
  const gameStorage = m.contract("GameStorage", [m.getAccount(0)]);
  return { gameStorage };
});
