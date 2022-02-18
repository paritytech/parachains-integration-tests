import { EventResult, Chain, Event } from "./interfaces";
import { buildTab } from "./utils";

const messageBuilder = (context, event: EventResult, tab: string): string => {
  const { providers } = context
  const { name, chain, attribute, data } = event
  const { type, value } = attribute

  let chainContext = providers[chain.wsPort].name
  let isOk = event.ok ? '✅'  : '❌'
  let isReceived = event.received ? 'was received' : 'was never received (timeout)'
  let hasValues = ''

  if (attribute && event.ok) {
    hasValues = `with [${type}: ${data.toString()}]\n`
  } else if (attribute && !event.ok) {
    hasValues = `with different value - Expected: ${type}: ${value}, Received: ${type}: ${data.toString()}\n`
  }

  return `\n${tab}${isOk} EVENT: (${chainContext}) | ${name} ${isReceived} ${hasValues}`
} 

const eventsResultsBuilder = (extrinsicChain: Chain, events: Event[]): EventResult[] => {
  return events.map(event => {
    let chain = event.chain === extrinsicChain || !event.chain ? extrinsicChain : event.chain
    let extendedEvent: EventResult = {
      ...event,
      ...{ 
        chain,
        local: chain === extrinsicChain, 
        received: false,
        ok: false,
        message: ''
      }, 
    }
    return extendedEvent
  })
}

const remoteEventLister = (context, event: EventResult): Promise<EventResult> => { 
  return new Promise(async resolve => {
    const { providers } = context
    const { name, chain, } = event
    let api = providers[chain.wsPort].api

    const unsubscribe = await api.query.system.events((events) => {
      events.forEach((record) => { 
        const { event: { method, section }} = record

        if (name === `${section}.${method}`) {
          resolve(updateEventResult(record, event))
        }
      })
    })

    setTimeout(() => { 
      unsubscribe()
      resolve(event);
    }, context.eventListenerTimeout)
  })
}

const updateEventResult = (record, event: EventResult): EventResult => {
  event.received = true

  const { event: { data, typeDef }} = record
  const { attribute } = event

  if (attribute) {
    const { type, value, isComplete, isIncomplete, isError } = attribute
    
    data.forEach((data, j) => {       
      if (type === typeDef[j].type || type === typeDef[j].lookupName) {
        if (isComplete === undefined && isIncomplete === undefined && isError === undefined) {
          if (data.toString() === value.toString()) {
            event.ok = true
          } else {
            event.ok = false
          }
          event.data = data
        } else {
          if (isComplete && data.isComplete) {
            if (!value || (value && value == data.asComplete)) {
              event.ok = true
            } else if (value && value !== data.asComplete) {
              event.ok = false
            }
            event.data = data.asComplete
          } else if (isIncomplete && data.isIncomplete) {
            if (!value || (value && value === data.asIncomplete)) {
              event.ok = true
            } else if (value && value !== data.asIncomplete) {
              event.ok = false
            }
            event.data = data.asIncomplete
          } else if (isError && data.isError) {
            if (!value || (value && value === data.asError)) {
              event.ok = true
            } else if (value && value !== data.asError) {
              event.ok = false
            }
            event.data = data.asError
          }
        }
      }
    });
  }
  return event
}

export const eventsHandler = (context, extrinsicChain: Chain, expectedEvents: Event[], resolve, indent) =>
  async ({ events = [], status }) => {
    let tab = buildTab(indent)
    let initialEventsResults: EventResult[] = eventsResultsBuilder(extrinsicChain, expectedEvents)
    let finalEventsResults: EventResult[] = []
    let remoteEventsPromises: Promise<EventResult>[] = []

    if (status.isInBlock) {
      events.forEach((record: any) => {
        const { event: { method, section }} = record

        initialEventsResults.forEach(eventResult => {
          const { name, chain } = eventResult

          if (chain === extrinsicChain && name === `${section}.${method}`) {
            finalEventsResults.push(updateEventResult(record, eventResult))
          }
        })
      });

      initialEventsResults.forEach(eventResult => {
        const { chain } = eventResult

        if (chain !== extrinsicChain) {
          remoteEventsPromises.push(remoteEventLister(context, eventResult))
        }
      })

      let remoteEventsResults = await Promise.all(remoteEventsPromises)

      finalEventsResults = finalEventsResults.concat(remoteEventsResults)

      finalEventsResults = finalEventsResults.map(result => {
        let message = messageBuilder(context, result, tab)
        return { ...result, message }
      })

      resolve(finalEventsResults)
    }
  }