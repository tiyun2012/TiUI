import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer'; // Ensure this matches importmap
import { LayoutState, LayoutNode, WidgetState, CoreWidgetTypes, DragData, DropZone } from '../types';

interface LayoutActions {
  splitNode: (nodeId: string, dir: 'row' | 'column') => void;
  resizeNode: (nodeId: string, weights: number[]) => void;
  closeTab: (nodeId: string, widgetIndex: number) => void;
  setActiveTab: (nodeId: string, widgetId: string) => void;
  tearOff: (nodeId: string, widgetIndex: number) => void;
  tearOffCopy: (nodeId: string, widgetIndex: number) => void;
  moveWidget: (dragData: DragData, targetNodeId: string, dropZone: DropZone) => void;
  bringToFront: (floatId: string) => void;
  closeFloating: (id: string) => void;
  resetLayout: () => void;
}

interface StoreState {
  layout: LayoutState;
  actions: LayoutActions;
}

// --- Helpers ---

const findNode = (root: LayoutNode, id: string): LayoutNode | null => {
  if (root.id === id) return root;
  if (root.children) {
    for (const c of root.children) {
      const found = findNode(c, id);
      if (found) return found;
    }
  }
  return null;
};

const createDefaultLayout = (): LayoutState => {
  const modlist: WidgetState = { instanceId: 'w_mods', type: CoreWidgetTypes.MODULE_LIST, title: 'Modules', params: {} };
  const vp1: WidgetState = { instanceId: 'w_vp1', type: CoreWidgetTypes.VIEWPORT, title: 'Viewport 1', params: { viewportId: 'vp_01', sceneId: 'scene_main' } };
  const cons: WidgetState = { instanceId: 'w_console', type: CoreWidgetTypes.CONSOLE, title: 'Output Log', params: {} };
  const insp: WidgetState = { instanceId: 'w_insp', type: CoreWidgetTypes.INSPECTOR, title: 'Inspector', params: {} };

  return {
    root: {
      id: 'root',
      type: 'split',
      direction: 'column',
      children: [
        {
          id: 'top_split',
          type: 'split',
          direction: 'row',
          weights: [20, 60, 20],
          children: [
            { id: 'leaf_left', type: 'leaf', widgets: [modlist], activeWidgetId: 'w_mods' },
            { id: 'leaf_vp', type: 'leaf', widgets: [vp1], activeWidgetId: 'w_vp1' },
            { id: 'leaf_inspector', type: 'leaf', widgets: [insp], activeWidgetId: 'w_insp' }
          ]
        },
        {
          id: 'leaf_console',
          type: 'leaf',
          widgets: [cons],
          activeWidgetId: 'w_console'
        }
      ],
      weights: [75, 25]
    },
    floating: []
  };
};

// --- Store ---

export const useLayoutStore = create<StoreState>()(
  persist(
    immer((set) => ({
      layout: createDefaultLayout(),

      actions: {
        resetLayout: () => set((state) => {
          state.layout = createDefaultLayout();
        }),

        resizeNode: (nodeId, weights) => set((state) => {
          const node = findNode(state.layout.root, nodeId);
          if (node && node.type === 'split') {
            node.weights = weights;
          }
        }),

        splitNode: (nodeId, dir) => set((state) => {
          const node = findNode(state.layout.root, nodeId);
          if (!node || node.type !== 'leaf') return;

          const originalWidgets = node.widgets || [];
          const originalActive = node.activeWidgetId;
          
          node.type = 'split';
          node.direction = dir;
          node.widgets = undefined; 
          node.activeWidgetId = undefined;
          node.weights = [50, 50];
          
          const child1: LayoutNode = {
            id: `${nodeId}_1`, type: 'leaf', widgets: originalWidgets, activeWidgetId: originalActive
          };
          const child2: LayoutNode = {
            id: `${nodeId}_2`, type: 'leaf', widgets: [{ instanceId: `w_empty_${Date.now()}`, type: CoreWidgetTypes.CONSOLE, title: 'New Console', params: {} }], activeWidgetId: undefined
          };
          
          node.children = [child1, child2];
        }),

        closeTab: (nodeId, widgetIndex) => set((state) => {
          const node = findNode(state.layout.root, nodeId);
          if (!node || !node.widgets) return;

          node.widgets.splice(widgetIndex, 1);
          if (node.widgets.length > 0) {
            node.activeWidgetId = node.widgets[Math.min(widgetIndex, node.widgets.length - 1)].instanceId;
          } else {
            node.activeWidgetId = undefined;
          }
        }),

        setActiveTab: (nodeId, widgetId) => set((state) => {
          const node = findNode(state.layout.root, nodeId);
          if (node) node.activeWidgetId = widgetId;
        }),

        tearOff: (nodeId, widgetIndex) => set((state) => {
          const node = findNode(state.layout.root, nodeId);
          if (!node || !node.widgets) return;

          const widget = node.widgets[widgetIndex];
          node.widgets.splice(widgetIndex, 1);
          if (node.widgets.length > 0) {
            node.activeWidgetId = node.widgets[0].instanceId;
          }

          const floatId = `float_${Date.now()}`;
          state.layout.floating.push({
            id: floatId,
            x: 100 + (state.layout.floating.length * 20),
            y: 100 + (state.layout.floating.length * 20),
            width: 400, height: 300,
            node: { id: `leaf_${floatId}`, type: 'leaf', widgets: [widget], activeWidgetId: widget.instanceId }
          });
        }),

        tearOffCopy: (nodeId, widgetIndex) => set((state) => {
          const node = findNode(state.layout.root, nodeId);
          if (!node || !node.widgets) return;

          const original = node.widgets[widgetIndex];
          const newId = `w_copy_${Date.now()}`;
          const newWidget: WidgetState = { ...original, instanceId: newId, title: `${original.title} (Copy)` };

          if (newWidget.type === CoreWidgetTypes.VIEWPORT) {
             const newVpId = `vp_${Date.now().toString().slice(-4)}`;
             newWidget.params = { ...newWidget.params, viewportId: newVpId };
             newWidget.title = `Viewport ${newVpId}`;
          }

          const floatId = `float_${Date.now()}`;
          state.layout.floating.push({
            id: floatId,
            x: 150 + (state.layout.floating.length * 20),
            y: 150 + (state.layout.floating.length * 20),
            width: 400, height: 300,
            node: { id: `leaf_${floatId}`, type: 'leaf', widgets: [newWidget], activeWidgetId: newId }
          });
        }),

        bringToFront: (floatId) => set((state) => {
          const idx = state.layout.floating.findIndex(f => f.id === floatId);
          if (idx === -1 || idx === state.layout.floating.length - 1) return;
          const [panel] = state.layout.floating.splice(idx, 1);
          state.layout.floating.push(panel);
        }),

        closeFloating: (id) => set((state) => {
          state.layout.floating = state.layout.floating.filter(f => f.id !== id);
        }),

        moveWidget: (dragData, targetNodeId, dropZone) => set((state) => {
          const targetNode = findNode(state.layout.root, targetNodeId);
          if (!targetNode || targetNode.type !== 'leaf') return;
          
          let widgetToMove: WidgetState | undefined;

          // 1. Extract
          if (dragData.type === 'tab' && dragData.sourceNodeId && typeof dragData.widgetIndex === 'number') {
              const sourceNode = findNode(state.layout.root, dragData.sourceNodeId);
              if (!sourceNode || !sourceNode.widgets) return;
              if (dragData.sourceNodeId === targetNodeId && dropZone === 'center') return;

              widgetToMove = sourceNode.widgets[dragData.widgetIndex];
              sourceNode.widgets.splice(dragData.widgetIndex, 1);
              if (sourceNode.widgets.length > 0) {
                  if (sourceNode.activeWidgetId === widgetToMove.instanceId) {
                      sourceNode.activeWidgetId = sourceNode.widgets[0].instanceId;
                  }
              } else {
                  sourceNode.activeWidgetId = undefined;
              }
          } else if (dragData.type === 'floating' && dragData.floatId) {
              const floatIndex = state.layout.floating.findIndex(f => f.id === dragData.floatId);
              if (floatIndex === -1) return;
              const floatingPanel = state.layout.floating[floatIndex];
              const floatNode = floatingPanel.node.type === 'leaf' ? floatingPanel.node : findNode(floatingPanel.node, floatingPanel.node.id);
              if (floatNode && floatNode.widgets && floatNode.widgets.length > 0) {
                  widgetToMove = floatNode.widgets[0]; 
              }
              state.layout.floating.splice(floatIndex, 1);
          }

          if (!widgetToMove) return;

          // 2. Insert
          if (dropZone === 'center') {
              if (!targetNode.widgets) targetNode.widgets = [];
              targetNode.widgets.push(widgetToMove);
              targetNode.activeWidgetId = widgetToMove.instanceId;
          } else {
              const originalWidgets = targetNode.widgets || [];
              const originalActive = targetNode.activeWidgetId;
              targetNode.type = 'split';
              targetNode.widgets = undefined;
              targetNode.activeWidgetId = undefined;
              targetNode.weights = [50, 50];
              
              const childExisting: LayoutNode = {
                  id: `${targetNodeId}_orig`, type: 'leaf', widgets: originalWidgets, activeWidgetId: originalActive
              };
              const childNew: LayoutNode = {
                  id: `${targetNodeId}_new`, type: 'leaf', widgets: [widgetToMove], activeWidgetId: widgetToMove.instanceId
              };

              if (dropZone === 'left') { targetNode.direction = 'row'; targetNode.children = [childNew, childExisting]; } 
              else if (dropZone === 'right') { targetNode.direction = 'row'; targetNode.children = [childExisting, childNew]; } 
              else if (dropZone === 'top') { targetNode.direction = 'column'; targetNode.children = [childNew, childExisting]; } 
              else if (dropZone === 'bottom') { targetNode.direction = 'column'; targetNode.children = [childExisting, childNew]; }
          }
        }),

      }
    })),
    {
      name: 'titanium_layout_storage', // local storage key
    }
  )
);

export const useLayoutActions = () => useLayoutStore((s) => s.actions);
