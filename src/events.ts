import _ from 'lodash';
import {
  EventResult,
  EventResultsObject,
  Chain,
  Event,
  EventData,
  XcmOutcome,
} from './interfaces';
import {
  addConsoleGroupEnd,
  adaptUnit,
  withinRange,
  withinThreshold,
  parseRange,
  updateLastBlocks,
  findObject,
  parseArgs,
} from './utils';

const MATCH = 2;
const BASIC_MATCH = 1;
const NO_MATCH = 0;

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
      let resultJson = JSON.stringify(parseArgs(context, result));
      let recordJson = JSON.stringify(record);
      let isExpectedResult = isExpectedEventResult(context, event);

      if (isExpectedResult) {
        resultMessage = `\n\n   ✔️  Expected Result: ${resultJson}`;
      } else {
        resultMessage = `\n\n   ✖️  Expected Result: ${resultJson} | Received Result: ${recordJson}`;
        resultMessage += event.threshold
          ? `\n\t-> NOT WITHIN THRESHOLD [${JSON.stringify(event.threshold)}]`
          : '';
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
                  threshold
                    ? `\n\t-> NOT WITHIN THRESHOLD [${JSON.stringify(
                        threshold
                      )}]`
                    : ''
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

const isStrict = (event: Event): boolean => {
  if (event.strict == undefined && event.threshold != undefined) {
    return false;
  }
  return event.strict;
};

const eventsResultsBuilder = (
  extrinsicChain: Chain,
  events: Event[]
): { [key: string]: EventResultsObject } => {
  let eventsResultsObject: { [key: string]: EventResultsObject } = {};

  events.map((event) => {
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
        strict: isStrict(event),
        matchLevel: NO_MATCH,
      },
    };
    if (!eventsResultsObject[chain.wsPort]) {
      eventsResultsObject[chain.wsPort] = {};
    }
    if (!eventsResultsObject[chain.wsPort][extendedEvent.name]) {
      eventsResultsObject[chain.wsPort][extendedEvent.name] = [];
    }
    eventsResultsObject[chain.wsPort][extendedEvent.name].push(extendedEvent);
  });
  return eventsResultsObject;
};

const eventListener = (
  context,
  wsPort: string,
  expectedEvents: EventResultsObject,
  timeout?: number
): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    let unsubscribe;

    try {
      const { providers } = context;
      let api = providers[wsPort].api;
      let lastBlock = providers[wsPort].lastBlock;

      unsubscribe = await api.rpc.chain.subscribeNewHeads(async (header) => {
        let CurrentBlock = header.number.toHuman().replace(/,/g, '');

        if (BigInt(CurrentBlock) > BigInt(lastBlock)) {
          const blockHash = await api.rpc.chain.getBlockHash(header.number);
          const at = await api.at(blockHash);
          const queriedEvents = await at.query.system.events();

          queriedEvents.forEach((record) => {
            const {
              event: { method, section },
            } = record;

            let expectedEvent = expectedEvents[`${section}.${method}`]

            if (expectedEvent) {
                let filteredEvents = expectedEvent.filter(event => event.matchLevel < MATCH)

                if (filteredEvents.length > 0) {
                  let bestMatch: EventResult = findTheBestExpectedEvent(
                    context,
                    record,
                    filteredEvents
                  )
                  updateEventResult(true, record, bestMatch)
                }
            }
          });

          if (Object.values(expectedEvents).flat().every(event => event.received)) {
            resolve();
          }
        }
      });

      setTimeout(
        () => {
          unsubscribe();
          resolve()
        },
        timeout ? timeout : context.eventListenerTimeout
      );
    } catch (e) {
      addConsoleGroupEnd(2);
      reject(e);
    }
  });
};

const assessEvent = (event: EventResult): number => {
  const { attributes, data } = event;
  let totalMatches = 0;

  if (attributes) {
    attributes.forEach((attribute, i) => {
      try {
        const { value, isRange, threshold, xcmOutcome } = attribute;

        if (xcmOutcome && xcmOutcome === data[i].xcmOutcome) {
          totalMatches++;
        }
        if (
          value &&
          data[i] &&
          isExpectedEventAttribute(value, data[i].value, isRange, threshold)
        ) {
          totalMatches++;
        }
      } catch (e) {
        console.log(e);
        return 0;
      }
    });
    return totalMatches / attributes.length;
  } else {
    return totalMatches;
  }
};

const findTheBestExpectedEvent = (
  context,
  record,
  events: EventResult[]
): EventResult => {
  let bestMatch: EventResult;

  events.forEach((event) => {
    // Match only on name when no result/attributes specified
    if (_.isNil(event.result) && _.isNil(event.attributes)) {
      event.matchLevel = BASIC_MATCH;
      return event;
    }

    // Clone event result and apply actual event (record) to determine match
    let clone = _.cloneDeep(event);
    updateEventResult(true, record, clone);
    const { attributes, result } = clone;

    // Check whether event is expected based on result/attributes
    if (result) {
      if (isExpectedEventResult(context, clone)) {
        event.matchLevel = MATCH;
      } else if (attributes) {
        event.matchLevel = assessEvent(clone);
      }
    }
  })

  bestMatch = events.reduce((max, obj) => {
    return obj.matchLevel >= max.matchLevel ? obj : max;
  }, events[0]);

  return bestMatch;
};

const nonStrictMatch = (result: any, record: any): boolean => {
  if (
    Array.isArray(record) &&
    Array.isArray(result) &&
    record.length !== result.length
  ) {
    let matchesNum = 0;
    for (let recordItem of record) {
      for (let resultItem of result) {
        if (_.isMatch(recordItem, adaptUnit(resultItem))) {
          matchesNum += 1;
        }
      }
    }
    return matchesNum === result.length;
  } else {
    return _.isMatch(record, adaptUnit(result));
  }
};

const isExpectedEventResult = (context, event: EventResult): boolean => {
  const { result, record, strict, threshold } = event;

  if (result) {
    const parsedResult = parseArgs(context, result);
    if (strict) {
      return _.isEqual(record, adaptUnit(parsedResult));
    } else if (threshold) {
      let within = withinThreshold(parsedResult, record, threshold);

      if (!within) {
        return within;
      } else {
        for (const key in threshold) {
          let recordObject = findObject(record, key);
          let resultObject = findObject(parsedResult, key);
          resultObject[key] = recordObject[key];
        }
        event.threshold = undefined;
        return nonStrictMatch(parsedResult, record);
      }
    } else {
      return nonStrictMatch(parsedResult, record);
    }
  }

  return false;
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

  if (
    typeDef.lookupName === 'XcmV2TraitsOutcome' ||
    typeDef.lookupName === 'XcmV3TraitsOutcome'
  ) {
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
) => {
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
};

export const eventListenerBuilder = async (
  context,
  extrinsicChain: Chain,
  expectedEvents: Event[],
  resolve,
  reject,
  timeout?: number,
) => {
  try {
    let initialEventsResults: { [key: string]: EventResultsObject } = eventsResultsBuilder(
      extrinsicChain,
      expectedEvents
    );
    let eventsPromises: Promise<void>[] = [];

    Object.entries(initialEventsResults).forEach(([wsPort, events]) => {
      eventsPromises.push(eventListener(context, wsPort, events, timeout))
    })

    await Promise.all(eventsPromises);

    let finalEventsResults: EventResult[] = Object.values(initialEventsResults).flat().map(item => Object.values(item).flat()).flat()

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
};

export const eventsHandler =
  (context, extrinsicChain: Chain, expectedEvents: Event[], resolve, reject, timeout?: number) =>
  async ({ events = [], status }) => {
    if (status.isReady) {
      await eventListenerBuilder(
        context,
        extrinsicChain,
        expectedEvents,
        resolve,
        reject,
        timeout
      );
    }
  };
