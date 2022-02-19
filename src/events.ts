import { EventResult, Chain, Event } from "./interfaces";

const messageBuilder = (context, event: EventResult): string => {
  const { providers } = context
  const { name, chain, attribute, data, ok, received } = event
  const { type, value } = attribute

  let chainContext = providers[chain.wsPort].name
  let isOk = ok ? '✅'  : '❌'
  let isReceived = received ? 'was received' : 'was never received'
  let hasValues = ''

  if (received && attribute) {
    if (ok) {
      hasValues = `with [${type}: ${data.toString()}]\n`
    } else {
      hasValues = `with different value - Expected: ${type}: ${value}, Received: ${type}: ${data.toString()}`
    }
  }

  return `${isOk} EVENT: (${chainContext}) | ${name} ${isReceived} ${hasValues}\n`
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
          resolve(updateEventResult(true, record, event))
        }
      })
    })

    setTimeout(() => { 
      unsubscribe()
      resolve(updateEventResult(false, undefined, event))
    }, context.eventListenerTimeout)
  })
}

const updateEventResult = (received: boolean, record, event: EventResult): EventResult => {
  event.received = received
  event.data = ''

  if (received && record) {
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
  }
  return event
}

export const eventsHandler = (context, extrinsicChain: Chain, expectedEvents: Event[], resolve) =>
  async ({ events = [], status }) => {
    let initialEventsResults: EventResult[] = eventsResultsBuilder(extrinsicChain, expectedEvents)
    let finalEventsResults: EventResult[] = []
    let remoteEventsPromises: Promise<EventResult>[] = []

    if (status.isInBlock) {
      events.forEach((record: any) => {
        const { event: { method, section }} = record

        initialEventsResults.forEach(eventResult => {
          const { name, chain } = eventResult

          if (chain === extrinsicChain && name === `${section}.${method}`) {
            finalEventsResults.push(updateEventResult(true, record, eventResult))
          }
        })
      });

      initialEventsResults.forEach(eventResult => {
        const { chain, received } = eventResult
        if (chain === extrinsicChain && !received) {
          finalEventsResults.push(updateEventResult(received, undefined, eventResult))
        } else if (chain !== extrinsicChain) {
          remoteEventsPromises.push(remoteEventLister(context, eventResult))
        }
      })

      let remoteEventsResults = await Promise.all(remoteEventsPromises)

      finalEventsResults = finalEventsResults.concat(remoteEventsResults)

      finalEventsResults = finalEventsResults.map(result => {
        let message = messageBuilder(context, result)
        return { ...result, message }
      })

      resolve(finalEventsResults)
    }
  }