import { expect } from 'chai';
import _ from 'lodash'
import { EventResult, Chain, Event, Attribute } from "./interfaces";

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
        xcmOutcome = `, as ${expected}`
      } else {
        xcmOutcome = `, with different status - ( Expected: '${expected}', Received: '${real} )'`
      }
    }
    

    if (ok) {
      hasValues = `, with: '${type}': ${JSON.stringify(data)}\n`
    } else {
      hasValues = `, with different value - ( Expected: '${type}': ${JSON.stringify(value)}, Received: '${type}': ${JSON.stringify(data)} )`
    }
  }
  return `${isOk} EVENT: (${chainContext}) '${name}' ${isReceived}${xcmOutcome}${hasValues}\n`
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
        message: '',
        xcmOutput: { expected: undefined, real: undefined }
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

    if (!value || ((value && _.isEqual(value, typeData) && event.xcmOutput.expected === event.xcmOutput.real))) {
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
            if (data.toHuman() === value) {
              event.ok = true
            } else {
              event.ok = false
            }
            event.data = data.toHuman()
          } else {
            buildXcmOutput(data, event)
            // if (isComplete) {
            //   event.xcmOutput.expected ='Complete'

            //   if (data.isComplete) {
            //     let asComplete = data.asComplete.toHuman()

            //     if (!value || (value && _.isEqual(value, asComplete))) {
            //       event.ok = true
            //     }
            //     event.data = asComplete
            //     event.xcmOutput.real = 'Complete'
            //   }  
            // } else if (isIncomplete) {
            //   event.xcmOutput.expected = 'Incomplete'

            //   if(data.isIncomplete) {
            //     let asIncomplete = data.asIncomplete.toHuman()

            //     if (!value || (value && _.isEqual(value, asIncomplete))) {
            //       event.ok = true
            //     }
            //     event.data = asIncomplete
            //     event.xcmOutput.real = 'Incomplete'
            //   }  
            // } else if (isError) {
            //   event.xcmOutput.expected = 'Error'

            //   if (data.isError) {
            //     let asError = data.asError.toHuman()

            //     if (!value || (value && _.isEqual(value, asError))) {
            //       event.ok = true
            //     }
            //     event.data = asError
            //   }
            // }

          }
        }
      });
    } else {
      event.ok = true
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