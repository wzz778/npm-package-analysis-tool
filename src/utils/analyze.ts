import fs from "fs";
import path from "path";
import resolve from "resolve";
import server from "./server";
import writeJsonFile from "./output";
// 当前工作目录
const basedir = process.cwd();
// 默认递归分析的层次深度
const defaultAnalyzeDepth = 3;
// 默认Json输出文件路径
const defaultJsonFilePath = path.resolve(basedir, "./analyze/package.json");

/** analyze命令参数 */
interface AnalyzeOptions {
  [optionName: string]: string | boolean;
}
/**
 * 分析npm包依赖关系
 * @param options
 */
export default function analyze(options: AnalyzeOptions) {
  // 递归分析的层次深度
  let depth = Number(options.depth) || defaultAnalyzeDepth;
  // 是否输出json文件
  let json = options.json;
  // TODO: 参数合法性检测
  if (json === true) json = defaultJsonFilePath;
  console.log(
    `\n----分析npm包依赖关系----\n深度:${depth}\n${
      json ? "输出到" + json : "不输出Json"
    }\n-------------------------\n`
  );
  const projectDependencies = getDependencies(depth);
  const str = JSON.stringify(projectDependencies, null, "\t");
  console.log(str);
  if (json) {
    writeJsonFile(json, str);
  } else {
    server(JSON.stringify(projectDependencies));
  }
}

/** package.json信息 */
interface PackageJson {
  /** 版本 */
  version?: string;
  /** 包依赖 */
  dependencies?: Record<string, string>;
  /** 开发依赖 */
  devDependencies?: Record<string, string>;
  [packageOptionName: string]: any;
}

/**
 * 读取package.json文件
 * @param packageName 包名（可选）
 * @returns
 */
function readPackageJson(packageName?: string) {
  /** package.json对象 */
  let packageJson: PackageJson = {};
  // 获取指定包的package.json
  if (packageName)
    try {
      resolve.sync(packageName, {
        basedir,
        extensions: [".d.ts", ".ts", ".js", ".json"],
        moduleDirectory: ["node_modules", "@types"],
        packageFilter: (pkg, pkgPath) => {
          packageJson = pkg;
          return { ...pkg, _resolvedPath: pkgPath };
        },
      });
    } catch (e) {
      // TODO: 错误处理提示
      // console.error(new Error(`找不到包 ${packageName} `));
    }
  // 获取当前工作目录的package.json
  else {
    packageJson = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
  }
  const { version, dependencies, devDependencies } = packageJson;
  return { name: packageName, version, dependencies, devDependencies };
}

interface PackageInfo {
  /** 包名 */
  name: string;
  /** 版本 */
  version?: string;
  /** 依赖 */
  dependencies?: PackageInfo[];
  /** 开发依赖 */
  devDependencies?: PackageInfo[];
}

/**
 * 递归遍历包获取依赖
 */
export function getDependencies(residualDepth: number, packageName?: string) {
  const packageJson = readPackageJson(packageName);
  let packageInfo: PackageInfo = {
    name: packageName || "root",
    version: packageJson.version,
    dependencies: [],
    devDependencies: [],
  };
  if (residualDepth <= 0) return packageInfo;
  for (let packageName in packageJson.dependencies) {
    packageInfo.dependencies?.push(
      getDependencies(residualDepth - 1, packageName)
    );
  }
  for (let packageName in packageJson.devDependencies) {
    packageInfo.devDependencies?.push(
      getDependencies(residualDepth - 1, packageName)
    );
  }
  return packageInfo;
}
