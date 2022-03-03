import _ from 'lodash'
import { EventResult, Chain, Event, Attribute } from "./interfaces";
import { addConsoleGroupEnd } from './utils'

export const checkEvent = (event: Event) => {
  const { chain, name, attribute } = event

  if (name == undefined) {
    console.log(`\n⛔ ERROR: 'name' should be present for the following event:`, JSON.stringify(event, null, 2))
    process.exit(1)
  }

  if (attribute) {
    const { type } = attribute

    if (type == undefined) {
      console.log(`\n⛔ ERROR: 'type' should be present for the 'attribute' of the following event:`, JSON.stringify(event, null, 2))
      process.exit(1)
    }
  }
}

const messageBuilder = (context, event: EventResult): string => {
  const { providers } = context
  const { name, chain, attribute, data, ok, received, xcmOutput } = event

  let chainContext = providers[chain.wsPort].name
  let isOk = ok ? '✅'  : '❌'
  let isReceived = received ? 'was received' : 'was never received'
  let hasValues = ''
  let xcmOutcome = ''
  if (received && attribute) {
    const { type, value } = attribute
    
    if (type === 'XcmV2TraitsOutcome') {
      const { expected, real } = xcmOutput

      if (real === expected) {
        xcmOutcome = `, '${expected}'`
      } else {
        xcmOutcome = `, with different status ( Expected: '${expected}', Received: '${real}' )`
      }
    }
    
    if (value) {
      if (ok) {
        hasValues = `, with: '${type}': ${JSON.stringify(data)}\n`
      } else {
        hasValues = `, with different value ( Expected: '${type}': ${JSON.stringify(value)}, Received: '${type}': ${JSON.stringify(data)} )`
      }
    }
  }
  return `${isOk} EVENT: (${chainContext}) '${name}' ${isReceived}${xcmOutcome}${hasValues}\n`
} 

const eventsResultsBuilder = (extrinsicChain: Chain, events: Event[]): EventResult[] => {
  return events.map(event => {
    let chain = event.chain ? event.chain : extrinsicChain
    let extendedEvent: EventResult = {
      ...event,
      ...{ 
        chain,
        remote: event.remote ? event.remote : !_.isEqual(chain, extrinsicChain), 
        received: false,
        ok: false,
        message: '',
        xcmOutput: { expected: undefined, real: undefined },
      }, 
    }
    return extendedEvent
  })
}

const remoteEventLister = (context, event: EventResult): Promise<EventResult> => {
  return new Promise(async (resolve, reject) => {
    try {
      const { providers } = context
      const { name, chain, timeout } = event
      let api = providers[chain.wsPort].api
  
      const unsubscribe = await api.query.system.events((events) => {
        events.forEach((record) => { 
          const { event: { method, section, data, typeDef }} = record
  
          if (name === `${section}.${method}`) {
            unsubscribe()
            resolve(updateEventResult(true, record, event))
          }
        })
      })

      setTimeout(() => {
        unsubscribe()
        if (!event.received) {
          resolve(updateEventResult(false, undefined, event))
        }
      }, timeout ? timeout : context.eventListenerTimeout)
    } catch(e) {
      addConsoleGroupEnd(2)
      reject(e)
    }
  })
}

const buildXcmOutput = (data, event: EventResult) => {
  const { attribute } = event
  
  if (attribute) {
    const { value, isComplete, isIncomplete, isError } = attribute

    const xcmOutputTypes = [
      { type: isComplete, is: 'isComplete', as: 'asComplete', status: '🟢 Complete'  },
      { type: isIncomplete, is: 'isIncomplete', as: 'asIncomplete', status: '🟠 Incomplete' },
      { type: isError, is: 'isError', as: 'asError', status: '🔴 Error' }
    ]

    let typeData
  
    for (let xcmOutput of xcmOutputTypes) {
      const { type, is, as, status } = xcmOutput
      if (type) {
        event.xcmOutput.expected = status
      }

      if (data[is]) {
        typeData = data[as].toHuman()
        event.data = typeData
        event.xcmOutput.real = status
      }
    }

    if (!value || (value && _.isEqual(value, typeData) && event.xcmOutput.expected === event.xcmOutput.real)) {
      event.ok = true
    }
  }
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
            if (_.isEqual(value, data.toHuman())) {
              event.ok = true
            } else {
              event.ok = false
            }
            event.data = data.toHuman()
          } else {
            buildXcmOutput(data, event)
          }
        }
      });
    } else {
      event.ok = true
    }
  }
  return event
}

export const eventsHandler = (context, extrinsicChain: Chain, expectedEvents: Event[], resolve, reject) =>
  async ({ events = [], status }) => {
    try {
      let providers = context.providers

      for (let expectedEvent of expectedEvents) {
        checkEvent(expectedEvent)
      }

      let initialEventsResults: EventResult[] = eventsResultsBuilder(extrinsicChain, expectedEvents)
      let finalEventsResults: EventResult[] = []
      let remoteEventsPromises: Promise<EventResult>[] = []
  
      if (status.isInBlock) {
        events.forEach((record: any) => {
          const { event: { method, section }} = record
          initialEventsResults.forEach(eventResult => {
            const { name, remote } = eventResult
  
            if (!remote && name === `${section}.${method}`) {
              finalEventsResults.push(updateEventResult(true, record, eventResult))
            }
          })
        });

        initialEventsResults.forEach(eventResult => {
          const { remote, received } = eventResult
          if (!remote && !received) {
            finalEventsResults.push(updateEventResult(received, undefined, eventResult))
          } else if (remote) {
            remoteEventsPromises.push(remoteEventLister(context, eventResult))
          }
        })
  
        for (let remoteEventsPromise of remoteEventsPromises) {
          finalEventsResults.push(await remoteEventsPromise)
        }
  
        finalEventsResults = finalEventsResults.map(result => {
          let message = messageBuilder(context, result)
          return { ...result, message }
        })
  
        resolve(finalEventsResults)
        return
      }
    } catch (e) {
      addConsoleGroupEnd(2)
      reject(e)
    }
  }