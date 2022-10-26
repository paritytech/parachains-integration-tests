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
import { CheckerError, TestFile } from './interfaces';
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

const mapTypeInstanceToFormat = (instance: any, type: any): any => {
  if (!(new instance instanceof Null)) {
    switch(instance) {
      case YAMLSeq: return 'array'
    }
  } else {
    return type
  }
}

class Null {};

const checkNode = (nodeName: string, node: YAMLMap, lineCounter: LineCounter): Array<string> => {
  let message: Array<string> = []

  let shouldHave = [
    { name: 'name', instance: Null, type: 'string' },
    { name: 'its', instance: YAMLSeq, type: null }
  ]

  let canHave = [
    { name: 'before', instance: YAMLSeq, type: null },
    { name: 'beforeEach', instance: YAMLSeq, type: null },
    { name: 'after', instance: YAMLSeq, type: null },
    { name: 'afterEach', instance: YAMLSeq, type: null },
    { name: 'describes', instance: YAMLSeq, type: null },
  ]

  shouldHave.forEach(({name, instance, type}) => {
    if (!node.has(name)) {
      console.log("Node",node)
      if (node.range) {
        // console.log("Line", lineCounter.linePos(node.range[0]))
        let errorLineStart = lineCounter.linePos(node.range[0])
        let errorLineEnd = lineCounter.linePos(node.range[2])
        message.push(`${formatLine(errorLineStart, errorLineEnd)}'${name}' attribute should be present for '${nodeName}'`)
      }
    } else if (!(node.get(name) instanceof instance || typeof node.get(name) === type)) {
      console.log('GET ==', node.get(name, true))
      let attributeNode = node.get(name, true)

      if (attributeNode &&  attributeNode.range) {
        let errorLine = lineCounter.linePos(attributeNode.range[0])
        message.push(`${formatLine(errorLine)}'${name}' attribute should be '${mapTypeInstanceToFormat(instance, type)}' type for '${nodeName}'`)
      }
    }
  })

  canHave.forEach(({name, instance, type}) => {
    if (node.has(name)) {
      if (!(node.get(name) instanceof instance || typeof node.get(name) === type)) {
        let attributeNode = node.get(name, true)
        if ( attributeNode &&  attributeNode.range) {
          let errorLine = lineCounter.linePos(attributeNode.range[0])
          message.push(`${formatLine(errorLine)}'${name}' attribute should be '${mapTypeInstanceToFormat(instance, type)}' type for '${nodeName}'`)
        }
      }
    }
  })

  return message
};

// const recursiveFunc = (items) => {
//   // console.log(items)
//   items.forEach(item => {
//     // console.log(item)
//     switch(item.key?.source) {
//       case 'tests' || 'describes': {
//         // console.log("NEW ITEM: ", item.value.items)
//         // recursiveFunc(item.value?.items)
//         console.log(item.value?.items)
//         item.value?.items.forEach(i => {
//           console.log(i)
//         })
//         // recursiveFunc(item.value?.items)
//       }
//       case 'extrinsics': {
//         // console.log("NEW ITEM: ", item.value.items)
//         // recursiveFunc(item.value.items)
//       }
//     }
//     if (item.value?.items) {
//       recursiveFunc(item.value.items)
//     }
//   })
// }

const traverseDescribes = (describes: YAMLSeq) => {

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

const check = async () => {
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

    // describe(`\n📂 ${name}`, async function () {
      // beforeAddConsoleGroups(2);
      // beforeConnectToProviders(testConfig);
      // beforeBuildDecodedCalls(yaml.settings.decodedCalls);

      let index = errors.push({ file: `\n\x1b[31m${name}\x1b[0m`, errors: [] });

      let tests = yaml2.get('tests')
      // console.log(tests)



      if (tests.items.length > 0) {
        // console.log(tests.items)
        tests.items.forEach(describe => {
          console.log("Describe", describe)
          errors[index - 1].errors.push(...checkNode('describes', describe, lineCounter))
          if (describe.has('describes')) {
            console.log('has describe')
            console.log("Nested Describe", describe.get("describes"))
          }
        })
      }

      // .items.forEach(item => {})



      // for (const test of yaml.tests) {
      //   // describersBuilder(test);
      //   console.log(test)
      // }
      // console.log(yaml2.value.items)
      // yaml2.get('tests').items.forEach(item => {
      //   item.items.forEach(i => {
      //     console.log(i.value.items[0].items[0].key)
      //   })
      // })
      // if (yaml2.value?.items) {
      //   recursiveFunc(yaml2.value?.items)
      // }

      // yaml2.value.items.forEach(item => {
      //   switch(item.key.source) {
      //     case 'tests' || 'describes': {
      //       console.log(item.value.items[0].value.items)
      //     }
      //   }
      // })

    //   traverse(yaml).forEach(function (this, value) {
    //     // console.log(value)
    //     // console.log("KEY: ", this)
    //     // console.log("KEY PARENT: ", this.parent?.key)
    //     // console.log("VALUE", value)
    //     // console.log("THIS", this)

    //     switch(this.key) {
    //       case 'tests' || 'describes': {
    //         this.node.forEach(describe => {
    //           console.log("THIS", this.node)
    //           console.log(stringify(this.node))
    //           // this.update([{error: checkDescribe(describe), ...this.node[0]}])
    //           // this.node.parent[0]["error"]
    //         })
    //       }
    //     }
    //   // })
    // });
    // console.log(yaml2.get('tests').items[0].items)
    // console.log(stringify(yaml, { blockQuote: false,  nullStr: '~' }))
  }
  console.log(errors)
  printErrors(errors)
  // console.log('lalalal \x1b[33m Welcome to the app! \x1b[0m');

};

check();
