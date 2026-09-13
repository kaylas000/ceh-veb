/* ЦЕХ · Universal Loop Engine — validators/index.mjs
   Реестр валидаторов. Ключи — те же имена, что в config.yaml (validator.type). */

import { CehProjectValidator } from "./ceh-project.mjs";
import { LlmJudgeValidator } from "./llm-judge.mjs";
import { NodeCodeValidator } from "./node-code.mjs";
import { PythonCodeValidator } from "./python-code.mjs";
import { SchemaValidator } from "./schema.mjs";

/** @type {Record<string, any>} */
export const VALIDATORS = Object.freeze({
  // родной для цеха: гоняет scripts/validate.mjs и линтеры (ворота G3/G4)
  ceh_project: CehProjectValidator,
  cehProject: CehProjectValidator,
  // универсальные
  node_code: NodeCodeValidator,
  nodeCode: NodeCodeValidator,
  python_code: PythonCodeValidator,
  pythonCode: PythonCodeValidator,
  json_schema: SchemaValidator,
  schema: SchemaValidator,
  llm_judge: LlmJudgeValidator,
  llmJudge: LlmJudgeValidator,
});

export { CehProjectValidator, LlmJudgeValidator, NodeCodeValidator, PythonCodeValidator, SchemaValidator };
export { CEH_CHECKS, DEFAULT_CHECKS, parseCodeLines, parseValidateReport } from "./ceh-project.mjs";
export { validateAgainstSchema } from "./schema.mjs";
export { parseTapSummary, summarizeTestOutput } from "./node-code.mjs";
