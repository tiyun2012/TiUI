import React, { useState, useEffect, useCallback } from 'react';
import { LayoutNode, LayoutState, WidgetState, WidgetType, FloatingPanel, DragData, DropZone } from './types';
import { LayoutTree } from './components/layout/LayoutTree';
import { WidgetRenderer } from './components/WidgetRenderer';
import { apiService } from './services/apiService';

// --- Default Layout Factory ---

const createDefaultLayout = (): LayoutState => {
  const modlist: WidgetState = { instanceId: 'w_mods', type: WidgetType.MODULE_LIST, title: 'Modules', params: {} };
  const vp1: WidgetState = { instanceId: 'w_vp1', type: WidgetType.VIEWPORT, title: 'Viewport 1', params: { viewportId: 'vp_01', sceneId: 'scene_main' } };
  const cons: WidgetState = { instanceId: 'w_console', type: WidgetType.CONSOLE, title: 'Output Log', params: {} };
  const insp: WidgetState = { instanceId: 'w_insp', type: WidgetType.INSPECTOR, title: 'Inspector', params: {} };

  return {
    root: {
      id: 'root',
      type: 'split',
      direction: 'column',
      children: [
        // Top Area
        {
          id: 'top_split',
          type: 'split',
          direction: 'row',
          weights: [20, 60, 20],
          children: [
            // Left: Module List
            {
              id: 'leaf_left',
              type: 'leaf',
              widgets: [modlist],
              activeWidgetId: 'w_mods'
            },
            // Center: Main Viewport
            {
              id: 'leaf_vp',
              type: 'leaf',
              widgets: [vp1],
              activeWidgetId: 'w_vp1'
            },
            // Right: Inspector
            {
              id: 'leaf_inspector',
              type: 'leaf',
              widgets: [insp],
              activeWidgetId: 'w_insp'
            }
          ]
        },
        // Bottom Area: Console
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

const clone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

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

const App: React.FC = () => {
  const [layout, setLayout] = useState<LayoutState>(() => {
    const saved = localStorage.getItem('titanium_layout');
    return saved ? JSON.parse(saved) : createDefaultLayout();
  });

  useEffect(() => {
    localStorage.setItem('titanium_layout', JSON.stringify(layout));
  }, [layout]);

  // --- Layout Actions ---

  const splitNode = useCallback((nodeId: string, dir: 'row' | 'column') => {
    setLayout(prev => {
      const next = clone(prev);
      const node = findNode(next.root, nodeId);
      if (!node || node.type !== 'leaf') return next;

      const originalWidgets = node.widgets || [];
      const originalActive = node.activeWidgetId;
      
      node.type = 'split';
      node.direction = dir;
      node.widgets = undefined; 
      node.activeWidgetId = undefined;
      node.weights = [50, 50]; // Start equal
      
      const child1: LayoutNode = {
        id: `${nodeId}_1`,
        type: 'leaf',
        widgets: originalWidgets,
        activeWidgetId: originalActive
      };
      
      const child2: LayoutNode = {
        id: `${nodeId}_2`,
        type: 'leaf',
        widgets: [{ instanceId: `w_empty_${Date.now()}`, type: WidgetType.CONSOLE, title: 'New Console', params: {} }],
        activeWidgetId: undefined
      };
      
      node.children = [child1, child2];
      return next;
    });
  }, []);

  const resizeNode = useCallback((nodeId: string, weights: number[]) => {
      setLayout(prev => {
          const next = clone(prev);
          const node = findNode(next.root, nodeId);
          if (node && node.type === 'split') {
              node.weights = weights;
          }
          return next;
      });
  }, []);

  const closeTab = useCallback((nodeId: string, widgetIndex: number) => {
    setLayout(prev => {
      const next = clone(prev);
      const node = findNode(next.root, nodeId);
      if (!node || !node.widgets) return next;

      node.widgets.splice(widgetIndex, 1);
      if (node.widgets.length > 0) {
        node.activeWidgetId = node.widgets[Math.min(widgetIndex, node.widgets.length - 1)].instanceId;
      } else {
        node.activeWidgetId = undefined;
      }
      return next;
    });
  }, []);

  const setActiveTab = useCallback((nodeId: string, widgetId: string) => {
    setLayout(prev => {
      const next = clone(prev);
      const node = findNode(next.root, nodeId);
      if (node) node.activeWidgetId = widgetId;
      return next;
    });
  }, []);

  const tearOff = useCallback((nodeId: string, widgetIndex: number) => {
      setLayout(prev => {
          const next = clone(prev);
          const node = findNode(next.root, nodeId);
          if(!node || !node.widgets) return prev;

          const widget = node.widgets[widgetIndex];
          node.widgets.splice(widgetIndex, 1);
          if (node.widgets.length > 0) {
            node.activeWidgetId = node.widgets[0].instanceId;
          }

          const floatId = `float_${Date.now()}`;
          next.floating.push({
              id: floatId,
              x: 100 + (next.floating.length * 20),
              y: 100 + (next.floating.length * 20),
              width: 400, height: 300,
              node: {
                  id: `leaf_${floatId}`, type: 'leaf', widgets: [widget], activeWidgetId: widget.instanceId
              }
          });
          return next;
      });
  }, []);

  // Duplicate to Float (Tear-off Copy)
  const tearOffCopy = useCallback((nodeId: string, widgetIndex: number) => {
      setLayout(prev => {
          const next = clone(prev);
          const node = findNode(next.root, nodeId);
          if(!node || !node.widgets) return prev;

          // Clone
          const original = node.widgets[widgetIndex];
          const newId = `w_copy_${Date.now()}`;
          const newWidget: WidgetState = { ...original, instanceId: newId, title: `${original.title} (Copy)` };

          // SPECIAL LOGIC: If Viewport, allow separate instance (unique viewportId)
          if (newWidget.type === WidgetType.VIEWPORT) {
             const newVpId = `vp_${Date.now().toString().slice(-4)}`;
             newWidget.params = { ...newWidget.params, viewportId: newVpId };
             newWidget.title = `Viewport ${newVpId}`;
          }

          const floatId = `float_${Date.now()}`;
          next.floating.push({
              id: floatId,
              x: 150 + (next.floating.length * 20),
              y: 150 + (next.floating.length * 20),
              width: 400, height: 300,
              node: {
                  id: `leaf_${floatId}`, type: 'leaf', widgets: [newWidget], activeWidgetId: newId
              }
          });
          return next;
      });
  }, []);

  const closeFloating = (id: string) => {
      setLayout(prev => ({ ...prev, floating: prev.floating.filter(f => f.id !== id) }));
  };

  const moveWidget = useCallback((dragData: DragData, targetNodeId: string, dropZone: DropZone) => {
    setLayout(prev => {
        const next = clone(prev);
        const targetNode = findNode(next.root, targetNodeId);
        if (!targetNode || targetNode.type !== 'leaf') return prev;
        
        let widgetToMove: WidgetState | undefined;

        if (dragData.type === 'tab' && dragData.sourceNodeId && typeof dragData.widgetIndex === 'number') {
            const sourceNode = findNode(next.root, dragData.sourceNodeId);
            if (!sourceNode || !sourceNode.widgets) return prev;
            if (dragData.sourceNodeId === targetNodeId && dropZone === 'center') return prev;

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
            const floatIndex = next.floating.findIndex(f => f.id === dragData.floatId);
            if (floatIndex === -1) return prev;
            const floatingPanel = next.floating[floatIndex];
            const floatNode = floatingPanel.node.type === 'leaf' ? floatingPanel.node : findNode(floatingPanel.node, floatingPanel.node.id);
            if (floatNode && floatNode.widgets && floatNode.widgets.length > 0) {
                widgetToMove = floatNode.widgets[0]; 
            }
            next.floating.splice(floatIndex, 1);
        }

        if (!widgetToMove) return prev;

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
        return next;
    });
  }, []);

  return (
    <div className="w-screen h-screen flex flex-col bg-editor-bg text-editor-text font-sans selection:bg-editor-accent selection:text-white">
      <div className="h-10 border-b border-editor-border bg-editor-panel flex items-center px-4 justify-between">
        <div className="flex items-center space-x-4">
            <h1 className="font-bold tracking-tight text-editor-text">TITANIUM <span className="text-editor-accent font-normal text-xs">FRAMEWORK</span></h1>
            <div className="h-4 w-px bg-editor-border" />
            <button className="text-xs hover:text-white transition-colors" onClick={() => setLayout(createDefaultLayout())}>Reset Layout</button>
            <button className="text-xs hover:text-white transition-colors" onClick={() => apiService.call('scene', 'create', {name: 'New Scene'})}>+ New Scene</button>
        </div>
        <div className="text-xs text-editor-muted">React 18 / TypeScript / RPC Bridge Active</div>
      </div>
      <div className="flex-1 relative overflow-hidden">
        <LayoutTree node={layout.root} actions={{ splitNode, closeTab, setActiveTab, tearOff, tearOffCopy, moveWidget, resizeNode }} />
        {layout.floating.map(fp => (
            <div key={fp.id} className="absolute flex flex-col bg-editor-bg border border-editor-accent shadow-2xl rounded-sm overflow-hidden"
                style={{ left: fp.x, top: fp.y, width: fp.width, height: fp.height, zIndex: 50 }}>
                <div className="h-6 bg-editor-accent flex items-center justify-between px-2 cursor-move"
                    draggable onDragStart={(e) => {
                        const data: DragData = { type: 'floating', floatId: fp.id };
                        e.dataTransfer.setData('application/json', JSON.stringify(data));
                        e.dataTransfer.effectAllowed = 'move';
                    }}
                    onMouseDown={(e) => {
                         if (e.defaultPrevented) return;
                         const startX = e.clientX; const startY = e.clientY; const startLeft = fp.x; const startTop = fp.y;
                         const onMove = (mv: MouseEvent) => {
                             const idx = layout.floating.findIndex(f => f.id === fp.id);
                             if (idx === -1) return;
                             const newFloats = [...layout.floating];
                             newFloats[idx] = { ...newFloats[idx], x: startLeft + (mv.clientX - startX), y: startTop + (mv.clientY - startY) };
                             setLayout(prev => ({ ...prev, floating: newFloats }));
                         };
                         const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                         window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
                    }}
                >
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2"><span>::</span> Floating Panel</span>
                    <button onClick={() => closeFloating(fp.id)} className="text-white hover:text-red-200">✕</button>
                </div>
                <div className="flex-1 relative">
                    <LayoutTree node={fp.node} actions={{ splitNode, closeTab, setActiveTab, tearOff, tearOffCopy, moveWidget, resizeNode }} />
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default App;
