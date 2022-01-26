import { resolve } from "path";
import fs from "fs";
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
  const tests_file = './tests.json'

  if (!tests_file) {
    console.error("Missing tests file argument...");
    process.exit();
  }

  let tests_path = resolve(process.cwd(), tests_file);

  if (!fs.existsSync(tests_path)) {
    console.error("Tests file does not exist: ", tests_path);
    process.exit();
  }

  let config: TestsConfig = require(tests_path);

  return config
}