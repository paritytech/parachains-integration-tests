require('dotenv').config();
import { getTestFiles, addConsoleGroup, addConsoleGroupEnd } from './utils'
import { YAMLMap, LineCounter, Parser, Pair, isAlias, Alias } from 'yaml';
import { YAMLSeq, Scalar } from 'yaml'
import { CheckerError, TestFile, Interface, Assesment, ParentNode } from './interfaces';
import { INTERFACE } from './constants'

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

const rightFormat = (value: any, interfaceValue: Interface): { is: boolean, format: string | undefined } => {
  const { type, instance } = interfaceValue

  value = value?.value ? value.value : value

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

const lookupMissingAttributes = (doc: any, rootNode: any, node: any, lineCounter: LineCounter, message: string[]): string[] => {
  // console.log("PRe node", node)
  // console.log("PRe node root", rootNode)
  if (node instanceof Pair) {
    const { key } = rootNode;
    const { value } = node;
    // console.log("NODE", node)
    // console.log("ROOT NODE", node)
    // console.log("Node key", key.value)
    // console.log("Node Value", value)
    let interfaceAttr = INTERFACE[key.value];


    if (value instanceof YAMLSeq) {
      // console.log("========================================")
      // console.log("KEY", key.value)
      // console.log("INTERFACE", interfaceAttr)
      // if (interfaceAttr && interfaceAttr.attributes && !interfaceAttr.anyKey) {
      if (interfaceAttr && interfaceAttr.attributes) {
        // console.log(value.has(attr))
        value.items.forEach((item) => {
          // console.log("ITEM", item)
          for (const attr in interfaceAttr.attributes) {
            // console.log("Attr", attr, item.has(attr))
            if (interfaceAttr.attributes[attr] && !item.has(attr)) {
              if (value.range) {
                let errorLineStart = lineCounter.linePos(item.range[0])
                let errorLineEnd = lineCounter.linePos(item.range[2])
                message.push(`${formatLine(errorLineStart)}:${formatLine(errorLineEnd)} missing '${attr}' attribute in '${key.value}'`)
                message.concat(lookupMissingAttributes(doc, item, item, lineCounter, message))
              }
            }
          }
        })
      }
    } else if (value instanceof YAMLMap) {
      if ((interfaceAttr && interfaceAttr.attributes && !interfaceAttr.anyKey) || ((interfaceAttr && interfaceAttr.attributes && (rootNode !== node) ))) {
          for (const attr in interfaceAttr.attributes) {
            // console.log("Attr", attr, value.has(attr))
            if (interfaceAttr.attributes[attr] && !value.has(attr)) {
              if (value.range) {
                let errorLineStart = lineCounter.linePos(value.range[0])
                let errorLineEnd = lineCounter.linePos(value.range[2])
                message.push(`${formatLine(errorLineStart)}:${formatLine(errorLineEnd)} missing '${attr}' attribute in '${key.value}'`)
              }
            }
          }
      } else if (interfaceAttr && interfaceAttr.attributes && interfaceAttr.anyKey && (rootNode === node)) {
        // console.log("entra")
        value.items.forEach((item) => {
          message.concat(lookupMissingAttributes(doc, node, item, lineCounter, message))
        })
      }
    } else if (isAlias(value)) {
      // console.log("Alias ROOT NODE", node)
      // console.log("Alias NODE", value.resolve(doc))
      node.value = value.resolve(doc)
      message.concat(lookupMissingAttributes(doc, node, node, lineCounter, message))
    }
  }

  return message
}

const assessPair = (node: any, parentNode: ParentNode): Assesment => {
  let assessment: Assesment = {
    parentKey: parentNode.key,
    key: node.key.value,
    exist: undefined,
    rightFormat: undefined,
    format: undefined,
    range: node.key.range
  }

  let interfaceParentNode = INTERFACE[parentNode.key]
  let interfaceNode = INTERFACE[node.key.value]

  if (interfaceParentNode && interfaceNode && interfaceParentNode.attributes && !(interfaceParentNode.attributes[node.key.value] === undefined)) {
    const { is, format } = rightFormat(node.value, interfaceNode)

    return assessment = {
      ...assessment,
      exist: true,
      rightFormat: is,
      format
    }
  } else {
    return assessment = {
      ...assessment,
      exist: false || (interfaceParentNode?.anyKey)
    }
  }
}

const traverseNode = (doc: any, node: any, parentNode: ParentNode, assessments: Array<Assesment>, lineCounter: LineCounter): Array<Assesment> => {
  if (node instanceof YAMLMap || node instanceof YAMLSeq) {
    node.items?.forEach(item => {
      traverseNode(doc, item, parentNode, assessments, lineCounter)
    })
  } else if (node instanceof Pair) {
    let interfaceNode = INTERFACE[node.key.value]
    let interfaceParentNode = INTERFACE[parentNode.key]

    const { key, value } = node

    if (value instanceof Alias) {
      let refNode = value.resolve(doc)
      node.value = refNode
      if (refNode instanceof Pair) {
        node.key.range = refNode.key.range
      } else if (refNode instanceof YAMLMap || refNode instanceof YAMLSeq || refNode instanceof Scalar) {
        node.key.range = refNode.range
      }
      traverseNode(doc, node, parentNode, assessments, lineCounter)
    } else if (interfaceParentNode?.anyKey && interfaceParentNode?.attributes && (interfaceParentNode.attributes[node.key.value] === undefined)) {
      node.value?.items?.forEach(item => {
        traverseNode(doc, item, parentNode, assessments, lineCounter)
      })
    } else {
      assessments.push(assessPair(node, parentNode))

      if ((value instanceof YAMLMap || value instanceof YAMLSeq) && interfaceNode?.attributes) {
        let parentKey = key.value
        let parentRange = key.range
        parentNode = { key: parentKey, range: parentRange }

        value.items.forEach(item => {
          traverseNode(doc, item, parentNode, assessments, lineCounter)
        })
      }
    }
  }
  return assessments
}

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

const collectErrors = (assessments: Assesment[], lineCounter: LineCounter): string[] => {
  let errors: string[] = []

  assessments.forEach(assessment => {
    const { parentKey, key, exist, rightFormat, format, range } = assessment

    let errorLine = lineCounter.linePos(range[0])

    if (!exist) {
      let error = `${formatLine(errorLine)} unexpected '${key}' attribute`
      errors.push(error)
    } else if (!rightFormat) {
      let error = `${formatLine(errorLine)}'${key}' attribute should be of '${format}' type`
      errors.push(error)
    }
  })
  return [...new Set(errors)]
}

const check = async () => {
  console.log('\n🕵️‍♂️  Checking format integrity of the YAML files ...')

  let testsPath = process.env.TESTS_PATH;
  let testsConfig: TestFile[] = getTestFiles(testsPath);
  let testConfig: TestFile;

  let result: Array<CheckerError> = []

  for (testConfig of testsConfig) {
    const { yamlDoc, name, file } = testConfig;
    const lineCounter = new LineCounter()
    const parser = new Parser(lineCounter.addNewLine)
    const tokens = parser.parse(file)
    Array.from(tokens)

    let assessments: Array<Assesment> = []
    const { contents, range } = yamlDoc

    if (contents) {
      let docKey: Scalar = new Scalar('YAMLdocument')
      docKey.range = range

      let doc = new Pair(docKey, contents)
      let parentNode: ParentNode = { key: 'root', range: range }
      assessments.concat(traverseNode(yamlDoc, doc, parentNode, assessments, lineCounter))

      result.push(
        {
          file: `\n\x1b[31m${name}\x1b[0m`,
          errors: collectErrors(assessments, lineCounter)
        });
    }
  }
  printErrors(result)
};

check();
