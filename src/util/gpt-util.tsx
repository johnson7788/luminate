import useEditorStore from "../store/use-editor-store";
import DatabaseManager from "../db/database-manager";
import { nominalDimensionDef, ordinalDimensionDef } from "./prompts";
import * as bootstrap from 'bootstrap';
import { getEnvVal } from "./util";

const MAX_TOKEN_BIG = 1000;
const MAX_TOKEN_SMALL = 256;
const MODEL = import.meta.env.VITE_MODEL_NAME; //修改了模型名称
const BASE_URL = import.meta.env.VITE_BASE_URL;
const TEMPERATURE = 0.7;
const TOP_P = 1;

export async function generateDimensions(query, context) {
  // generate dimensions based on the query and context
  const start = new Date().getTime();
  let fail = 0;
  let total = 0;
  //这行代码从 useEditorStore 中获取编辑器的 API，并保存当前的编辑器数据。
  const { api } = useEditorStore.getState();
  const ejData = await api.save();
  // get the last block
  let prevContext = ""
  let background = "";
  if (prevContext !== "" && context !== "") {
    background = `(${prevContext}) AND ( ${context})`;
  } else if (prevContext !== "" && context === "") {
    background = prevContext;
  } else if (prevContext === "" && context !== "") {
    background = context;
  }

  const message = background !== "" ?
    "This is the context:\n" + background + "\n---end context ---\n\n" + query
    : query;
  let categoricalDims = await generateCategoricalDimensions(message, DatabaseManager.getDimensionSize(), 6);
  if (categoricalDims === null) {
    console.error("Failed to generate categorical dimensions.");
    return { "categorical": {}, "ordinal": {}, "status": 1 };
  }
  let ordinalDims = await generateOrdinalDimensions(message, DatabaseManager.getDimensionSize());
  if (ordinalDims === null) {
    console.error("Failed to generate ordinal dimensions.");
    return { "categorical": {}, "ordinal": {}, "status": 1 };
  }
  let res = {}

  for (let i = 0; i < 5; i++) {
    total += 1;
    if (i === 4) {
      if (validateFormatForDimensions(categoricalDims, false, true)) {
        let result;
        if (categoricalDims.startsWith("```json") && categoricalDims.endsWith("```")) {
          // 使用 slice 截取去掉前面的 ```json 和后面的 ```
          const cleanedJsonString = categoricalDims.slice(7, -3).trim();
          // 解析为 JavaScript 对象
          result = JSON.parse(cleanedJsonString);
          categoricalDims = cleanedJsonString;
        }
        else {
          result = JSON.parse(categoricalDims);
        }
        res["categorical"] = result;
        break
      }
    };
    if (validateFormatForDimensions(categoricalDims, false, false)) {
      let result;
      if (categoricalDims.startsWith("```json") && categoricalDims.endsWith("```")) {
        // 使用 slice 截取去掉前面的 ```json 和后面的 ```
        const cleanedJsonString = categoricalDims.slice(7, -3).trim();
        // 解析为 JavaScript 对象
        result = JSON.parse(cleanedJsonString);
        categoricalDims = cleanedJsonString;
      }
      else {
        result = JSON.parse(categoricalDims);
      }
      res["categorical"] = result;
      break
    };
    // If first response fails, generate at high temperature
    fail += 1;
    categoricalDims = await generateCategoricalDimensions(message, DatabaseManager.getDimensionSize(), 6)
  }

  for (let i = 0; i < 5; i++) {
    total += 1;
    if (i === 4) {
      if (validateFormatForDimensions(ordinalDims, false, true)) {
        let result;
        if (ordinalDims.startsWith("```json") && ordinalDims.endsWith("```")) {
          // 使用 slice 截取去掉前面的 ```json 和后面的 ```
          const cleanedJsonString = ordinalDims.slice(7, -3).trim();
          // 解析为 JavaScript 对象
          result = JSON.parse(cleanedJsonString);
          ordinalDims = cleanedJsonString;
        }
        else {
          result = JSON.parse(ordinalDims);
        }
        res["ordinal"] = result;
        break
      }
    };
    if (validateFormatForDimensions(ordinalDims, false, false)) {
      // add ordinal dimensions to the categorical dimensions
      // Object.entries(JSON.parse(ordinalDims)).forEach(([key, value]) => {
      //     res["categorical"][key] = value;
      // });
      // break
      let result;
      if (ordinalDims.startsWith("```json") && ordinalDims.endsWith("```")) {
        // 使用 slice 截取去掉前面的 ```json 和后面的 ```
        const cleanedJsonString = ordinalDims.slice(7, -3).trim();
        // 解析为 JavaScript 对象
        result = JSON.parse(cleanedJsonString);
        ordinalDims = cleanedJsonString;
      }
      else {
        result = JSON.parse(ordinalDims);
      }
      res["ordinal"] = result;
      break
    };
    fail += 1;
    ordinalDims = await generateOrdinalDimensions(message, DatabaseManager.getDimensionSize());
  }
  if (res) {
    // const end = new Date().getTime();
    // console.log("Time to generate dimensions: ", end - start, "ms");
    // console.log("Failed to generate dimensions: ", fail, "out of", total);
    res["status"] = 0;
    return res
  }
  // const end = new Date().getTime();
  // console.log("Time to generate dimensions: ", end - start, "ms");
  // console.log("Failed to generate dimensions: ", fail, "out of", total);
  // did not get a valid response after 5 tries
  console.log("[Error]", "failed to get a valid response")
  return { "categorical": {}, "ordinal": {}, "status": 2 };
}

export async function generateCategoricalDimensions(prompt, catNum, valNum, temperature = TEMPERATURE) {
  const message = nominalDimensionDef + `list ${catNum} nominal dimensions and associated ${valNum} possible values
     on which we can categorize and assess the content for the prompt: ${prompt}
    ####
    You MUST answer in the following JSON object format, wrapped in curly braces. There must be ${catNum} items in the JSON object:
    {"<dimension name #1>": [<${valNum} values for this dimension>],..., "<dimension name #${catNum}>" : [<${valNum} values for this dimension>]}
    `
  const messages = [{ "role": "user", "content": message }]
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getEnvVal('VITE_OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        temperature: temperature,
        max_tokens: MAX_TOKEN_BIG,
        top_p: TOP_P,
        stream: false
      }),
    });
    if (!response.ok) {
      throw new Error(`[Error] HTTP error! status: ${response.status}`);
    }
    const reader: any = response.body?.pipeThrough(new TextDecoderStream()).getReader();
    const { value, done } = await reader.read();
    const gpt_response = JSON.parse(value)["choices"][0]
    console.log("类别维度：", gpt_response);
    return gpt_response["message"]["content"];

  } catch (e) {
    let toast = new bootstrap.Toast(document.getElementById('error-toast'));
    document.getElementById('error-toast-text').textContent = "API Key Error";
    toast.show();
    console.log(e);
    return null;
  }
}

export async function generateOrdinalDimensions(prompt, catNum) {
  const message = `list ${catNum} ordinal dimensions
   on which we can assess the outcome for the prompt: ${prompt} to what extent represents the dimensions
  ####
  answer in the following JSON format: 
  {
      "<dimension name>": ["<lowest degree>", "least", "moderate", "most", "<highest degree>"]
  }`
  const messages = [{ "role": "user", "content": message }]
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getEnvVal('VITE_OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKEN_BIG,
        top_p: TOP_P,
        stream: false
      }),
    });
    if (!response.ok) {
      throw new Error(`[Error] HTTP error! status: ${response.status}`);
    }
    const reader: any = response.body?.pipeThrough(new TextDecoderStream()).getReader();
    const { value, done } = await reader.read();
    const gpt_response = JSON.parse(value)["choices"][0]
    console.log("ordinal dimensions", gpt_response);
    return gpt_response["message"]["content"];
  } catch (e) {
    console.log(e);
    return null;
  }
}

export async function generateNumericalDimensions(prompt, numNum) {
  const message = `list ${numNum}  numerical dimensions on which we can assess
     the story for the prompt: ${prompt} 
    ####
    no length/grammar/word count related dimensions are allowed
    no infinities or NaNs are allowed
    ####
    answer in the following JSON format: 
    {
        "<dimension name>": [<lowest value>, <highest value>]
    }`;
  const messages = [{ "role": "user", "content": message }]
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getEnvVal('VITE_OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: MAX_TOKEN_SMALL,
      top_p: TOP_P,
    }),
  });
  const reader: any = response.body?.pipeThrough(new TextDecoderStream()).getReader();
  const { value, done } = await reader.read();
  const gpt_response = JSON.parse(value)["choices"][0]
  console.log("数字维度：", gpt_response);
  return gpt_response["message"]["content"];
}



export async function highlightTextBasedOnDimension(dimension, val, text) {
  let result = await getRelatedTextBasedOnDimension(dimension, val, text);
  for (let i = 0; i < 5; i++) {
    if (validateFormatForHighlight(result)) {
      console.log("all related", result)
      return result;
    };
    result = await getRelatedTextBasedOnDimension(dimension, val, text);
  }
  // did not get a valid response after 5 tries
  console.log("failed to get a valid response")
  return null;
}

export async function getRelatedTextBasedOnDimension(dimension, val, text) {
  // given a dimension, highlight the text that is related to the dimension
  // return a html string with the highlighted text in the span tag
  const message = `list 3 excerpts of the text that reflect the dimension: ${dimension} ${val}  
    ####
    the story is: ${text}
    ####
    Don't include any text other than the json
    Don't show Answer at the beginning of the response
    ####
    answer in the following JSON format: 

    {
        "1": "<original text 1>", 
        "2": "<original text 2>", 
        "3": "<original text 3>"
    }`;
  const messages = [{ "role": "user", "content": message }]
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getEnvVal('VITE_OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: messages,
      temperature: 0,
      max_tokens: 256,
      top_p: TOP_P,
    }),
  });
  const reader: any = response.body?.pipeThrough(new TextDecoderStream()).getReader();
  const { value, done } = await reader.read();
  const gpt_response = JSON.parse(value)["choices"][0]
  console.log("relate text", gpt_response);
  return gpt_response["message"]["content"];

}


/*validate the format of the response
  return true if the response is in the correct format
  return false if the response is not in the correct format
*/
export function validateFormatForDimensions(response: string, isNumerical: boolean, isLast: boolean) {
  try {
    // check if the response is in the JSON format
    // 判断是否以 ```json 开头并以 ``` 结尾
    let result;
    if (response.startsWith("```json") && response.endsWith("```")) {
      // 使用 slice 截取去掉前面的 ```json 和后面的 ```
      const cleanedJsonString = response.slice(7, -3).trim();
      // 解析为 JavaScript 对象
      result = JSON.parse(cleanedJsonString);
    }
    else {
      result = JSON.parse(response);
    }
    console.log("response解析成对象", result);

    // check if the number of dimensions is correct
    console.log("result length", Object.keys(result).length);
    console.log("dimension size", DatabaseManager.getDimensionSize());
    // if (Object.keys(result).length !== DatabaseManager.getDimensionSize()){
    //     console.log("[Error] wrong number of dimensions", result);
    //     if (isLast){
    //       var toast = new bootstrap.Toast(document.getElementById('error-toast'));
    //       const err = document.getElementById('error-toast-text');
    //       if (err) {
    //         err.textContent = "Supposed to have " + DatabaseManager.getDimensionSize() + " dimensions. Yet, got " + Object.keys(result).length + " dimensions";
    //         toast.show();
    //       }
    //     }
    //     return false;
    // }
    return true;

  }
  catch (e) {
    console.log("[Error] " + e, response);
    if (isLast) {
      var toast = new bootstrap.Toast(document.getElementById('error-toast'));
      const err = document.getElementById('error-toast-text');
      if (err) {
        err.textContent = "解析回答为JSON失败，请检查返回的内容是否满足JSON";
        toast.show();
      }
    }
    return false
  }
}


export async function getKeyTextBasedOnDimension(kvPairs, text) {
  // given several dimensions, return 3 sentences that reflect the dimension values

  // kvPairs is a list of key value pairs, break it into a string
  let valReq = "";
  for (let i = 0; i < kvPairs.length; i++) {
    valReq += `${kvPairs[i]['dimension']} : ${kvPairs[i]['value']}`
  }

  const message = `list up to 3 excerpts of the text that reflect the dimension: ${valReq}  
  ####
  the story is: ${text}
  ####
  Don't include any text other than the json
  Don't show Answer at the beginning of the response
  ####
  answer in the following JSON format: 

  {
      "1": "<original text 1>", 
      "2": "<original text 2>", 
      "3": "<original text 3>"
  }`;
  const messages = [{ "role": "user", "content": message }]
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getEnvVal('VITE_OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: messages,
      temperature: 0,
      max_tokens: 256,
      top_p: 1,
    }),
  });
  const reader: any = response.body?.pipeThrough(new TextDecoderStream()).getReader();
  const { value, done } = await reader.read();
  const gpt_response = JSON.parse(value)["choices"][0]
  console.log("根据维度生成text", gpt_response);
  let result = gpt_response["message"]["content"];
  // only grep the {} part
  result = result.substring(result.indexOf("{"), result.lastIndexOf("}") + 1);
  return result;
}


export function validateFormatForHighlight(response: string) {
  // validate the format of the response
  // return true if the response is in the correct format
  // return false if the response is not in the correct format
  try {
    // check if the response is in the JSON format
    let result;
    if (response.startsWith("```json") && response.endsWith("```")) {
      // 使用 slice 截取去掉前面的 ```json 和后面的 ```
      const cleanedJsonString = response.slice(7, -3).trim();
      // 解析为 JavaScript 对象
      result = JSON.parse(cleanedJsonString);
    }
    else {
      result = JSON.parse(response);
    }
    console.log("response解析成对象", result);
    //  check if there are any infinities or NaNs
    for (const [key, value] of Object.entries(result)) {
      if (key !== "1" && key !== "2" && key !== "3") {
        console.log("invalid key", key);
        return false;
      }
    }
    return true
  }
  catch (e) {
    console.log(e);
    return false
  }
}

export async function reviseResponseWithNewDimensionLabel(dimensionName, labels, response) {
  // revise the response with the new dimension label
  // return the revised response
  let result = await getRelatedTextBasedOnDimension(dimensionName, labels[0], response);
  for (let i = 0; i < 5; i++) {
    if (validateFormatForHighlight(result)) {
      console.log("all related", result)
      return result;
    };
    result = await getRelatedTextBasedOnDimension(dimensionName, labels[0], response);
  }
  // did not get a valid response after 5 tries
  console.log("failed to get a valid response")
  return null;
}
