require('dotenv').config();
import { getTestFiles, addConsoleGroup, addConsoleGroupEnd } from './utils'
import YAML, { isCollection, Range, isMap, isScalar, YAMLMap, LineCounter, Parser, Pair, isAlias, isSeq, isPair } from 'yaml';
import { stringify, YAMLSeq, Scalar } from 'yaml'
import { CheckerError, TestFile, XcmOutcome } from './interfaces';
import { KeyObject } from 'crypto';
import { isAnyArrayBuffer } from 'util/types';

const formatLine = (start, end?): string => {
  const { line: lineStart, col: colStart } = start;
  let errorEnd;

  if (end) {
    const { line: lineEnd, col: colEnd } = end;
    errorEnd = `\x1b[33mline ${lineEnd}:${colEnd}\x1b[0m: `;
  }

  let errorStart = `\x1b[33mline ${lineStart}:${colStart}\x1b[0m`;

  return `${errorStart}${errorEnd ? ` \x1b[33m-\x1b[0m ${errorEnd}` : ': '}`
}

interface Interface {
  instance?: any;
  type?: string,
  anyKey?: boolean,
  attributes?: { [key: string]: boolean };
  rule?: object;
}

const INTERFACE: { [key: string]: Interface } = {
  tests: {
    instance: YAMLSeq,
    attributes: {
      name: true,
      its: false,
      before: false,
      beforeEach: false,
      after: false,
      afterEach: false,
      describes: false
    },
  },
  describes: {
    instance: YAMLSeq,
    attributes: {
      name: true,
      its: false,
      before: false,
      beforeEach: false,
      after: false,
      afterEach: false,
      describes: false
    },
  },
  name: {
    type: 'string'
  },
  its: {
    instance: YAMLSeq,
    attributes: {
      name: true,
      actions: true
    }
  },
  actions: {
    instance: YAMLSeq,
    attributes: {
      extrinsics: false,
      customs: false,
      asserts: false,
      queries: false,
      rpcs: false
    }
  },
  extrinsics: {
    instance: YAMLSeq,
    attributes: {
      chain: true,
      signer: true,
      pallet: true,
      call: true,
      args: true,
      sudo: false,
      encode: false,
      delay: false,
      events: false
    }
  },
  chain: {
    instance: YAMLMap,
    attributes: {
      wsPort: true,
      ws: false,
      paraId: false,
    }
  },
  wsPort: {
    type: 'number'
  },
  ws: {
    type: 'string'
  },
  paraId: {
    type: 'number'
  },
  pallet: {
    type: 'string'
  },
  call: {
    type: 'string'
  },
  sudo: {
    type: 'boolean'
  },
  encode: {
    type: 'boolean'
  },
  signer: {
    type: 'string'
  },
  delay: {
    type: 'number'
  },
  events: {
    instance: YAMLSeq,
    attributes: {
      chain: true,
      name: true,
      remote: false,
      timeout: false,
      result: false,
      strict: false,
      attributes: false
    }
  },
  remote: {
    type: 'boolean'
  },
  timeout: {
    type: 'number'
  },
  result: {
    type: 'object'
  },
  strict: {
    type: 'boolean'
  },
  attributes: {
    instance: YAMLSeq,
    attributes: {
      type: false,
      key: false,
      isRange: false,
      threshold: false,
      value: false,
      xcmOutcome: false,
    },
    rule: {
      or: ['type', 'key']
    }
  },
  type: {
    type: 'string'
  },
  key: {
    type: 'string'
  },
  isRange: {
    type: 'boolean'
  },
  threshold: {
    instance: YAMLSeq
  },
  value: {
    type: 'any'
  },
  xcmOutcome: {
    type: 'string'
  },
  customs: {
    instance: YAMLSeq,
    attributes: {
      path: true,
      args: true
    }
  },
  path: {
    type: 'string'
  },
  args: {
    instance: YAMLSeq
  },
  asserts: {
    instance: YAMLMap,
    attributes: {
      equal: false,
      isSome: false,
      balanceDecreased: false,
      balanceIncreased: false,
      assetsDecreased: false,
      assetsIncreased: false,
      custom: false
    }
  },
  equal: {
    instance: YAMLMap,
    attributes: {
      args: true,
    }
  },
  isSome: {
    instance: YAMLMap,
    attributes: {
      args: true
    }
  },
  balanceDecreased: {
    instance: YAMLMap,
    attributes: {
      args: true
    }
  },
  balanceIncreased: {
    instance: YAMLMap,
    attributes: {
      args: true
    }
  },
  assetsDecreased: {
    instance: YAMLMap,
    attributes: {
      args: true
    }
  },
  assetsIncreased: {
    instance: YAMLMap,
    attributes: {
      args: true
    }
  },
  custom: {
    instance: YAMLMap,
    attributes: {
      path: true,
      args: true
    }
  },
  queries: {
    instance: YAMLMap,
    anyKey: true,
    attributes: {
      chain: true,
      delay: false,
      pallet: true,
      call: true,
      args: true
    }
  },
  rpcs: {
    instance: YAMLSeq,
    attributes: {
      chain: true,
      delay: false,
      pallet: true,
      call: true,
      args: true
    }
  },
  before: {
    instance: YAMLSeq,
    attributes: {
      name: false,
      actions: true
    }
  },
  beforeEach: {
    instance: YAMLSeq,
    attributes: {
      name: false,
      actions: true
    }
  },
  after: {
    instance: YAMLSeq,
    attributes: {
      name: false,
      actions: true
    }
  },
  afterEach: {
    instance: YAMLSeq,
    attributes: {
      name: false,
      actions: true
    }
  }
}

interface Assesment {
  key: string | undefined;
  exist: boolean;
  rightFormat: boolean;
  format: string | undefined
  range: any;
  rootNode: any;
  nextNodes: any[]
}

const rightFormat = (value: any, interfaceValue: Interface): { is: boolean, format: string | undefined } => {
  const { type, instance } = interfaceValue

  value = value.value ? value.value : value

  if (type) {
    return { is: (typeof value === type || type === 'any'), format: type }
  } else if (instance) {
    if (instance === YAMLMap) {
      return { is: value instanceof instance, format: 'object' }
    } else if (instance === YAMLSeq) {
      return { is: value instanceof instance, format: 'array' }
    }
  }

  return { is: false, format: undefined }
}

const assessNode = (doc: any, node: any, rootNode: any): Assesment => {
  let assesment: Assesment = {
    key: undefined,
    exist: false,
    rightFormat: false,
    format: undefined,
    range: undefined,
    rootNode: rootNode,
    nextNodes: []
  }

  let interfaceKey

  if (node instanceof YAMLMap || node instanceof YAMLSeq || INTERFACE[rootNode.key?.value]?.anyKey) {
    assesment = {
      ...assesment,
      exist: true,
      rightFormat: true,
      range: node.range || node.value.range,
      nextNodes: node.items || node.value.items
    }
    return assesment
  } else if (node instanceof Pair) {
    const { key, value } = node
    interfaceKey = INTERFACE[key.value]
    assesment = {
      ...assesment,
      key: key.value,
      range: key.range
    }

    if (interfaceKey) {
      assesment = {
        ...assesment,
        exist: interfaceKey,
        rightFormat: true,
      }

      const { is, format } = rightFormat(value, interfaceKey)

      if (value instanceof YAMLMap || value instanceof YAMLSeq) {
        assesment = {
          ...assesment,
          rightFormat: is,
          format,
          nextNodes: (is && interfaceKey.attributes) ? value.items : []
        }
      } else if (value instanceof Scalar) {
        assesment = {
          ...assesment,
          rightFormat: is,
          format
        }
      } else if(isAlias(value)) {
        return assessNode(doc, value.resolve(doc), node)
      }
    }
  } else if (isScalar(node)) {
    const { key } = rootNode
    const { value } = node

    interfaceKey = INTERFACE[key.value]

    assesment = {
      ...assesment,
      key: key.value,
      range: key.range
    }

    if (interfaceKey) {
      const { is, format } = rightFormat(value, interfaceKey)
      assesment = {
        ...assesment,
        exist: true,
        rightFormat: is,
        format
      }
    }
  }
  return assesment
}



const checkNode = (doc: any, node: any, root: any, initialRange: any, message: Array<string>, lineCounter: LineCounter): Array<string> => {
  const { key, exist, rightFormat, format, range, nextNodes, rootNode } = assessNode(doc, node, root)

  let errorLine = lineCounter.linePos(range[0])
  if (!exist) {
    let newMessage = `${formatLine(errorLine)} unexpected '${key}' attribute`
    if (message.indexOf(newMessage) === -1) {
      message.push(newMessage)
    }
  } else if (!rightFormat) {
    let newMessage = `${formatLine(errorLine)}'${key}' attribute should be of '${format}' type`
    if (message.indexOf(newMessage) === -1) {
      message.push(newMessage)
    }
  }

  nextNodes.forEach(nextNode => {
    checkNode(doc, nextNode, node, range, message, lineCounter)
  })

  return message
};

const printErrors = (errors: Array<CheckerError>) => {
  errors.forEach(({file, errors}) => {
    if (errors.length > 0) {
      console.log(`${file}`)
      addConsoleGroup(2)
      errors.forEach(error => {
        console.log(`\n${error}`)
      })
      addConsoleGroupEnd(2)
    }
  })
}

const check = async () => {
  console.log('\n🕵️‍♂️  Checking format integrity of the YAML files ...')

  let testsPath = process.env.TESTS_PATH;
  let testsConfig: TestFile[] = getTestFiles(testsPath);
  let testConfig: TestFile;

  let errors: Array<CheckerError> = []

  for (testConfig of testsConfig) {
    const { yaml, yaml2, name, file } = testConfig;
    const lineCounter = new LineCounter()
    const parser = new Parser(lineCounter.addNewLine)
    const tokens = parser.parse(file)
    Array.from(tokens)


    let index = errors.push({ file: `\n\x1b[31m${name}\x1b[0m`, errors: [] });

    // TODO: check also the decodedCalls
    let message: Array<string> = []
    const { contents, range } = yaml2
    errors[index - 1].errors.push(...checkNode(yaml2, contents, yaml2, range, message, lineCounter))
  }
  printErrors(errors)
};

check();
