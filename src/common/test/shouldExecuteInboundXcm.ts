import { listenToEvent } from "./index";

export const shouldExecuteInboundXcm = async (api, eventEval): Promise<{ type: any, result: any }> => {
  return new Promise(async resolve => {
    let result = await listenToEvent(api, eventEval)
    console.log(result)
    resolve({type: 'inbound', result })
  })
}
