export const getBalance = async (api, address) => {
  const { data: balance } = await api.query.system.account(address);

  return balance.free
}