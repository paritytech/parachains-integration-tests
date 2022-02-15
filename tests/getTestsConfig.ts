import YAML from "yaml"
import glob from "glob";
import fs from "fs";

const getFiles = (src) => {
  let testsFiles = glob.sync(src)

  try {
    return testsFiles = testsFiles.map(tesFile => {
      const file = fs.readFileSync(tesFile, 'utf8')
      return(YAML.parse(file))
    })
  } catch(e) {
    console.log(e)
    process.exit(1)
  }
}

const getTestsConfig = () => {
  let path = './tests/config/**/*.yml'
  let files = getFiles(path)
  return(files)
}

export default getTestsConfig