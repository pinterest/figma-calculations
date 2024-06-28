import { type JestConfigWithTsJest, pathsToModuleNameMapper } from "ts-jest";
import ts from "typescript";

// Load the tsconfig.json file to get compilerOptions.baseUrl and compilerOptions.paths
const configPath = ts.findConfigFile(
  "./" /*searchPath*/,
  ts.sys.fileExists,
  "tsconfig.json"
);
if (!configPath) throw new Error("Could not find a valid 'tsconfig.json'.");

const configFile = ts.readJsonConfigFile(configPath, ts.sys.readFile);
const { compilerOptions } = ts.parseConfigFileTextToJson(
  configPath,
  configFile.getText()
).config;

const jestConfig: JestConfigWithTsJest = {
  preset: "ts-jest",
  roots: ["<rootDir>"],
  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
};

export default jestConfig;
