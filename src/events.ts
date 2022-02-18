import { EventResult, Chain, Event } from "./interfaces";
import { buildTab } from "./utils";
import { EVENT_LISTENER_TIMEOUT } from "./config";

const remoteEventLister = (context, event: EventResult, tab: string): Promise<EventResult> => { 
  return new Promise(async resolve => {
    const { providers } = context
    const { name, local, chain, attribute } = event
    let api = providers[chain.wsPort].api

    const unsubscribe = await api.query.system.events((events) => {
      events.forEach((record) => { 
        const { event: { data, method, section, typeDef }} = record

        if (name === `${section}.${method}`) {
          resolve(updateEventResult(context, record, event, tab))
        }
      })
    })

    setTimeout(() => { 
      unsubscribe()
      resolve(event);
    }, EVENT_LISTENER_TIMEOUT)
  })
}

const updateEventResult = (context, record, event: EventResult, tab: string): EventResult => {
  const { providers } = context
  const { event: { data, typeDef }} = record
  const { name, local, chain, attribute } = event

  event.received = true
  let message = `\n${tab}✅ EVENT: (${providers[chain.wsPort].name}) | ${name} received`

  if (attribute) {
    const { type, value, isComplete, isIncomplete, isError } = attribute
    
    data.forEach((data, j) => {       
      if (type === typeDef[j].type || type === typeDef[j].lookupName) {
        if (isComplete === undefined && isIncomplete === undefined && isError === undefined) {
          if (data.toString() === value.toString()) {
            event.ok = true
            event.message = message + `with [${type}: ${value}]\n`
          } else {
            event.ok = false
            event.message = message + `with different value - Expected: ${type}: ${value}, Received: ${type}: ${data}\n`
          }
        } else {
          if (isComplete && data.isComplete) {
              event.ok = true,
              event.message = message + `received with [${type}: ${data.toString()}]\n`
          } else if (isIncomplete && data.isIncomplete) {
              event.ok = true
              event.message = message + `received with [${type}: ${data.toString()}]\n` 
          } else if (isError && data.isError) {
              event.ok = true 
              event.message = message + `received with [${type}: ${data.toString()}]\n`  
          }
        }
      }
    });
  }
  return event
}

const eventsResultsBuilder = (context, extrinsicChain: Chain, events: Event[], tab: string): EventResult[] => {
  let defaultMessage = (chain: Chain, event: Event) => {
    const { providers } = context
    return `\n${tab}❌ EVENT: (${providers[chain.wsPort].name}) | ${event.name} never reveived\n` 
  } 

  return events.map(event => {
    let chain = event.chain === extrinsicChain || !event.chain ? extrinsicChain : event.chain
    let extendedEvent: EventResult = {
      ...event,
      ...{ 
        chain,
        local: false, 
        received: false,
        ok: false,
        message: defaultMessage(chain, event)
      }, 
    }
    return extendedEvent
  })
}

export const eventsHandler = (context, extrinsicChain: Chain, expectedEvents: Event[], resolve, indent) =>
  async ({ events = [], status }) => {
    let tab = buildTab(indent)
    let initialEventsResults: EventResult[] = eventsResultsBuilder(context, extrinsicChain, expectedEvents, tab)
    let finalEventsResults: EventResult[] = []
    let remoteEventsPromises: Promise<EventResult>[] = []

    if (status.isInBlock) {
      events.forEach((record: any) => {
        const { event: { method, section }} = record

        initialEventsResults.forEach(eventResult => {
          const { name, local } = eventResult

          if (local && name === `${section}.${method}`) {
            finalEventsResults.push(updateEventResult(context, record, eventResult, tab))
          }
        })
      });

      initialEventsResults.forEach(eventResult => {
        const { local } = eventResult

        if (!local) {
          remoteEventsPromises.push(remoteEventLister(context, eventResult, tab))
        }
      })

      let remoteEventsResults = await Promise.all(remoteEventsPromises)

      resolve(finalEventsResults.concat(remoteEventsResults))
    }
  }