import useCurrStore from "../store/use-curr-store";
import useResponseStore from "../store/use-response-store";
import useEditorStore from "../store/use-editor-store";
import DatabaseManager from "../db/database-manager";
import useSelectedStore from "../store/use-selected-store";
import * as bootstrap from 'bootstrap';
import { uuid, getEnvVal } from "./util";
import { generateCategoricalDimensions, validateFormatForDimensions } from "./gpt-util";
//实现了一个与 OpenAI API 交互的复杂逻辑，用于根据给定的维度和要求生成多个响应，并将这些响应处理后存储在数据库中。
//它集成了多个状态管理器和实用工具函数，用于生成上下文、格式化请求，并对返回的结果进行摘要。
const DELIMITER = "####";
const MAX_TOKEN_BIG = 3500;
const MAX_TOKEN_SMALL = 1000;
const MODEL = import.meta.env.VITE_MODEL_NAME; //修改了模型名称
const BASE_URL = import.meta.env.VITE_BASE_URL;
const TEMPERATURE = 0.7;
const TOP_P = 1;

let fail_count = 0;
let total_count = 0;
let firstId = '';

async function editorBackgroundPrompt() {
    //该函数从 useEditorStore 获取编辑器的当前状态，并提取最后一个块的内容作为“上下文”。
// 根据上下文的存在情况，生成一个背景信息，并返回给调用者。
// 如果上下文和前一个内容都存在，则将它们组合起来。
    let context=""; // FIXME: unknown context
    const {api} = useEditorStore.getState();
    const ejData = await api.save();
    // get the last block
    let prevContext;
    if (ejData.blocks.length === 0 ){
        prevContext = "";
    } else {
        prevContext = ejData.blocks[ejData.blocks.length - 1].data.text;
    }
    let background = "";
    if (prevContext != "" && context != ""){
        background = `(${prevContext}) AND (${context})`;
    } else if (prevContext != "" && context == ""){
        background = prevContext;
    } else if (prevContext == "" && context != ""){
        background = context;
    }
    return background !== "" ? "This is the context:\n" + background + "\n---end context ---\n\n" : "";
}

/*  
根据维度要求生成多个基于 GPT 模型的响应，并存储这些响应。
它包含了对维度的操作、批量处理、错误处理、摘要生成等复杂逻辑，并依赖于多个状态管理器和数据库管理工具。
    for each dimension, randomly choose a value
    if the dimension is categorical, choose a value from the list
    if the dimension is continuous, choose a value from the range
    concatenate the values into a string
    concatenate the string with the prompt
    use the OpenAI API to generate a response 
*/
export async function buildSpace(currBlockId, dimensions, numResponses, prompt, context){
    let { dimReqs, data } = genDimRequirements(dimensions, numResponses);
    const { api } = useEditorStore.getState();
    const { maxBlockId, setMaxBlockId } = useCurrStore.getState();
    const { setSelectedResponse } = useSelectedStore.getState();

    let fail_count = 0;
    let total_count = dimReqs.length;
    const processResponses = async (reqs) => {
        return Promise.all(reqs.map(async (req) => {
            try {
                const id = req["ID"];
                const wordLimit = "Limit the response to 150 words.\n####\n";
                const requirements = req["Requirements"];
                const message = `${wordLimit}${editorBackgroundPrompt()} Prompt: ${prompt}\n####\nRequirements: ${requirements}`;
                const response = await generateResponse(message);
                const trimmedResponse = response.trim();
                const summary = await abstraction(trimmedResponse);

                if (id === useResponseStore.getState().responseId){
                    useResponseStore.getState().setResponse(response);
                }

                // Update the data object for each requirement
                data[id] = {
                    ...data[id],
                    Prompt: message,
                    Context: context,
                    Result: trimmedResponse,
                    IsMyFav: false,
                    Summary: summary["Summary"],
                    Keywords: summary["Key Words"],
                    Structure: summary["Structure"],
                    Title: summary["Title"],
                };
                // Handle selected response logic as per your application's needs
                if (id === firstId) {
                    setSelectedResponse(currBlockId, data[id]);
                }
                return data[id];
            } catch (error) {
                console.error(`Error processing response for ID ${req["ID"]}:`, error);
                fail_count++;
                return null; // or handle as appropriate for your error management
            }
        }));
    };

    const batchSize = 20;
    for (let i = 0; i < dimReqs.length; i += batchSize) {
        const batch = dimReqs.slice(i, i + batchSize);
        await processResponses(batch);
    }

    // Store the responses and update state
    DatabaseManager.putAllData(currBlockId, data);
    const setCurrBlockId = useCurrStore.getState().setCurrBlockId;
    setCurrBlockId(currBlockId);
    setMaxBlockId(maxBlockId + 1);

    return {"fail_count": fail_count, "total_count": total_count};
}

/**
 * Given the current state of the nodes, selected dimension labels, generate more nodes in that space.
 * labels: Label[] -> {dimensionId, name, type}[]
 */
export async function growSpace(currBlockId, dimensionMap, labels, numResponses, prompt, nodeMap, setNodeMap){
    // generate a list of requirements for each dimension
    let {dimReqs, data} = genFilteredDimRequirements(dimensionMap, numResponses);
    // let {dimReqs, data} = genLabelRequirements(dimensionMap, labels, numResponses);
    // generate a response for each requirement
    const startTime = Date.now();
    let responses = [];
    console.log("dimReqs", dimReqs);
    const responsePromises = dimReqs.map(async (req) => {
        // parse req to get id and requirements
        const id = req["ID"];
        const wordLimit = "Limit the response to 150 words.\n\n"
        const requirements = req["Requirements"];
        const message = wordLimit + editorBackgroundPrompt() + "Prompt: " + prompt + "\n" + DELIMITER + "\n" + "Requirements: " + requirements + "\n" + DELIMITER + "\n";
        // Call the generateResponse function to generate a response for each requirement
        const response = await generateResponse(message);
        // store the response in the data
        // let data: any;
        data[id]["Prompt"] = message;
        data[id]["Result"] = response;
        const summary = await abstraction(response);
        data[id]["Summary"] = summary["Summary"];
        data[id]["Keywords"] = summary["Key Words"];
        data[id]["Structure"] = summary["Structure"];
        data[id]["Title"] = summary["Title"];
        data[id]["IsMyFav"] = false;
    });
    await Promise.all(responsePromises);
    const endTime = Date.now();
    console.log("Time to generate " + numResponses + " responses: " + (endTime - startTime) + "ms");
    setNodeMap({
        ...nodeMap,
        ...data,
    })
    DatabaseManager.addBatchData(currBlockId, data);
    return {"fail_count": fail_count, "total_count": total_count};
}

export async function addLabelToSpace(dimensionMap, newLabel, numResponses, prompt, nodeMap, setNodeMap) {
        // generate a list of requirements for each dimension
        let {dimReqs, data} = genLabelDimRequirements(dimensionMap, newLabel, numResponses);
        // let {dimReqs, data} = genLabelRequirements(dimensionMap, labels, numResponses);
        const {maxBlockId, setMaxBlockId} = useCurrStore.getState();
        // generate a response for each requirement
        const startTime = Date.now();
        let responses = [];
        console.log("dimReqs", dimReqs);
        const responsePromises = dimReqs.map(async (req) => {
            // parse req to get id and requirements
            const id = req["ID"];
            const wordLimit = "Limit the response to 150 words.\n####\n"
            const requirements = req["Requirements"];
            const message = wordLimit + editorBackgroundPrompt() + "Prompt: " + prompt + "\n" + DELIMITER + "\n" + "Requirements: " + requirements + "\n" + DELIMITER + "\n";
            // Call the generateResponse function to generate a response for each requirement
            const response = await generateResponse(message);
            // store the response in the data
            // let data: ResponseData = {};
            data[id]["Prompt"] = message;
            data[id]["Result"] = response;
            const summary = await abstraction(response);
            data[id]["Summary"] = summary["Summary"];
            data[id]["Keywords"] = summary["Key Words"];
            data[id]["Structure"] = summary["Structure"];
            data[id]["Title"] = summary["Title"];
            data[id]["IsMyFav"] = false;
        });
        await Promise.all(responsePromises);
        const endTime = Date.now();
        console.log("Time to generate " + numResponses + " responses: " + (endTime - startTime) + "ms");
        console.log(data);
    
        setNodeMap({
            ...nodeMap,
            ...data,
        })
        const {currBlockId} = useCurrStore.getState();
        DatabaseManager.addBatchData(currBlockId, data);
        return {"fail_count": fail_count, "total_count": total_count};
}

/**
 * 处理 GPT 模型的生成请求，通过指定的维度生成类似的节点，并将生成的结果存储在数据库中
 * 生成多个类似节点：通过遍历 [0, 1, 2, 3, 4]，为每个节点生成一个新 ID，并创建一个包含 Prompt（提示）和其他信息的新节点。
调用 GPT 生成响应：每个节点都会调用 generateResponse 函数，根据 message 调用 OpenAI API 生成响应。
生成摘要和关键字：每个响应生成后，会通过 abstraction 提取摘要、关键词、结构和标题，并存储在数据对象中。
将节点数据存储到数据库中：最后，通过 DatabaseManager.addBatchData 将新生成的节点数据批量存储到数据库中。
 * Given the current state of the nodes, selected dimension labels, generate more nodes in that space.
 * labels: Label[] -> {dimensionId, name, type}[]
 */
export async function addSimilarNodesToSpace(node, nodeMap, setNodeMap){
    // generate a response for each requirement
    const startTime = Date.now();
    const data = {};
    // let data: ResponseData = {};
    const responsePromises = [0,1,2,3,4].map(async (i) => {
        // parse req to get id and requirements
        const id = uuid();
        const wordLimit = "Limit the response to 150 words.\n\n"
        const message = wordLimit + editorBackgroundPrompt() + "Prompt: " + node.Prompt;
        // Call the generateResponse function to generate a response for each requirement
        const response = await generateResponse(message);
        // store the response in the data
        data[id] = {
            ...node,
            ID: id,
        }
        data[id]["Prompt"] = message;
        data[id]["Result"] = response;
        const summary = await abstraction(response);
        data[id]["Summary"] = summary["Summary"];
        data[id]["Keywords"] = summary["Key Words"];
        data[id]["Structure"] = summary["Structure"];
        data[id]["Title"] = summary["Title"];
        data[id]["IsMyFav"] = false;
        data[id]["IsNew"] = true; // when generting dots via see more
    });
    await Promise.all(responsePromises);
    const endTime = Date.now();
    console.log(data)
    setNodeMap({
        ...nodeMap,
        ...data,
    })
    const {currBlockId} = useCurrStore.getState();
    DatabaseManager.addBatchData(currBlockId, data);
    return {"fail_count": fail_count, "total_count": total_count};
}


async function generateResponse(message){
    // 调用 OpenAI API：通过 fetch 方法向 OpenAI API 发送 POST 请求，传入模型、提示（prompt）、最大 tokens 数量等参数。
// 处理响应流：使用 TextDecoderStream 处理响应流并读取返回的结果。
// 错误处理：在捕获异常时，增加失败计数，并返回 "Error" 字符串表示调用失败。
    const messages = [{"role": "user", "content": message}]
    try{
        /* text-davinci-003 */
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
            max_tokens: MAX_TOKEN_BIG,
            top_p: TOP_P,
            stream: false
            }),
        });
        const reader = response.body?.pipeThrough(new TextDecoderStream()).getReader();
        if (!reader) {
            throw new Error('No reader found');
        }
        const {value, done} = await reader.read();
        total_count += 1; // increment total count
        if (value){
            const gpt_response = JSON.parse(value)["choices"][0]
            console.log("response:", gpt_response);
            return gpt_response["message"]["content"];
        } else {
            throw new Error('No value found');
        }
    } catch (error) {
        fail_count += 1; // increment fail count
        total_count += 1; // increment total count
        console.log(error);
        return "Error";
    }
}


function genDimRequirements(dimensions, numResponses){
    //生成维度要求：对于每个响应，生成一个唯一 ID，并为类别型和序数型维度选择随机值，作为要求条件。
    // 返回值：返回一个包含维度要求和对应数据的对象，供后续调用使用。
    // generate a list of requirements for each dimension
    // return a list of requirements
    // **** IMPORTANT ****
    // the ID of the requirement is the (index + 1) of the requirement in the list
    let dimReqs = [];
    let data = {};
    for (let i = 0; i < numResponses; i++){
        let req = ""
        let datum = {};
        datum["ID"] = uuid();
        if ( useResponseStore.getState().responseId === null){
            useResponseStore.getState().setResponseId(datum["ID"]);
            useCurrStore.getState().setCurrDataId(datum["ID"]);

        }
        datum["Dimension"] = {"categorical": {}, "numerical": {}, "ordinal": {}};
        Object.entries(dimensions["categorical"]).forEach(([d, v]) => {
            // choose a random value from v
            let randVal = v[Math.floor(Math.random() * v.length)];
            req += d + ": " + randVal + "\n";
            datum["Dimension"]["categorical"][d] = randVal;
        });
        /* Comemnt out this part if you don't want ordinal dimension */
        Object.entries(dimensions["ordinal"]).forEach(([d, v]) => {
            // choose a random value from v
            let randVal = v[Math.floor(Math.random() * v.length)];
            req += d + ": " + randVal + "\n";
            datum["Dimension"]["ordinal"][d] = randVal;
        });
        dimReqs.push({"ID": datum["ID"], "Requirements": req});
        data[datum["ID"]] = datum;
    }
    return {dimReqs, data};
}

function genFilteredDimRequirements(dimensionMap, numResponses){
    // generate a list of requirements for each dimension
    // return a list of requirements
    // **** IMPORTANT ****
    // the ID of the requirement is the (index + 1) of the requirement in the list
    let dimReqs = [];
    let data = {};
    // console.log("numResponse", numResponses);
    for (let i = 0; i < numResponses; i++){
        let req = ""
        let datum = {};
        datum["ID"] = uuid();
        datum["Dimension"] = {"categorical": {}, "numerical": {}, "ordinal": {}};
        Object.values(dimensionMap).forEach((dimension) => {
            let values = [];
            if (dimension.filtered && dimension.filtered.length > 0) {
                values = dimension.filtered;
            } else {
                values = dimension.values;
            }
            let randVal = values[Math.floor(Math.random() * values.length)];
            req += dimension.name + ": " + randVal + "\n";
            datum["Dimension"][dimension.type][dimension.name] = randVal;
        })
        console.log(req)
        dimReqs.push({"ID": datum["ID"], "Requirements": req});
        data[datum["ID"]] = datum;
    }
    return {dimReqs, data};
}

/**
 * Hardcoded to add one new label
 */
function genLabelDimRequirements(dimensionMap, label, numResponses){
    // generate a list of requirements for each dimension
    // return a list of requirements
    // **** IMPORTANT ****
    // the ID of the requirement is the (index + 1) of the requirement in the list
    let dimReqs = [];
    let data = {};
    // console.log("numResponse", numResponses);
    for (let i = 0; i < numResponses; i++){
        let req = ""
        let datum = {};
        datum["ID"] = uuid();
        datum["Dimension"] = {"categorical": {}, "numerical": {}, "ordinal": {}};
        Object.values(dimensionMap).forEach((dimension) => {
            let values = [];
            if (dimension.id === label.dimensionId) {
                values = [label.name]
            } else {
                values = dimension.values;
            }
            let randVal = values[Math.floor(Math.random() * values.length)];
            req += dimension.name + ": " + randVal + "\n";
            datum["Dimension"][dimension.type][dimension.name] = randVal;
        })
        console.log(req)
        dimReqs.push({"ID": datum["ID"], "Requirements": req});
        data[datum["ID"]] = datum;
    }
    return {dimReqs, data};
}
//调用 summarizeText 函数生成摘要，处理响应。
// 使用正则表达式清理标题中的不必要符号。
// 尝试 5 次获取有效响应，若 5 次失败，则显示错误提示。

export async function abstraction(text){
  let response = await summarizeText(text);
  response = response.substring(response.indexOf("{"), response.lastIndexOf("}") + 1);

  for (let i = 0; i < 5; i++){
    if (validateFormatForSummarization(response)) {
        const responseJson = JSON.parse(response);
        // using regular expression to remove the '' or <> before and after first and last letter in title
        responseJson["Title"] = responseJson["Title"].replace(/(^['<])|(['>]$)/g, '');
        return {"Key Words": responseJson["Key Words"], "Summary": responseJson["Summary"], "Structure": responseJson["Structure"], "Title": responseJson["Title"]};
    };
    response =  await summarizeText(text);
    response = response.substring(response.indexOf("{"), response.lastIndexOf("}") + 1);
  }
  // did not get a valid response after 5 tries
  // make toasts to notify the user
    var toast = new bootstrap.Toast(document.getElementById('error-toast'));
    document.getElementById('error-toast-text').textContent = "Error: Failed to generate the summary. Please try again.";
    toast.show();
    return {"Key Words": [], "Summary": "", "Structure": "", "Title": ""};
  
}
//调用 OpenAI API 生成给定文本的摘要，关键词，结构和标题。
async function summarizeText(text){
    const message = `Given following text, return key words and a one sentence summary, a structure , and a title of the text.
      ####
      Text is: ${text}
      ####
      Don't include any text other than the json
      Word limit of the summary text is 20 words
      Word limit of the title is 5 words
      Maximum 5 key words
      ####
      Should be in the following JSON format: 
      {
          "Key Words": ["<key word 1>", "<key word 2>", ...], 
          "Summary": "<summary>",
          "Structure": "<part 1>-<part 2>-<part 3>...",
          "Title": "<title>"
      }`;
    const messages = [{"role": "user", "content": message}]
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
    const reader = response.body?.pipeThrough(new TextDecoderStream()).getReader();
    if (!reader) {
        throw new Error('No reader found');
    }
    const {value, done} = await reader.read();
    if (value){
        const gpt_response = JSON.parse(value)["choices"][0]
        console.log("text summary", gpt_response);
        return gpt_response["message"]["content"];
    } else {
        throw new Error('No value found');
    }
  }

/*  验证Summarization的格式
    return true if the response is in the correct format
    return false if the response is not in the correct format 
*/
function validateFormatForSummarization(response){
    try {
        // check if the response is in the JSON format
        // only care about the text in between the {}
        const result = JSON.parse(response);
        // console.log("result format",result);
        //  check if there are any infinities or NaNs
        for (const [key, value] of Object.entries(result)) {
            if (key !== "Summary" && key !== "Structure" && key !== "Key Words" && key !== "Title"){
                console.log("invalid key", key);
                return false;
            }
            // check if the value in Key Words is a list
            if (key === "Key Words"){
                if (!Array.isArray(value)){
                    console.log("invalid value", value);
                    return false;
                }
            }
        }
        total_count += 1; // increment total count
        return true
    }
    catch (e) {
        console.log(e);
        fail_count += 1; // increment fail count
        total_count += 1; // increment total count
        return false
    }
  }


/*validate the format of the response
  return true if the response is in the correct format
  return false if the response is not in the correct format
  验证响应是否为有效的 JSON 格式，用于检查生成的维度数据是否符合要求。
*/
export function validateFormatForAddingDimensions(response){
    try {
        // check if the response is in the JSON format
        const result =  JSON.parse(response);
        // check if the number of dimensions is correct
        return true;
        
    }
    catch (e) {
        console.log("[Error] " + e, response);
        if (isLast){
          var toast = new bootstrap.Toast(document.getElementById('error-toast'));
          const err = document.getElementById('error-toast-text');
          if (err) {
            err.textContent = "Encountered errors when parsing the JSON response from OpenAI";
            toast.show();
          }
        }
        return false
    }
  }

/**
 * Given the current dimensions, generate a brand new dimension and its labels.
 * For each response, select a random value of the dimension.
 * Update that response to also include that dimension label.
 * abstraction() of that new response
 * 
 * 
 * Not doing this: Then, for each response, apply one of the dimension labels to the current response.
 * 添加一个新维度到现有维度映射 dimensionMap 中，并为每个响应分配一个新的维度标签。
 */
export async function addNewDimension(prompt, dimensionName, dimensionMap, setDimensionMap, nodeMap, setNodeMap) {
    let newDimResponse = await createLabelsFromDimension(prompt, dimensionName);
    let newDimension = null;
    for (let i = 0; i < 5; i++){
        if (validateFormatForAddingDimensions(newDimResponse)) {
            newDimension = JSON.parse(newDimResponse);
            break
        };
        newDimResponse = await createLabelsFromDimension(prompt, dimensionName)
    }
    // separate the dimension name and values
    if (!newDimension) {
        console.log('failed add new dimension. Please try again.');
        var toast = new bootstrap.Toast(document.getElementById('error-toast'));
        var msg = document.getElementById('error-toast-text');
        if (msg) {
            msg.textContent = "Failed add a new dimension. Please try again.";
            toast.show();
        }
        return;
    }
    var toast = new bootstrap.Toast(document.getElementById('fav-toast'));
    var msg = document.getElementById('toast-text');
      if (msg) {
        msg.textContent = "New dimension added.";
        toast.show();
    }


    const name = Object.keys(newDimension)[0];
    const values = Object.values(newDimension)[0];

    // Add dimension to dimension Map
    dimensionMap[name] = {
        id: Object.keys(dimensionMap).length,
        name: name,
        type: "categorical",
        values: values,
        filtered: [],
    }
    setDimensionMap(dimensionMap);
    console.log("dimensionMap", dimensionMap);
    // update dimensiosn in the local storage
    const newDimensionToStore = {
        "name": name,
        "type": "categorical",
        "values": values,
    }
    const {currBlockId} = useCurrStore.getState();
    DatabaseManager.postDimension(currBlockId, name, newDimensionToStore) 

    // for each response, run reviseResponseWithNewDimensionLabel
    const assignLabelPrompt = 
        `\nThis is the newly added dimension: ${dimensionName}
        ####
        these are the dimension values: [${values.join(', ')}]
        ####
        Assign a value from the dimension ${dimensionName} to the following response.`
    const data = {};
    const responsePromises = Object.entries(nodeMap).map(async ([id, node], i) => {
        try{
            const wordLimit = "Limit the response to 150 words."
            const formatReq = `
            ####
            answer in the following JSON format: 
            {
                "label": "<label>"
            }`
            const assignLabelMessage = "Prompt: " + assignLabelPrompt + "####" + "Current response: " + node["Result"]+ "####" + formatReq;
            var labelResponse = await generateResponse(assignLabelMessage);
            var label = "";
            for (let i = 0; i < 5; i++){
                try {
                    label = JSON.parse(labelResponse)["label"];
                    break;
                } catch (error) {
                    labelResponse = await generateResponse(assignLabelMessage);
                }
            }
            // parse the response to get the dimension label
            const reviseResponsePrompt = `Revise this response such that it shows ${label} in the sense of ${dimensionName}.`;
            const reviseResponseMessage = wordLimit + "####" + "Prompt: " + reviseResponsePrompt + "####" + "Current response: " + node["Result"];
            var result = await generateResponse(reviseResponseMessage);
            result = result.trim();
            const summary = await abstraction(result);
            // add the new label to the Dimension - categorical
            node["Dimension"]["categorical"][dimensionName] = label;
            data[id] = {
                ...node,
                ID: id,
                Result: result,
                Summary: summary["Summary"],
                Keywords: summary["Key Words"],
                Structure: summary["Structure"],
                Title: summary["Title"],
            }
        } catch (error) {
            console.log(error);
            return;
        }
    })
     await Promise.allSettled(responsePromises);
    setNodeMap({
        ...data,
    });

    // get all the data from the local storage
    // DatabaseManager.getAllData(currBlockId);
    // update the data in the local storage

    // show a toast to notify the user
    DatabaseManager.addBatchData(currBlockId, data);
    var toast = new bootstrap.Toast(document.getElementById('fav-toast'));
    msg = document.getElementById('toast-text');
      if (msg) {
        msg.textContent = "Current responses updated.";
        toast.show();
    }
    return;

}

/*
 * Create new labels for a given dimension
为给定维度名称生成一组新的标签。
 */
async function createLabelsFromDimension(prompt, dimensionName){
    const message =  `Given a dimension name, return a list of labels for that dimension for the prompt ${prompt}
    ####
    Dimension name is: ${dimensionName}
    ####
    answer in the following JSON format: 
    {
        "${dimensionName}": ["<label 1>", "<label 2>", "<label 3>"]
    }`;
    const messages = [{"role": "user", "content": message}]
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
    const reader = response.body?.pipeThrough(new TextDecoderStream()).getReader();
    if (!reader) {
        throw new Error('No reader found');
    }
    const {value, done} = await reader.read();
    if (value){
        const gpt_response = JSON.parse(value)["choices"][0]
        console.log("labels  value", gpt_response);
        return gpt_response["message"]["content"];
    } else {
        throw new Error('No value found');
    }
}





