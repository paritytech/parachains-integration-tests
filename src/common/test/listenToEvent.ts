import { EVENT_LISTENER_TIMEOUT } from "../../config";

export const listenToEvent = async (api, eventEval, callback = ()=>{}) => {
  let evaluator = new eventEval()
  const { name, lookupName } = evaluator

  return new Promise(async resolve => {
    console.log('Waiting for the Event...\n')

    const unsubscribe = await api.query.system.events((events) => {
      events.forEach((record) => {
        const { event: { data, method, section, typeDef }} = record
        
        if (name === `${section}.${method}`) {
          data.forEach((data, index) => {
            if (lookupName === typeDef[index].lookupName) {
              unsubscribe()
              resolve(evaluator.check(data, callback));
            }  
          });
        }
      });
    });
    
    setTimeout(() => { 
        unsubscribe()
        resolve(`FAIL-${name}-Timeout: Event never received\n`);
    }, EVENT_LISTENER_TIMEOUT)  
  });
}


