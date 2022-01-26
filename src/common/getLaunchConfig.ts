import { resolve } from "path";
import fs from "fs";
import YAML from "yaml"
import { LaunchConfig, TestsConfig } from "../interfaces/filesConfig";

export const getLaunchConfig = () => {
  const config_file = './config.json'

  if (!config_file) {
    console.error("Missing config file argument...");
    process.exit();
  }

  let config_path = resolve(process.cwd(), config_file);

  if (!fs.existsSync(config_path)) {
    console.error("Config file does not exist: ", config_path);
    process.exit();
  }

  let config: LaunchConfig = require(config_path);

  return config
}

export const getTestsConfig = () => {
  const tests_file = './tests.yml'

  let tests_path = resolve(process.cwd(), tests_file);

  if (!fs.existsSync(tests_path)) {
    console.error("Tests file does not exist: ", tests_path);
    process.exit();
  }

  const file = fs.readFileSync(tests_file, 'utf8')

  // let config: TestsConfig = require(tests_path);

  return YAML.parse(file)
}