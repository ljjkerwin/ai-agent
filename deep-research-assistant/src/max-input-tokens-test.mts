import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import getModel from "../../utils/getModel.mts";

const model = getModel()

console.log(model.profile.maxInputTokens);

Object.defineProperty(model, "profile", {
  get: () => ({ maxInputTokens: 1_024 }),
});

console.log(model.profile.maxInputTokens);


console.log(await model.invoke('介绍一下名侦探柯南'))