import _ from 'lodash';
import { EventResult, Chain, Event, EventData, XcmOutcome } from './interfaces';
import {
  addConsoleGroupEnd,
  adaptUnit,
  withinRange,
  withinThreshold,
  parseRange,
  updateLastBlocks,
} from './utils';

const messageBuilder = (context, event: EventResult): string => {
  const { providers } = context;
  const { name, chain, attributes, data, received, result, record } = event;

  let chainContext = providers[chain.wsPort].name;
  let isReceived = received ? 'was received' : 'was never received';
  let resultMessage = '';
  let hasValues = '';
  let xcmOutcomeMessage = '';

  if (received) {
    if (result) {
      let resultJson = JSON.stringify(result);
      let recordJson = JSON.stringify(record);
      let isExpectedResult = isExpectedEventResult(event);

      if (isExpectedResult) {
        resultMessage = `\n\n   ✔️  Expected Result: ${resultJson}`;
      } else {
        resultMessage = `\n\n   ✖️  Expected Result: ${resultJson} | Received Result: ${recordJson}`;
      }
      event.ok &&= isExpectedResult;
    }

    if (attributes) {
      attributes.forEach((attribute, i) => {
        try {
          const { type, key, value, isRange, threshold, xcmOutcome } =
            attribute;

          if (xcmOutcome) {
            let symbol = {
              [XcmOutcome.Complete]: '🟢',
              [XcmOutcome.Incomplete]: '🟠',
              [XcmOutcome.Error]: '🔴',
              undefined: '',
            };

            if (xcmOutcome === data[i].xcmOutcome) {
              xcmOutcomeMessage = `\n\n   ✔️  Expected XCM outcome: ${symbol[xcmOutcome]} ${xcmOutcome}`;
            } else {
              let dataXcmOutcome = data[i].xcmOutcome
                ? data[i].xcmOutcome
                : 'undefined';

              if (dataXcmOutcome) {
                xcmOutcomeMessage = `\n\n   ✖️  Expected XCM outcome: ${symbol[xcmOutcome]} ${xcmOutcome} | Received XCM outcome: ${symbol[dataXcmOutcome]} ${data[i].xcmOutcome}`;
              }
              event.ok &&= false;
            }
          }

          if (value) {
            let keyValue = key ? `${key}:` : '';
            let typeValue = type ? `${type}` : '';
            let gap = key && type ? ' ' : '';
            let valueJson = JSON.stringify(value);

            if (!data[i]) {
              hasValues += `\n\n   ✖️  Expected Attribute: '${keyValue}${gap}${typeValue}' : ${valueJson} was never received\n`;
              event.ok &&= false;
            } else {
              let dataJson = JSON.stringify(data[i].value);
              let attributeOk = isExpectedEventAttribute(
                value,
                data[i].value,
                isRange,
                threshold
              );
              event.ok &&= attributeOk;

              if (attributeOk) {
                hasValues += `\n\n   ✔️  Expected Attribute: '${keyValue}${gap}${typeValue}' : ${dataJson}\n`;
              } else {
                let expected = `Expected Attribute: '${keyValue}${gap}${typeValue}' : ${valueJson}`;
                let received = `Received Attribute: '${keyValue}${gap}${typeValue}' : ${dataJson}`;
                let rangeMsg = `${isRange ? '-> NOT WITHIN RANGE' : ''}`;
                let thresholdMsg = `${
                  threshold ? `-> NOT WITHIN THRESHOLD [${threshold}]` : ''
                }`;
                hasValues += `\n\n   ✖️  ${expected} | ${received} ${rangeMsg}${thresholdMsg}`;
              }
            }
          }
        } catch (e) {
          console.log(e);
        }
      });
    }
  } else {
    event.ok = false;
  }

  let isOk = event.ok ? '✅' : '❌';

  return `${isOk} EVENT: (${chainContext}) '${name}' ${isReceived}${resultMessage}${xcmOutcomeMessage}${hasValues}\n`;
};

const eventsResultsBuilder = (
  extrinsicChain: Chain,
  events: Event[]
): EventResult[] => {
  return events.map((event) => {
    let chain = event.chain ? event.chain : extrinsicChain;
    let extendedEvent: EventResult = {
      ...event,
      ...{
        chain,
        remote: event.remote ? event.remote : !_.isEqual(chain, extrinsicChain),
        received: false,
        ok: true,
        data: [],
        message: '',
        strict: event.strict == undefined ? true : event.strict,
      },
    };
    return extendedEvent;
  });
};

const eventLister = (context, event: EventResult): Promise<EventResult> => {
  return new Promise(async (resolve, reject) => {
    let unsubscribe;

    try {
      const { providers } = context;
      const { name, chain, timeout } = event;
      let api = providers[chain.wsPort].api;
      let lastBlock = providers[chain.wsPort].lastBlock;

      unsubscribe = await api.rpc.chain.subscribeNewHeads(async (header) => {
        let CurrentBlock = header.number.toHuman().replace(/,/g, '');

        if (BigInt(CurrentBlock) > BigInt(lastBlock)) {
          const blockHash = await api.rpc.chain.getBlockHash(header.number);
          const at = await api.at(blockHash);
          const events = await at.query.system.events();

          events.forEach((record) => {
            const {
              event: { method, section },
            } = record;

            if (name === `${section}.${method}`) {
              resolve(updateEventResult(true, record, event));
              unsubscribe();
            }
          });
        }
      });

      setTimeout(
        () => {
          unsubscribe();
          if (!event.received) {
            resolve(updateEventResult(false, undefined, event));
          }
        },
        timeout ? timeout : context.eventListenerTimeout
      );
    } catch (e) {
      unsubscribe();
      addConsoleGroupEnd(2);
      reject(e);
    }
  });
};

const isExpectedEventResult = (event: EventResult): boolean => {
  const { result, record, strict } = event;

  if (strict) {
    return _.isEqual(record, result);
  } else {
    return _.isMatch(record, result);
  }
};

const isExpectedEventAttribute = (
  value: string | number,
  data: string,
  isRange: boolean | undefined,
  threshold: [number, number] | undefined
): boolean => {
  if (isRange && typeof value === 'string') {
    return withinRange(value, data);
  } else if (threshold) {
    return withinThreshold(value, data, threshold);
  } else {
    if (parseRange(value.toString()).valid) {
      console.log(
        `⚠️  WARNING: Range format identified for '${value}' | Did you forget to set 'isRange: true' ?\n`
      );
    }
    return _.isEqual(adaptUnit(value), data);
  }
};

const eventDataBuilder = (data: any, typeDef: any, key: string): EventData => {
  let eventData: EventData = {
    type: typeDef.type,
    lookupName: typeDef.lookupName,
    key: key,
    value: data,
  };

  if (typeDef.lookupName === 'XcmV2TraitsOutcome') {
    if (data['Complete']) {
      eventData.xcmOutcome = XcmOutcome.Complete;
      eventData.value = data['Complete'];
    } else if (data['Incomplete']) {
      eventData.xcmOutcome = XcmOutcome.Incomplete;
      eventData.value = data['Incomplete'];
    } else if (data['Error']) {
      eventData.xcmOutcome = XcmOutcome.Error;
      eventData.value = data['Error'];
    }
  }

  return eventData;
};

const updateEventResult = (
  received: boolean,
  record,
  event: EventResult
): EventResult => {
  event.received = received;

  if (received && record) {
    const {
      event: { data, typeDef },
    } = record;
    const { attributes, result } = event;

    if (attributes) {
      let keys: string[] = [];
      let dataHuman = data.toHuman();

      if (
        typeof dataHuman === 'object' &&
        !Array.isArray(dataHuman) &&
        dataHuman !== null
      ) {
        keys = Object.keys(dataHuman);
      }

      data.forEach((dataItem, i) => {
        let dataEvent = eventDataBuilder(
          dataItem.toHuman(),
          typeDef[i],
          keys[i]
        );

        for (let j = 0; j < attributes.length; j++) {
          const { type, key } = attributes[j];

          let sameType =
            type === dataEvent.type || type === dataEvent.lookupName;

          let sameKey = key === dataEvent.key;

          if ((!key && sameType) || (key && sameKey && sameType)) {
            event.data[j] = dataEvent;
            break;
          }
        }
      });
    }

    if (result) {
      event.record = data.toHuman();
    }
  }
  return event;
};

export const eventsHandler =
  (context, extrinsicChain: Chain, expectedEvents: Event[], resolve, reject) =>
  async ({ events = [], status }) => {
    if (status.isReady) {
      try {
        let initialEventsResults: EventResult[] = eventsResultsBuilder(
          extrinsicChain,
          expectedEvents
        );
        let finalEventsResults: EventResult[] = [];
        let eventsPromises: Promise<EventResult>[] = [];

        initialEventsResults.forEach((eventResult) => {
          eventsPromises.push(eventLister(context, eventResult));
        });

        let events = await Promise.all(eventsPromises);

        for (let event of events) {
          finalEventsResults.push(event);
        }

        initialEventsResults.forEach((eventResult) => {
          const { received } = eventResult;
          if (!received) {
            finalEventsResults.push(
              updateEventResult(received, undefined, eventResult)
            );
          }
        });

        finalEventsResults = finalEventsResults.map((result) => {
          let message = messageBuilder(context, result);
          return { ...result, message };
        });

        await updateLastBlocks(context);
        resolve(finalEventsResults);
        return;
      } catch (e) {
        await updateLastBlocks(context);
        addConsoleGroupEnd(2);
        reject(e);
      }
    }
  };
