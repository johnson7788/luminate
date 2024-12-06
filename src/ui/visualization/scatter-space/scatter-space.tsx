import React, { useRef, useState } from 'react';
import DatabaseManager from "../../../db/database-manager";
import { useForceLayout } from '../../hooks/use-force-layout.js';
import { SemanticLevelPanel } from '../semantic-level-panel/semantic-level-panel.jsx';

import './scatter-space.scss';
import { VariationBlock } from '../variation-block/variation-block.js';
import { getViewportFromRect, identityViewport } from './scatter-space.zui.js';
import { useCanvasViewport } from '../../hooks/use-canvas-viewport.js';
import useCurrStore from '../../../store/use-curr-store';
import useDimStore from '../../../store/use-dim-store.jsx';
import { Label, dimensionsToAxes, nodeColor } from './scatter-space.helper.js';
import { growSpace } from '../../../util/space-generation-util';
import { allDimensionFiltersOff } from '../variation-block/variation-block.helper.js';
import { SwitchAccessShortcutAdd } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';

// 这是一个名为 ScatterSpace 的 React 组件，主要用于实现一个交互式的散点图可视化界面。主要功能包括：
// 数据可视化
// 将数据以散点图的形式展示在二维空间中
// 每个点代表一个节点(node)，通过 nodeMap 来管理所有节点
// 使用力导向布局(useForceLayout)来自动排列节点的位置
// 交互控制
// 支持缩放(zoom)功能：用户可以放大缩小查看详情
// 支持平移(pan)：用户可以拖动画布查看不同区域
// 通过 camera 对象控制视角，包含 x, y 坐标和缩放级别 z
// 动态数据加载
// 包含一个"Add More"按钮
// 当用户应用了维度过滤器时，可以动态生成更多相关的数据点
// 生成过程中显示加载动画
// 布局结构
// 语义层级面板（用于控制缩放层级）
// 状态管理
// 使用 useCurrStore 和 useDimStore 管理全局状态
// 跟踪缩放、滚动等交互状态
// 管理数据加载状态
// 这个组件像是某个数据分析或可视化工具的核心部分，允许用户以交互方式探索和分析数据点之间的关系。
// 举个例子来说：
// 假设这是一个文本分析工具，每个节点可能代表一个文本片段：
// 用户可以放大查看具体内容
// 相似的文本会通过力导向布局聚集在一起
// 当用户找到感兴趣的方向时，可以点击"Add More"生成更多相关的内容
// 这样的界面设计让用户可以直观地探索和理解数据之间的关系

const shift = 620; // 定义边距偏移量

export const ScatterSpace = ({camera, setCamera}) => {
  // DOM引用
  // ZUI
  const containerRef = useRef<null | HTMLDivElement>(null); // 容器元素的引用，就是这个scatter-space元素
  const canvasRef = useRef<null | HTMLDivElement>(null); // 画布元素的引用，里面的canvas元素
// 从全局状态获取数据
  const { nodeMap, setNodeMap, dimensionMap, selectedLabelIds } = useCurrStore();
  const { labels, dimensions } = useDimStore();
// 视口控制相关状态
  let {zoom: zoomHelper, gotoLowestSemanticLevel} = useCanvasViewport(setCamera, containerRef)
  let viewport = identityViewport
  const myFav = useDimStore((state) => state.myFav);
  const [prevZoom, setPrevZoom] = useState(1); // 记录前一个缩放值
  const [scaleIn, setScaleIn] = useState(true); // 是否正在放大
  const [scrolling, setScrolling] = useState(false); // 是否正在滚动

  const rect = containerRef.current?.getBoundingClientRect()
// 加载状态
  const [loadingGrow, setLoadingGrow] = useState(false);

  const {currBlockId} = useCurrStore();

  // 使用力导向布局
  useForceLayout(
    rect,
    true, 
    nodeMap, 
    setNodeMap, 
    camera.z, 
    {x: 0, y: 0},
    dimensionsToAxes(dimensions)
  );

  // 获取和设置当前选中的块ID
  const [currId, setcurrId] = useCurrStore((state) => [state.currBlockId, state.setCurrBlockId]);
// 计算当前视口
  if (canvasRef.current) {
    viewport = getViewportFromRect(camera, canvasRef.current.getBoundingClientRect())
  }

  return (
    <div className='scatter-space' id='scatter-space' ref={containerRef}
      onMouseMove={(event) => {
        setScrolling(false)
      }}
      onWheel={(event) => {
        if (!scrolling) {
          setScrolling(true);
        }
      }}
    >
      {
        // 当至少有一个维度过滤器开启时，显示"添加更多节点"按钮, 即给某个维度，进行扩充更多内容
        (!allDimensionFiltersOff(dimensionMap)) &&
        <button className='panel-item' style={{
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 18px',
          position: 'absolute',
          top: '100px',
          left: '50%',
          translate: '-50% 0',
          zIndex: 50,
        }}
          onClick={() => {
            // 处理添加更多节点的逻辑
            if (loadingGrow) return;
            const axisLabels: Label[] = [];
            // 收集当前选中的维度标签
            const axes = dimensionsToAxes(dimensions)
            // 添加X轴标签
            if (axes.x && axes.x.type !== 'null' && selectedLabelIds.x) {
              axisLabels.push({
                dimensionId: axes.x.id,
                name: axes.x.values[selectedLabelIds.x],
                type: axes.x.type,
              })
            }
            // 添加Y轴标签
            if (axes.y && axes.y.type !== 'null' && selectedLabelIds.y) {
              axisLabels.push({
                dimensionId: axes.y.id,
                name: axes.y.values[selectedLabelIds.y],
                type: axes.y.type,
              })
            }
            // 开始生成新节点
            setLoadingGrow(true);
            const block = DatabaseManager.getBlock(currId);
            const prompt = block ? block["prompt"] : "";
            growSpace(currId, dimensionMap, axisLabels, 5, prompt, nodeMap, setNodeMap).then(data => {
              setLoadingGrow(false);
            })
        }}
        >
          {
            !loadingGrow ?
            <>
              <SwitchAccessShortcutAdd style={{color: '#777'}} />
              Add More
            </> :
            <>
              <CircularProgress style={{color: '#777'}} size={20} />
              Generating More Responses...
            </>
          }
        </button>
      }
      {/* <CanvasPanel {...{undefined, undefined}}/> */}
      {/* <div style={{width: '4px', height: '4px', position: 'absolute', left: cursorPosition.x, top: cursorPosition.y, background: 'red'}}/>
      <div style={{width: '4px', height: '4px', position: 'absolute', left: zoomCenter.x, top: zoomCenter.y, background: 'blue'}}/>
      <div style={{width: '4px', height: '4px', position: 'absolute', left: prevCursorPosition.x, top: prevCursorPosition.y, background: 'green'}}/> */}
      {/* 首先是画布容器的样式设置：,实现了一个可缩放平移的画布系统
画布上的每个节点都是绝对定位
节点位置是相对于容器中心点计算的
使用了反向缩放来保持节点视觉大小的一致性
支持节点的颜色变化和动画效果 */}
      <div className='scatter-canvas' id='scatter-canvas' ref={canvasRef} style={{
        position: 'absolute',
        translate: `${camera.x}px ${camera.y}px`,
        scale: `${camera.z}`,
        // display: 'flex',
        // justifyContent: 'center',
        // alignItems: 'center',
        transformOrigin: `0px 0px`,
        // transformOrigin: `${prevCursorPosition.x}px ${prevCursorPosition.y}px`,
        // transform: `translate(${canvasPosition.x}px, ${canvasPosition.y}px) scale(${zoom})`,
      }}>
        {/* <div>
          节点的渲染部分：计算节点的位置：容器尺寸的一半 + 节点的偏移量
        </div> */}
        {
          Object.values(nodeMap).map((block:any, i) => {
            return(
            <div
              key={`${i}-${block.ID}`}
              style={{
                position: 'absolute',
                top: ((rect?.height ?? 0) / 2 + (block.y ?? 0)) || 0,
                left: ((rect?.width ?? 0) / 2 + (block.x ?? 0)) || 0,                
                // top: block.y??0,//((block.y ?? 0) - prevCursorPosition.y) * zoom + prevCursorPosition.y,
                // left: block.x??0,//((block.x ?? 0) - prevCursorPosition.x) * zoom + prevCursorPosition.x,
                // top: ((block.y ?? 0) - cursorPosition.y) * zoom + cursorPosition.y,
                // left: ((block.x ?? 0) - cursorPosition.x) * zoom + cursorPosition.x,
                scale: ''+(1/camera.z), //节点大小随画布缩放反向变化，保持视觉大小一致
                translate: '-50% -50%', // 使节点以其中心点定位
              }}
            >{
              <VariationBlock {...{block, zoom: camera.z, color: nodeColor(block, dimensionsToAxes(dimensions)), scaleIn: camera.z >= prevZoom}}/>
            }</div>
          )})
        }
      </div>
      {/* <div>
        <div>{Math.floor(camera.z * 100)}%</div>
        <div>x: {Math.floor(viewport.minX)}</div>
        <div>y: {Math.floor(viewport.minY)}</div>
        <div>width: {Math.floor(viewport.width)}</div>
        <div>height: {Math.floor(viewport.height)}</div>
      </div> */}
      <SemanticLevelPanel {...{zoom: camera.z, setZoomLevel: gotoLowestSemanticLevel}}/>

    </div>
  )
}