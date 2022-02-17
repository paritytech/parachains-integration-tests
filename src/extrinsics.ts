const chai = require('chai');
var should = require('chai').should()
import { Extrinsic, EventResult, Event } from "./interfaces";
import { getWallet, buildTab, parseArgs, addConsoleGroups } from "./utils";
import { queriesBuilder } from "./queries";
import { EVENT_LISTENER_TIMEOUT } from "./config";

export const checkExtrinsic = (extrinsic: Extrinsic, providers) => {
  const { chain, signer, pallet, call, args, events } = extrinsic

  if (events === undefined) {
    console.log(`\n⚠️  "events" should be defined for the following extrinsic:`, JSON.stringify(extrinsic))
    process.exit(1)
  }

  if (signer === undefined) {
    console.log(`\n⚠️  "signer" should be defined for the following extrinsic:`, JSON.stringify(extrinsic))
    process.exit(1)
  }

  if (chain === undefined) {
    console.log(`\n⚠️  "chain" should be defined for the following extrinsic:`, JSON.stringify(extrinsic))
    process.exit(1)
  } else if (providers[chain.wsPort] === undefined) {
    console.log(`\n⚠️  The chain name does not exist`)
    process.exit(1)
  }

  if (pallet === undefined || call === undefined) {
    console.log(`\n⚠️  "pallet" & "call" should be defined for the following extrinsic:`, JSON.stringify(extrinsic))
    process.exit(1)
  }

  if (args === undefined) {
    console.log(`\n⚠️  "args" should be defined for the following extrinsic:`, JSON.stringify(extrinsic))
    process.exit(1)
  }
}

export const listenToEvent = (providers, event, indent: number): Promise<EventResult> => {
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

export const extrinsicCallback = (providers, extrinsicEvents, chainContext, resolve, indent) =>
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
            remoteEventsPromises.push(listenToEvent(providers, event, indent))
          }
      });

      let remoteResults = await Promise.all(remoteEventsPromises)

      results = results.concat(remoteResults)

      resolve(results)
    }
  }


export const sendExtrinsic = async (context, extrinsic: Extrinsic, indent): Promise<any[]> => {
  return new Promise(async resolve => {
    try {
      let tab = buildTab(indent)
      let providers = context.providers
  
      checkExtrinsic(extrinsic, providers)
  
      const { chain, signer, sudo, pallet, call, args, events } = extrinsic

      let chainName = providers[chain.wsPort].name
      let api = providers[chain.wsPort].api
      let wallet = await getWallet(signer)
      let parsedArgs = parseArgs(context, args)
  
      let nonce = await api.rpc.system.accountNextIndex(wallet.address);
      
      console.log(`\n${tab}📩 EXTRINSIC: (${chainName}) | ${pallet}.${call} with ${JSON.stringify(args)}`)

      let modifiedEvents = events.map(event => {
        if (event.chain === chain || !event.chain) {
          event = {...{ local: true, received: false, chain: chain }, ...event}
        } else {
          event = {...{ local: false, received: false }, ...event}
        }
        return event
      })

      indent+=1

      let encodedCall = api.tx[pallet][call](...parsedArgs)

      if (sudo === true) {
        await api.tx.sudo.sudo(encodedCall).signAndSend(
          wallet, 
          { nonce, era: 0 },
          extrinsicCallback(providers, modifiedEvents, chainName, resolve, indent)
        );
      } else {
        await encodedCall.signAndSend(
          wallet, 
          { nonce, era: 0 },
          extrinsicCallback(providers, modifiedEvents, chainName, resolve, indent)
        );
      }

    }catch(e) {
      console.log(e)
    }
  })
}

export const extrinsicsBuilder = async (context, extrinsics: Extrinsic[], indent: number) => {
  for (const extrinsic of extrinsics) {
    let eventsResult = await sendExtrinsic(context, extrinsic, indent)

    if (extrinsic.queries) {
      await queriesBuilder(context, extrinsic.queries)
    }

    eventsResult.forEach(event => {
      console.log(event.message)
      chai.assert.equal(event.ok, true, event.message)
    })


  }
}