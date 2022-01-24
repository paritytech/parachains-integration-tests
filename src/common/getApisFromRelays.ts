export const getApisFromRelays = (relayChains) => {

  const {
    source: {
      chain: { api: sourceApi }
    },
    target: {
      chain: { api: targetApi }
    }
  } = relayChains

  return { sourceApi, targetApi }
}