export const hasSudo = async (api) => {
  console.log("API TX --------", api.tx);
  console.log("API TX SYSTEM ----", api.tx.system);
  console.log("API TX SUDO ----", api.tx.sudo);
  console.log("HAS SUDO", api.tx.sudo === undefined);
  return await api.tx.sudo === undefined ? false : true
}