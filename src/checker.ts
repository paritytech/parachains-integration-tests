require('dotenv').config();
import { getTestFiles, addConsoleGroup, addConsoleGroupEnd } from './utils'
import { YAMLMap, LineCounter, Parser, Pair, Alias } from 'yaml';
import { YAMLSeq, Scalar } from 'yaml'
import { CheckerError, TestFile, Interface, Assessment, ParentNode } from './interfaces';
import { INTERFACE } from './constants'
import _ from 'lodash'

const formatLine = (start, end?): string => {
  const { line: lineStart, col: colStart } = start;
  let errorEnd;

  if (end) {
    const { line: lineEnd, col: colEnd } = end;
    errorEnd = `\x1b[33mline ${lineEnd}:${colEnd}\x1b[0m: `;
  }

  let errorStart = `\x1b[33mline ${lineStart}:${colStart}\x1b[0m`;

  return `${errorStart}${errorEnd ? ` \x1b[33mto\x1b[0m ${errorEnd}` : ': '}`
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

const assessPair = (node: any, parentNode: ParentNode, missingAttributes: object): Assessment => {
  let assessment: Assessment = {
    parentKey: parentNode.key,
    parentRange: parentNode.range,
    key: node.key.value,
    exist: undefined,
    rightFormat: undefined,
    format: undefined,
    range: node.key.range,
  }

  let interfaceParentNode = INTERFACE[parentNode.key]
  let interfaceNode = INTERFACE[node.key.value]

  if (interfaceParentNode && interfaceNode && interfaceParentNode.attributes && !(interfaceParentNode.attributes[node.key.value] === undefined)) {
    const { is, format } = rightFormat(node.value, interfaceNode)

    assessment = {
      ...assessment,
      exist: true,
      rightFormat: is,
      format
    }

    let key = `${assessment.parentRange[0]}-${assessment.parentRange[1]}`
    let attributes = { ...INTERFACE[parentNode.key].attributes }

    if (!missingAttributes[key]) {
      missingAttributes[key] = {
        key: assessment.parentKey,
        attributes
      }
    }

    delete missingAttributes[key].attributes[assessment.key]

  } else {
    assessment = {
      ...assessment,
      exist: false || (interfaceParentNode?.anyKey)
    }
  }

  return assessment
}

const traverseNode = (doc: any, node: any, parentNode: ParentNode, assessments: Array<Assessment>, missingAttributes: object): Array<Assessment> => {
  if (node instanceof YAMLMap || node instanceof YAMLSeq) {
    node.items?.forEach(item => {
      parentNode = { ...parentNode, range: node.range}
      traverseNode(doc, item, parentNode, assessments, missingAttributes)
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
      traverseNode(doc, node, parentNode, assessments, missingAttributes)
    } else if (interfaceParentNode?.anyKey && interfaceParentNode?.attributes && (interfaceParentNode.attributes[node.key.value] === undefined)) {
      parentNode = { ...parentNode, range: node.value.range}
      node.value?.items?.forEach(item => {
        traverseNode(doc, item, parentNode, assessments, missingAttributes)
      })
    } else {
      assessments.push(assessPair(node, parentNode, missingAttributes))

      if ((value instanceof YAMLMap || value instanceof YAMLSeq) && interfaceNode?.attributes) {
        let parentKey = key.value
        let parentRange = value.range
        parentNode = { key: parentKey, range: parentRange }

        value.items.forEach(item => {
          traverseNode(doc, item, parentNode, assessments, missingAttributes)
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

const collectErrors = (assessments: Assessment[], missingAttributes: object, lineCounter: LineCounter): string[] => {
  let errors: object[] = []

  assessments.forEach(assessment => {
    const { key, exist, rightFormat, format, range } = assessment

    let errorLine = lineCounter.linePos(range[0])

    if (!exist) {
      let error = `${formatLine(errorLine)} unexpected '${key}' attribute`
      errors.push({ line: errorLine.line, error })
    } else if (!rightFormat) {
      let error = `${formatLine(errorLine)}'${key}' attribute should be of '${format}' type`
      errors.push({ line: errorLine.line, error })
    }
  })

  for (let block in missingAttributes) {
    let attributes = missingAttributes[block].attributes;
    let errorLineStart = lineCounter.linePos(Number(block.split('-')[0]))
    let errorLineEnd = lineCounter.linePos(Number(block.split('-')[1]))

    for (let key in attributes) {
      if (attributes[key]) {
        let error = `${formatLine(errorLineStart, errorLineEnd)} missing '${key}' attribute for '${missingAttributes[block].key}' type`
        errors.push({ line: errorLineStart.line, error })
      }
    }

    let rule = INTERFACE[missingAttributes[block].key]?.rule

    if (rule) {
      if (rule['or']) {
        let dontFollowTheRule = true;
        rule['or'].forEach(attr => {
          dontFollowTheRule &&= attributes[attr] !== undefined
        })
        if (dontFollowTheRule) {
          let error = `${formatLine(errorLineStart, errorLineEnd)} at least one of these attributes ${JSON.stringify(rule['or'])} should be present for '${missingAttributes[block].key}' type`
          errors.push({ line: errorLineStart.line, error })
        }
      }
    }
  }
  let orderedErrors = _.orderBy(errors, ['line'], ['asc'])
  // console.log(_.orderBy(errors, ['line'], ['asc']))
  let errorsArray: string[] = orderedErrors.map(item => {
    return item.error
  })

  return [...new Set(errorsArray)]
}

const check = async () => {
  console.log('\n👮🏻‍♂️ Checking format integrity of the YAML files...')

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

    let assessments: Array<Assessment> = []
    let missingAttributes = {}
    const { contents, range } = yamlDoc

    if (contents) {
      let docKey: Scalar = new Scalar('YAMLdocument')
      docKey.range = range

      let doc = new Pair(docKey, contents)
      let parentNode: ParentNode = { key: 'root', range: range }
      assessments.concat(traverseNode(yamlDoc, doc, parentNode, assessments, missingAttributes))

      result.push(
        {
          file: `\n\x1b[31m${name}\x1b[0m`,
          errors: collectErrors(assessments, missingAttributes, lineCounter)
        });
    }
  }
  printErrors(result)

  let failed = _.find(result, (item: any) => {return item.errors.length !== 0});
  failed ? process.exit(1) : process.exit(0)
};

check();
