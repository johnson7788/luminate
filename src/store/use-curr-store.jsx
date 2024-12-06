import { create } from 'zustand'

// 管理散点图中节点的状态和过滤
// 跟踪用户的交互（如选择、过滤）
// 维护可视化界面的各种状态
// 提供数据操作的方法
// 例如，当用户：
// 选择一个节点时，currBlockId 会更新
// 添加过滤条件时，dimensionMap 会更新
// 搜索关键词时，keywordNodes 会更新匹配的节点
// 在散点图上选择坐标轴时，selectedLabelIds 会更新
// 这个存储是整个应用的状态管理中心，确保所有组件能够访问和修改共享的状态。

/* store all the block related data in the editor and current node data in the visualization */
const useCurrStore = create((set) => ({
    currBlockId: null,      // 当前选中的块ID
    maxBlockId: 0,          // 最大块ID
    currDataId: null,       // 当前数据ID
    focusedBlockId: 0,      // 当前焦点块ID

    setCurrDataId: (id) => set((state) => ({
        rcurrDataId: id})),
    // what should be set opacity !!! actually, these are nodes that are ****NOT**** wanted!!!
    dimensionMap: {},  // 存储维度过滤器的映射
    //设置整个维度映射
    setDimensionMap: (dimensionMap) => set((state) => {
        state.dimensionMap = dimensionMap;
        return state;
    }),
    //添加过滤标签
    addFilteredLabel: (dimName, label) => set((state) => {
        if (!state.dimensionMap[dimName].filtered) {
            state.dimensionMap[dimName].filtered = [label];
        } else {
            state.dimensionMap[dimName].filtered.push(label);
        }
        return state;
    }),
    //移除过滤标签
    removeFilteredLabel: (dimName, label) => set((state) => {
        if (state.dimensionMap[dimName].filtered) {
            state.dimensionMap[dimName].filtered = state.dimensionMap[dimName].filtered.filter(l => l !== label);
        }
        return state;
    }),

    //想要显示的节点
    wantedNodes: new Set(),
    setWantedNodes: (ids) => set((state) => {
        state.wantedNodes = ids;
        return state;
    }),
    addWantedNode: (id) => set((state) => {
        state.wantedNodes.add(id);
        return state;
    }),
    removeWantedNode: (id) => set((state) => {
        if (state.wantedNodes.has(id))
        state.wantedNodes.delete(id);
        return state;
    }),


    // the nodes that matches the keyword
    keywordNodes: new Set(),
    setKeywordNodes: (ids) => set((state) => {
        state.keywordNodes = ids;
        return state;
    }),
    addKeywordNode: (id) => set((state) => {
        state.keywordNodes.add(id);
        return state;
    }),
    removeKeywordNode: (id) => set((state) => {
        if (state.keywordNodes.has(id))
        state.keywordNodes.delete(id);
        return state;
    }),

    // the newly added nodes
    newNodes: new Set(),
    setNewNodes: (ids) => set((state) => {
        state.newNodes = ids;
        return state;
    }),
    addNewNode: (id) => set((state) => {
        state.newNodes.add(id);
        return state;
    }),
    removeNewNode: (id) => set((state) => {
        if (state.newNodes.has(id))
        state.newNodes.delete(id);
        return state;
    }),

    // editor instance
    editorInstance: null,
    setEditorInstance: (editor) => set({ editorInstance: editor }),

    // Currently hovered over label
    focusedDimensionLabel: null,
    setFocusedDimensionLabel: (label) => set((state) => {
        state.focusedDimensionLabel = label;
        return state;
    }),
    

    // current nodes in visulization
    nodeMap: {},
    setNodeMap: (nodeMap) => set((state) => {
        state.nodeMap = nodeMap;
        return state;
    }),

    // all nodes in visulization
    allNodeMap: {},
    setAllNodeMap: (nodeMap) => set((state) => {
        state.allNodeMap = nodeMap;
        return state;
    }),

    selectedLabelIds: {
        x: -1,  // X轴选中的标签ID
        y: -1   // Y轴选中的标签ID
    },
    setSelectedLabelIds: (x, y) => set((state) => {
        // If -1, ignore and don't update. If -2, reset to -1
        if (x !== -1) state.selectedLabelIds.x = x === -2 ? -1 : x;
        if (y !== -1) state.selectedLabelIds.y = y === -2 ? -1 : y;
        return state;
    }),

    // utility functions
    setCurrBlockId: (id) => set((state) => ({
        currBlockId: id})),
    setMaxBlockId: (id) => set((state) => ({
        maxBlockId: id})),
    setFocusedBlockId: (id) => set((state) => ({
        focusedBlockId: id})),

  }))
  
export default useCurrStore;