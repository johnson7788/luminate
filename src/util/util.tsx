import introJs  from 'intro.js';
import 'intro.js/introjs.css';

export const uuid = (): string => new Date().getTime().toString(36) + Math.random().toString(36).slice(2);

export const saveEnvVal = (key: string, value: string) => {
  import.meta.env[key] = value;
};

export const getEnvVal = (key: string): string => {
  return import.meta.env[key];
}

export const colors : string[] = [
  '#FF6E67',
  '#6AB2FF',
  '#48D6C1',
  '#FFC37A',
  '#C67BF2',
  '#2ECC71',
  '#6A7485',
  '#ADDF71',
  '#FFA054',
  "#6AB2FF",
  "#FFC37A",
  "#BB72E6",
  "#FF9350",
  "#6A7485",
  "#68DB8E",
  "#A45CCF",
  "#FF9350",
  "#BB72E6",
  "#6AB2FF",
  "#FFC37A",
  "#BB72E6",
  "#FF9350",
  '#FF7451',
  '#FF6E67',
  '#6AB2FF',
  '#48D6C1',
  '#FFC37A',
  '#C67BF2',
  '#6A7485',
  '#4DCFB1',
  '#FFA054',
];
//引导的介绍
export const startTutorial = () => {
  const intro = introJs();
  intro.setOptions({
    tooltipClass: 'tutorialTooltip',
    steps: [
      {
        title: '向导 <img src="luminate-logo.png" style="width:30px; height:30px;"/>',
        intro: '这是一个向导，帮助你熟悉每个组件并理解系统。'
      },
      {
        title: '文本编辑器',
        element: document.querySelector('#text-editor-container'),
        intro: "这是文本编辑器，你可以在这里撰写你的Story"
      },
      {
        title: 'Prompt AI',
        element: document.querySelector('#ai-form'),
        intro: "你也可以使用此输入框向 AI 询问创意。AI 会花几秒钟来分析提示的关键属性，并生成多个响应。"
      },
      {
        title: '探索视图',
        element: document.querySelector('#my-spaceviz'),
        intro: "这是探索视图，当你向 AI 询问创意时，你可以在此查看多个响应。"
      },
      {
        title: 'Collapse Text Editor',
        element: document.querySelector('#collapse-button'),
        intro: "你可以折叠文本编辑器，以便更好地查看探索视图。"
      },
      {
        title: 'Search Bar',
        element: document.querySelector('#searchbar'),
        intro: "你可以使用搜索栏快速查找包含特定词语或短语的响应。"
      },
      {
        title: 'Favorites',
        element: document.querySelector('#fav-button'),
        intro: "你可以点击书签图标，查看当前空间的收藏响应。"
      },
      {
        title:'Filter',
        element: document.querySelector('#filter-dims'),
        intro: '一旦设计空间生成后，你可以看到如图所示的维度。你可以根据这些维度及其相关的值筛选响应。\
        <img src="filter-bar.png" style="width:100%; height:auto;"/>'
      },
      {
        title:'Semantic Zoom',
        element: document.querySelector('.semantic-level-panel'),
        intro: '你可以使用语义缩放功能，查看不同抽象层次的响应（点、标题、关键词、摘要和全文）。\
        <img src="semantic-zoom.png" style="width:100%; height:auto;"/>'
      },
      {
        title:'Select Dimension',
        element: document.querySelector('#x-trigger'),
        intro: "你可以选择一个维度，根据该维度的值在探索视图中排列响应。"
      },
      {
        title:'Menu',
        intro: ' 在右上角，你可以看到四个图标按钮。\
                <ul style=\"list-style-type: none; padding-left: 0; margin-top: 10px;\">\
                  <li style=\"display: flex; align-items: center; gap: 10px; margin-bottom: 10px;\">\
                      <img src=\"tutorial-menu.png\" alt=\"Tutorial\" style=\"width: 30px; height: 30px;\">\
                      <strong>Tutorial:</strong> You can watch the tutorial of Luminate.\
                  </li>\
                  <li style=\"display: flex; align-items: center; gap: 10px; margin-bottom: 10px;\">\
                      <img src=\"contact-menu.png\" alt=\"Settings\" style=\"width: 30px; height: auto;\">\
                      <strong>Contact:</strong> You can contact researchers via email.\
                  </li>\
                  <li style="display: flex; flex-direction: column; align-items: center; gap: 20px; margin-bottom: 10px;">\
                      <div style="display: flex; width: 100%; gap: 10px;">\
                          <img src="settings-menu.png" alt="Settings" style="width: 30px; height: 30px;">\
                          <strong>Settings:</strong> You can enter your OpenAI API key and change the batch size and number of dimensions.\
                          The default batch size is 20 and the number of dimensions is 3.\
                      </div>\
                      <img src="settings-input.png" alt="Semantic Zoom" style="width: auto; height: 300px; border: 3px solid #eee; border-radius: 10px; ">\
                  </li>\
                  <li style=\"display: flex; gap: 10px; margin-bottom: 10px;\">\
                      <img src=\"about-menu.png\" alt=\"About\" style=\"width: 30px; height: 30px;\">\
                      <strong>About:</strong> You can learn more about the research paper and the framework that Luminate instantiates.\
                  </li>\
              </ul>\
        ',
      },
      {
        title: 'Luminate Tutorial <img src="luminate-logo.png" style="width:30px; height:30px;"/>',
        intro: '这是教程的结束部分。你也可以观看30秒的演示视频来更好地理解 Luminate。\
        <video width="540px" height="360px" controls>\
          <source src="luminate-video-preview.mp4" type="video/mp4">\
          Your browser does not support the video tag.\
        </video>\
        If you want to watch the tutorial again, click <img src="tutorial-menu.png" style="width:30px; height:auto;"/>\
        on the top right corner. Enjoy using Luminate!'
      },
    ]
  });
  intro.setOption("dontShowAgain", false).start();
}
