import { EventResult, Event } from "./interfaces";
import { buildTab } from "./utils";
import { EVENT_LISTENER_TIMEOUT } from "./config";

const eventsListener = (providers, event, indent: number): Promise<EventResult> => {
  return new Promise(async resolve => {
    let tab = buildTab(indent)

    const { chain, name, attribute } = event
    let api = providers[chain?.wsPort].api
    let chainName = providers[chain?.wsPort].name

    const unsubscribe = await api.query.system.events((events) => {
      events.forEach((record) => {
        const { event: { data, method, section, typeDef }} = record

        if (name === `${section}.${method}`) {
          if (attribute) {
            const { type, value, isComplete, isIncomplete, isError } = attribute

            data.forEach((data, index) => {
              if (type === typeDef[index].type || type === typeDef[index].lookupName) {
                if (isComplete === undefined && isIncomplete === undefined && isError === undefined) {
                  unsubscribe()

                  if (data.toString() === value.toString()) {
                    resolve({ 
                      ok: true, 
                      message: `\n${tab}✅ EVENT: (${chainName}) | ${name} received with [${type}: ${value}]\n` 
                    });
                  } else {
                    resolve({ 
                      ok: false, 
                      message: `\n${tab}❌ EVENT: (${chainName}) | ${name} received with different value - Expected: ${type}: ${value}, Received: ${type}: ${data}\n` });
                  }
                } else {
                  if (isComplete && data.isComplete) {
                    resolve({ 
                      ok: true, 
                      message: `\n${tab}✅ EVENT: (${chainName}) | ${name} received with [${type}: ${data.toString()}]\n` 
                    });
                  } else if (isIncomplete && data.isIncomplete) {
                    resolve({ 
                      ok: true, 
                      message: `\n${tab}✅ EVENT: (${chainName}) | ${name} received with [${type}: ${data.toString()}]\n` 
                    });
                  } else if (isError && data.isError) {
                    resolve({ 
                      ok: true, 
                      message: `\n${tab}✅ EVENT: (${chainName}) | ${name} received with [${type}: ${data.toString()}]\n` 
                    });    
                  }
                }  
              }
            });
          }  else {
              resolve({ ok: true, message: `\n${tab}✅ EVENT: (${chainName}) | ${name} received\n` });
            }
        }
      });
    });

    setTimeout(() => { 
        unsubscribe()
        resolve({ ok: false, message: `\n${tab}❌ EVENT: (${chainName}) | ${name} never reveived\n` });
    }, EVENT_LISTENER_TIMEOUT)
  })
}

export const eventsHandler = (providers, extrinsicEvents, chainContext, resolve, indent) =>
  async ({ events = [], status }) => {
    let tab = buildTab(indent)
    let results: EventResult[] = []

    if (status.isInBlock) {
      events.forEach((record: any) => {
        const { event: { data, method, section, typeDef }} = record

        extrinsicEvents.forEach((event, i) => {
          const { chain, name, local, attribute } = event
          let chainName = providers[chain.wsPort].name
          chainContext = chainName ? chainName : chainContext

          if (local && name === `${section}.${method}`) {
            if (attribute) {

              const { type, value, isComplete, isIncomplete, isError } = attribute
              
              data.forEach((data, j) => {       
                if (type === typeDef[j].type || type === typeDef[j].lookupName) {
                  if (isComplete === undefined && isIncomplete === undefined && isError === undefined) {
                    if (data.toString() === value.toString()) {
                      results.push({ 
                        ok: true, 
                        message: `\n${tab}✅ EVENT: (${chainContext}) | ${name} received with [${type}: ${value}]\n` 
                      });
                    } else {
                      results.push({ 
                        ok: false, 
                        message: `\n${tab}❌ EVENT: (${chainContext}) | ${name} received with different value - Expected: ${type}: ${value}, Received: ${type}: ${data}\n` 
                      });
                    }
                  } else {
                    if (isComplete && data.isComplete) {
                      results.push({ 
                        ok: true, 
                        message: `\n${tab}✅ EVENT: (${chainContext}) | ${name} received with [${type}: ${data.toString()}]\n` 
                      });
                    } else if (isIncomplete && data.isIncomplete) {
                      results.push({ 
                        ok: true, 
                        message: `\n${tab}✅ EVENT: (${chainContext}) | ${name} received with [${type}: ${data.toString()}]\n` 
                      });
                    } else if (isError && data.isError) {
                      results.push({ 
                        ok: true, 
                        message: `\n${tab}✅ EVENT: (${chainContext}) | ${name} received with [${type}: ${data.toString()}]\n` 
                      });    
                    }
                  }
                  extrinsicEvents[i].received = true
                }
              });
            } else {
              results.push({ 
                ok: true, 
                message: `\n${tab}✅ EVENT: (${chainContext}) | ${name} received\n` 
              });
              extrinsicEvents[i].received = true
            }
          }
        })
      });

      let remoteEventsPromises: Promise<EventResult>[] = []

      extrinsicEvents.forEach(event => {
          if (event.local && event.received === false) {
            results.push({ 
              ok: false, 
              message: `\n${tab}❌ EVENT: (${chainContext}) | ${event.name} never reveived\n` 
            });
          } else if (!event.local && event.received === false) {
            remoteEventsPromises.push(eventsListener
              (providers, event, indent))
          }
      });

      let remoteResults = await Promise.all(remoteEventsPromises)

      results = results.concat(remoteResults)

      resolve(results)
    }
  }