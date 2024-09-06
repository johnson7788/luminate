import {ScatterCanvasView} from './ui/scatter-canvas-view/scatter-canvas-view';
import { LuminateAppBar } from './ui/app-bar/app-bar';
import { ToastContainer } from './ui/toasts';
import { WelcomeModal } from './ui/welcome-modal';
import Editor from './ui/editor/text-editor';
import AiForm from './ui/editor/ai-panel/ai-form';
import React, { useEffect, useState } from 'react';
import { startTutorial } from './util/util';

function App() {
  //用于确定用户是否是首次使用应用。它从 localStorage 中读取，如果存储的 firstTime 值不是 'false'，则设置为 true。如果用户第一次使用应用，会显示一个教程。
  const [firstTime, setFirstTime] = useState(localStorage.getItem('firstTime') !== 'false');
  //用于存储应用所需的 OpenAI API 密钥。它通过环境变量
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_OPENAI_API_KEY);
//在 apiKey 改变时执行。它检查是否是用户的首次使用 (firstTime)，并且是否有 API 密钥 (apiKey)。如果是，调用 startTutorial() 启动教程，然后将 firstTime 设置为 false，以确保教程不会重复显示。
  useEffect(() => {
    if (firstTime && apiKey) {
      startTutorial();
      localStorage.setItem('firstTime', 'false');
    }
  }, [apiKey]);

  const updateApiKey = (newApiKey) => {
    setApiKey(newApiKey);
  };

  return (
    <>
    {apiKey ? (
      <></>
    ) : (
      /* 如果没有 API 密钥（apiKey 为空），会显示 WelcomeModal 组件，用于提示用户输入 API 密钥。 */
      <WelcomeModal updateApiKey={updateApiKey}/>
    )}
    <div className="Luminate">
      <LuminateAppBar />
      <div className="container-fluid">
        <div className="text-editor-container" id="text-editor-container">
          <Editor />
        </div>
        <div className="ai-panel" id="ai-panel">
            <AiForm responseHandler={null} selectedContent={null} api={null}/>
        </div>
        <div className="scatter-filter-container" id="scatter-filter-container" style={{display: 'none'}}></div>
        <div id="my-spaceviz">
            <ScatterCanvasView />
        </div>
      </div>
      <ToastContainer />
    </div>
    </>
  )
}

export default App
