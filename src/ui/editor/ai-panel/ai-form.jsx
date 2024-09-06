import React, { useState, useEffect, useRef } from 'react';
import { Typography, InputBase, Paper, IconButton} from '@mui/material';
import {Send, Close} from '@mui/icons-material/';
import * as bootstrap from 'bootstrap';

import * as GPTUtil from '../../../util/gpt-util';
import * as SpaceUtil from '../../../util/space-generation-util';
import DatabaseManager from '../../../db/database-manager'; //DatabaseManager 用来管理数据库操作，例如存储和检索生成的维度数据。
import useResponseStore from '../../../store/use-response-store';
import useCurrStore from '../../../store/use-curr-store';
import useSelectedStore from '../../../store/use-selected-store';
import useEditorStore from '../../../store/use-editor-store';


import './ai-form.scss'

//使用 React 和 Material-UI 库开发的表单组件 AiForm，其中集成了与 OpenAI 的 GPT 模型通信、数据管理和动态 UI 交互的功能。
export default function AiForm({responseHandler, selectedContent}) {
    const [query, setQuery] = useState(selectedContent);        // 用户输入的查询文本。
    // const [showButtons, setShowButtons] = useState(false);      // showButtons is a boolean to show the buttons, true if response is not empty
    const aiPanelRef = useRef(null);                            // 引用表单中的 AI 面板元素。
    const [isSubmitting, setIsSubmitting] = useState(false);    // 用于控制表单提交状态。isSubmitting is a boolean to check if the form is submitting, true when submitting
    let currBlockId = useCurrStore.getState().maxBlockId + 1;   // currBlockId is the id of the new block
    const {response, setResponse, responseId, context} = useResponseStore(); // response is the response from the AI
    const [generationState, setGenerationState] = useState("dimension"); // generationState is the state of the generation, "dimension" or "response"
    const [firstRendered, setFirstRendered] = useState(true);   // firstRendered is a boolean to check if the response is rendered, true when first rendered
    const api = useEditorStore(state => state.api);
    const {selectedResponse, setSelectedResponse} = useSelectedStore();
    //用于动态生成并展示一个 Bootstrap Toast 消息，告诉用户生成了新的维度。
    const addToast = (d) => {
        const toast = document.createElement('div');
        toast.id = 'fav-toast' + d;
        toast.classList.add('toast', 'align-items-center', 'text-bg-secondary', 'border-0');
        toast.setAttribute('role', 'alert');
        toast.style.margin = '4px'; 
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');

        // Create the toast content
        const toastContent = `
        <div class="d-flex">
            <div class="toast-body" id="toast-text-${d}">
                生成了1个新的类别维度: ${d}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        `;

        toast.innerHTML = toastContent;
        // Append the toast to the toast container
        const toastContainer = document.getElementById('toast-container');
        if (toastContainer) {
            toastContainer.appendChild(toast);
        }
    }
    
    
    // 给定一个查询，生成新的分类和数值维度以及第一个响应的组合。
    async function generateDimensions(query, currBlockId) {
        const res = await GPTUtil.generateDimensions(query, context);
        // res status
        // 0: success
        // 1: 由于 API 调用失败，未能生成维度 
        // 2: 由于解析 API 响应时发生持续错误，未能生成响应
        if (res.status === 1) {
            console.log("[Error] failed to generate dimensions due to failed API call");
            let toast = new bootstrap.Toast(document.getElementById('error-toast'));
            document.getElementById('error-toast-text').textContent = "由于 API 调用失败，未能生成维度。请确保您的 API 密钥正确，然后重试。";
            toast.show();
            return {result: null, status: 1};
        }
        if (res.status === 2) {
            console.log("[Error] failed to generate dimensions due to constant error in parsing API response");
            let toast = new bootstrap.Toast(document.getElementById('error-toast'));
            document.getElementById('error-toast-text').textContent = "由于解析 API 响应时发生持续错误，未能生成维度。请重试。";
            toast.show();
            return {result: null, status: 1};
        }
        try{
            Object.entries(res["categorical"]).forEach(([d, v]) => {
                const data ={
                "name": d,
                "values": v,
                "type": "categorical"
                }
                // randome choose a value from the categorical dimension and
                DatabaseManager.postDimension(currBlockId, d, data);
                // add a new toast to toast-container
                addToast(d);
                // show a toast to indicate that the dimensions are generated
                let toast = new bootstrap.Toast(document.getElementById('fav-toast'+d));
                document.getElementById(`toast-text-${d}`).textContent = "New dimension: " + d;
                toast.show();

            });
            /* comment out when you do not want */
            Object.entries(res["ordinal"]).forEach(([d, v]) => {
                const data ={
                "name": d,
                "values": v,
                "type": "ordinal"
                }
                DatabaseManager.postDimension(currBlockId, d, data);
                addToast(d);
                // show a toast to indicate that the dimensions are generated
                let toast = new bootstrap.Toast(document.getElementById('fav-toast'+d));
                document.getElementById(`toast-text-${d}`).textContent = "New dimension: " + d;
                toast.show();
            });
            setGenerationState("response");
        }
        catch (error) {
            console.log("[Error] error when creating the space", error);
            let toast = new bootstrap.Toast(document.getElementById('error-toast'));
            document.getElementById('error-toast-text').textContent = "Failed to generate dimensions due to error in parsing JSON. Please try again.";
            toast.show();
            // remove all dimensions from the database
            DatabaseManager.deleteAllDimensions(currBlockId);
            return {result: null, status: 1};
        }

        return {result: res, status: 0};
    }

    async function diversifyResponses(currBlockId, query, dims) {
        //通过用户查询和生成的维度 (dims)，调用 SpaceUtil.buildSpace 创建响应的维度空间。
        //生成成功后通过 Bootstrap 的 Toast 组件展示一条提示消息，并记录所需时间。
        const startTime = Date.now();
        // generate the space
        const num = DatabaseManager.getBatchSize(); //batch size
        const onFinished = await SpaceUtil.buildSpace(currBlockId, dims, num, query, context);
        // make a toast to indicate that the space is generated
        var toast = new bootstrap.Toast(document.getElementById('fav-toast'));
        document.getElementById('toast-text').textContent = "Generated a space with " + num + " responses";
        toast.show();

        const endTime = Date.now();
        console.log("Time to complete the space generation of " + num + " responses: " + (endTime - startTime) + "ms");
        console.log("Finished generating space", "failed", onFinished["fail_count"], "total", onFinished["total_count"]);
        
    }
    //  更新用户输入的查询
    const handleInputChange = (e) => {
        setQuery(e.target.value);
    }

    // when user submits the query, generate a response
    // 阻止表单默认行为。
    // 检查输入的查询是否为空，若为空则显示错误信息。
    // 调用生成维度的异步函数 generateDimensions，生成成功后调用 diversifyResponses 生成响应。
    // 最终清空查询并重置提交状态。
    const submitListener = async (e) => {
        e.preventDefault();
        useResponseStore.setState({responseId: null});
        if (query === '' || query === undefined || query === null) {
            let toast = new bootstrap.Toast(document.getElementById('error-toast'));
            document.getElementById('error-toast-text').textContent = "Please enter a query";
            toast.show();
            return;
        }

        // 将加载锚点设置为 true，并禁用提交按钮。
        setFirstRendered(false);                // 在首次渲染后，InputBase 的值不再是 selectedContent，而是 query
        setIsSubmitting(true);                  // 提交期间，禁用 InputBase。
       
        // generate dimensions
        const dims = await generateDimensions(query, currBlockId);
        if (dims.status === 1) {
            setIsSubmitting(false);
            return;
        }
        await diversifyResponses(currBlockId, query, dims.result); // generate new dimensions from the query

        // after generating the space, change the generation state to space
        setIsSubmitting(false);
        setGenerationState("dimension");        // change back to dimension mode
        setQuery('');                           // clear the query for the next query
        // set the context to empty
        useResponseStore.setState({context: ''});
        // put the response into the database
        DatabaseManager.postBlock(currBlockId, query, response, responseId);
    }
    //第一个 useEffect 监听 response 的变化，当 AI 生成了新的响应时，会将响应内容插入到编辑器中并重置 responseId。
    useEffect(() => {
        if (response && query !== '') {
            setGenerationState("space");
            // Add the response to the blocks
            handleResponseFromAiForm({"text": response,"query":query, "id": currBlockId, "resId": responseId, "context": context});
            // reset the responseId to null
            useResponseStore.setState({responseId: null});
        }
    }, [response]);

    //第二个 useEffect 监听 context 的变化，根据 context 是否为空来控制上下文的显示与隐藏。
    useEffect(() => {
        // when context is not empty, then show the context-div; otherwise,hide it
        if (context !== '') {
            document.getElementById('context-div').classList.add('show');
            document.getElementById('chat-input')?.focus();
        } else {
            document.getElementById('context-div').classList.remove('show');
        }
    }, [context]);
    //将生成的 AI 响应以块的形式插入到 Editor.js 编辑器中，用于显示用户输入的查询及其相应的 AI 生成结果。
    const handleResponseFromAiForm = (response) => {
        // Check if the Editor.js instance is available
        try{
            const blockToAdd = {
                type: 'AiTool', 
                data: {
                  text: response.text,
                  id: response.id,
                  query: response.query,
                  context: response.context,
                  resId: response.resId,
                //   aiPanelRef: response.aiPanelRef
                }
            };
            api.blocks.insert(blockToAdd.type, blockToAdd.data, null, api.blocks.getBlocksCount());
    
        }
        catch (error) {
            console.log("[Error] error when inserting the block", error);
        }
    };
    //功能: 渲染表单，显示上下文信息并让用户输入查询。当 isSubmitting 为 true 时显示加载信息，否则显示输入框和提交按钮。
    //整个流程包括维度生成、空间生成、响应插入和用户反馈展示。
    return (
        // <div ref={aiPanelRef} style={{ width: '100%' , margin: 'auto'}}>
        <>
        <div className="context-div" id="context-div">
            {/* {context} */}
            {context}
            <IconButton id="close-button"
                onClick={() => {
                    // 设置上下文为空
                    useResponseStore.setState({context: ''});
                }}
            >
                <Close/>
            </IconButton>
        </div>
        <Paper
            component="form"
            id = "ai-form"
            sx={{ p: '2px 4px',  display: 'flex', alignItems: 'center', width: '100%', zIndex: '1000' ,
            background: '#fff',
            backdropFilter: 'blur(6px)',
            borderRadius: '12px',
            border: '2px solid #eee',
            outline: 'none',
            // color: #aaa;
            boxShadow: '0 0 35px 4px rgba(0,0,0,0.1)'
        
            }}
            onSubmit={submitListener}
        >
        {isSubmitting 
        ?  (
            <>
            <Typography variant="body1" component="div" style={{ padding: '10px' ,flex: '1'}}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{  textAlign: 'center', marginRight:"24px", color: '#9880ff'}}>
                    {(() => {
                        switch (generationState) {
                            case 'dimension':
                                return 'Determining important apsects ~10s';
                            case 'response':
                                return 'Generating your first response ~10s';
                            case 'space':
                                return 'Maybe you also want to see other responses... ~10s';
                            default:
                                return 'AI Is Generating ~30s';
                        }
                    })()}
                    </span>
                    <div className="dot-flashing"></div>
                </div>
            </Typography>
            </>
        )
        : <InputBase
            sx={{ ml: 1, flex: 1 }}
            placeholder="Ask AI for ideas"
            maxRows={6}
            multiline={true}
            inputProps={{ 'aria-label': 'Ask AI for ideas' }}
            id="chat-input"
            defaultValue = {firstRendered ? selectedContent : query}
            onChange={handleInputChange} // Handle input changes
            onKeyDown={
                (e) => {
                    if (e.key === 'Enter' && e.shiftKey) {
                        e.preventDefault();
                        document.getElementById('chat-input').value += '\n';
                        // change the rows of the inputbase
                        document.getElementById('chat-input').rows += 1;
                        return
                    }
                    if (e.key === 'Enter') {
                        submitListener(e);
                    }
                }
            }   
        />}
        <IconButton type="submit" sx={{ p: '10px' }} aria-label="submit" disabled={isSubmitting}>
            <Send/>
        </IconButton>
        </Paper>
        </>
    );
}