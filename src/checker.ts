require('dotenv').config();
import { getTestFiles, addConsoleGroup, addConsoleGroupEnd } from './utils'
import YAML, { isCollection, isScalar, YAMLMap, LineCounter, Parser } from 'yaml';
import { stringify, YAMLSeq, Scalar } from 'yaml'
import traverse from 'traverse';
import {
  beforeConnectToProviders,
  beforeBuildDecodedCalls,
  beforeAddConsoleGroups,
} from './before';
import { CheckerError, TestFile, XcmOutcome } from './interfaces';
// import { describersBuilder } from './descriptor';
import { Describe } from './interfaces';

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

const mapTypeToFormat = (type: any): string => {
  if (type === YAMLMap) {
    return 'object'
  } else if (type === YAMLSeq) {
    return 'array'
  } else {
    return type
  }
}

interface Interface {
  instance?: any;
  type?: string,
  attributes?: { [key: string]: boolean };
  rule?: object;
}

const INTERFACE: { [key: string]: Interface } = {
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
    }
  },
  wsPort: {
    type: 'number'
  },
  ws: {
    type: 'string'
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
      XcmOutcome: false,
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
  XcmOutcome: {
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
      args: true,
      path: false
    }
  },
  queries: {
    instance: YAMLSeq,
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

// const assessChildNode = (nodeInterface: Interface, value): { rightFormat: boolean, isNode: boolean } => {
//   const { instance, type } = nodeInterface

//   let rightFormat = false;
//   let isNode = false;

//   if (instance) {
//     console.log("Instance", value, instance)
//     rightFormat = value instanceof instance;
//     isNode = true;
//   } else if (type) {
//     rightFormat = typeof value === type || type === 'any'
//     isNode = false;
//   }

//   return { rightFormat, isNode }
// }

const assessValueWithExpectedAttribute = (
  value: Scalar | YAMLMap | YAMLSeq,
  attribute: Interface
): { rightFormat: boolean, isNode: boolean } => {
  const { instance, type } = attribute

  let rightFormat = false;
  let isNode = false;

  if (instance) {
    // console.log("Instance", value, instance)
    rightFormat = value instanceof instance;
    isNode = true;
  } else if (type) {
    value = value as Scalar
    rightFormat = typeof value.value === type || type === 'any'
    isNode = false;
  }

  return { rightFormat, isNode }
}

const checkNode = (nodeType: string, node: YAMLMap | YAMLSeq, lineCounter: LineCounter): Array<string> => {
  let message: Array<string> = []

  // console.log("======================== NEW NODE ==============================")

  // const { shouldHave, canHave } = INTERFACE[nodeName];

  // let items;

  // if (node instanceof YAMLMap) {
  //   items = node.ites
  // }

  // node.items.forEach(item => {
  //   console.log(item)
  // })

  // let nodeInterface: Interface = { ...INTERFACE[nodeType] }
  // let nodeInterface: Interface = Object.assign({}, INTERFACE[nodeType]);
  let nodeInterface: Interface = JSON.parse(JSON.stringify(INTERFACE[nodeType]));

  // const { attributes } = nodeInterface;

  // console.log("COPY OF INTERFACE - START", nodeInterface)

  node.items.forEach((item: any) => {
    // console.log("== NEW ITEM", item)

    // console.log("Item", item)
    // let errorLineStart = lineCounter.linePos(item.range[0])
    // let errorLineEnd = lineCounter.linePos(item.range[2])

    let key = item.key.value
    let value = item.value
    // console.log("Value", item.value)
    let attribute = INTERFACE[key]
    if (attribute) {
      if (nodeInterface.attributes) {
        delete nodeInterface.attributes[key];
      }
      // const { rightFormat, isNode } = assessChildNode(nextNodeInterface, childNodeValue)
      const { rightFormat, isNode } = assessValueWithExpectedAttribute(value, attribute)

      if (!rightFormat) {
        let errorLine = lineCounter.linePos(item.key.range[0])
        let type = isNode ? attribute.instance : attribute.type
        message.push(`${formatLine(errorLine)}'${key}' attribute should be of '${mapTypeToFormat(type)}' type for '${nodeType}'`)
      }
      if (isNode) {
        // checkNode(key, value, lineCounter)
      }
    } else {
        let errorLine = lineCounter.linePos(item.key.range[0])
        message.push(`${formatLine(errorLine)}'${key}' attribute unexpected for '${nodeType}'`)
    }


    // for (const key in childNodeInterface.attributes) {
    //   console.log(key)
    //   console.log("Exists", item.has(key))
    //   if (item.has(key)) {
    //     let childNode = item.get(key, true);
    //     let childNodeValue = item.get(key)
    //     // let childValueWithRange = childNode.get(name, true)
    //     let nextNodeInterface = INTERFACE[key];
    //     console.log("ChildNode", childNode)
    //     const { rightFormat, isNode } = assessChildNode(nextNodeInterface, childNodeValue)
    //     if (!rightFormat) {
    //       let errorLine = lineCounter.linePos(childNode.range[0])
    //       let type = isNode ? nextNodeInterface.instance : nextNodeInterface.type
    //       message.push(`${formatLine(errorLine)}'${key}' attribute should be of '${mapTypeToFormat(type)}' type for '${childNodeType}'`)
    //     }
    //     if (isNode) {
    //       // checkNode(key, childValue, lineCounter)
    //     }
    //   } else if (childNodeInterface.attributes[key] === true){
    //     // message should exist
    //     let errorLineStart = lineCounter.linePos(item.range[0])
    //     let errorLineEnd = lineCounter.linePos(item.range[2])
    //     message.push(`${formatLine(errorLineStart, errorLineEnd)}'${key}' attribute should be present for '${childNodeType}'`)
    //   }
    // }
  })
  // console.log("NODE", node)
  if (node.range) {
    // console.log("COPY OF INTERFACE - FINAL", nodeInterface)
    // check what atttributes are not included
    for (const key in nodeInterface.attributes) {
      if (nodeInterface.attributes[key] === true) {
        let errorLineStart = lineCounter.linePos(node.range[0])
        let errorLineEnd = lineCounter.linePos(node.range[2])
        message.push(`${formatLine(errorLineStart, errorLineEnd)}'${key}' attribute should be present for '${nodeType}'`)
      }
    }
  }



  // shouldHave.forEach(({name, instance, type}) => {
  //   if (!node.has(name)) {
  //     console.log("Node",node)
  //     if (node.range) {
  //       // console.log("Line", lineCounter.linePos(node.range[0]))
  //       let errorLineStart = lineCounter.linePos(node.range[0])
  //       let errorLineEnd = lineCounter.linePos(node.range[2])
  //       message.push(`${formatLine(errorLineStart, errorLineEnd)}'${name}' attribute should be present for '${nodeName}'`)
  //     }
  //   } else if (!(node.get(name) instanceof instance || typeof node.get(name) === type)) {
  //     console.log('GET ==', node.get(name, true))
  //     let attributeNode = node.get(name, true)

  //     if (attributeNode &&  attributeNode.range) {
  //       let errorLine = lineCounter.linePos(attributeNode.range[0])
  //       message.push(`${formatLine(errorLine)}'${name}' attribute should be '${mapTypeInstanceToFormat(instance, type)}' type for '${nodeName}'`)
  //     }
  //   }
  // })

  // canHave.forEach(({name, instance, type}) => {
  //   if (node.has(name)) {
  //     if (!(node.get(name) instanceof instance || typeof node.get(name) === type)) {
  //       let attributeNode = node.get(name, true)
  //       if ( attributeNode &&  attributeNode.range) {
  //         let errorLine = lineCounter.linePos(attributeNode.range[0])
  //         message.push(`${formatLine(errorLine)}'${name}' attribute should be '${mapTypeInstanceToFormat(instance, type)}' type for '${nodeName}'`)
  //       }
  //     }
  //   }
  // })

  return message
};

// const checkNode = (nodeName: string, node: YAMLMap | YAMLSeq, lineCounter: LineCounter): Array<string> => {
//   let message: Array<string> = []

//   const { shouldHave, canHave } = INTERFACE[nodeName];


//   node.items.forEach(item => {

//   })

//   shouldHave.forEach(({name, instance, type}) => {
//     if (!node.has(name)) {
//       console.log("Node",node)
//       if (node.range) {
//         // console.log("Line", lineCounter.linePos(node.range[0]))
//         let errorLineStart = lineCounter.linePos(node.range[0])
//         let errorLineEnd = lineCounter.linePos(node.range[2])
//         message.push(`${formatLine(errorLineStart, errorLineEnd)}'${name}' attribute should be present for '${nodeName}'`)
//       }
//     } else if (!(node.get(name) instanceof instance || typeof node.get(name) === type)) {
//       console.log('GET ==', node.get(name, true))
//       let attributeNode = node.get(name, true)

//       if (attributeNode &&  attributeNode.range) {
//         let errorLine = lineCounter.linePos(attributeNode.range[0])
//         message.push(`${formatLine(errorLine)}'${name}' attribute should be '${mapTypeInstanceToFormat(instance, type)}' type for '${nodeName}'`)
//       }
//     }
//   })

//   canHave.forEach(({name, instance, type}) => {
//     if (node.has(name)) {
//       if (!(node.get(name) instanceof instance || typeof node.get(name) === type)) {
//         let attributeNode = node.get(name, true)
//         if ( attributeNode &&  attributeNode.range) {
//           let errorLine = lineCounter.linePos(attributeNode.range[0])
//           message.push(`${formatLine(errorLine)}'${name}' attribute should be '${mapTypeInstanceToFormat(instance, type)}' type for '${nodeName}'`)
//         }
//       }
//     }
//   })

//   return message
// };

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
  console.log('\n🕵️‍♂️  Checking YAML files format integrity...')

  let testsPath = process.env.TESTS_PATH;
  let testsConfig: TestFile[] = getTestFiles(testsPath);
  let testConfig: TestFile;

  let errors: Array<CheckerError> = []

  for (testConfig of testsConfig) {
    const { yaml, yaml2, name, file } = testConfig;
    const lineCounter = new LineCounter()
    const parser = new Parser(lineCounter.addNewLine)
    const tokens = parser.parse(file)
    Array.from(tokens) // forces iteration


    let index = errors.push({ file: `\n\x1b[31m${name}\x1b[0m`, errors: [] });

    let tests = yaml2.get('tests')

    // TODO: check also the decodedCalls

    if (tests.items.length > 0) {
      tests.items.forEach(describe => {
        errors[index - 1].errors.push(...checkNode('describes', describe, lineCounter))
      })
      // errors[index - 1].errors.push(...checkNode('describes', tests, lineCounter))

    }
  }
  printErrors(errors)
  // console.log(INTERFACE['describes'])
};

check();
