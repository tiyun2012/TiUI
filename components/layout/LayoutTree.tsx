import React, { useState, useRef, useEffect } from 'react';
import { LayoutNode, WidgetState, DragData, DropZone } from '../../types';
import { PanelHeader, Button } from '../ui/Primitives';
import { WidgetRenderer } from '../WidgetRenderer';

// --- Icons ---
const IconClose = () => <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const IconFloat = () => <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>;
const IconCopy = () => <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 01-2-2V5" /></svg>;

// --- Props ---

interface LayoutActions {
  splitNode: (nodeId: string, dir: 'row' | 'column') => void;
  closeTab: (nodeId: string, widgetIndex: number) => void;
  setActiveTab: (nodeId: string, widgetId: string) => void;
  tearOff: (nodeId: string, widgetIndex: number) => void;
  tearOffCopy: (nodeId: string, widgetIndex: number) => void;
  moveWidget: (dragData: DragData, targetNodeId: string, dropZone: DropZone) => void;
  resizeNode: (nodeId: string, sizes: number[]) => void;
}

interface NodeProps {
  node: LayoutNode;
  actions: LayoutActions;
}

// --- Leaf Node (Tabs & Content) ---

const LeafNode: React.FC<NodeProps> = ({ node, actions }) => {
  const [activeDropZone, setActiveDropZone] = useState<DropZone | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  const activeIndex = node.widgets ? node.widgets.findIndex(w => w.instanceId === node.activeWidgetId) : -1;
  const safeActiveIndex = activeIndex === -1 ? 0 : activeIndex;
  const activeWidget = node.widgets && node.widgets.length > 0 ? node.widgets[safeActiveIndex] : null;

  // DnD Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!nodeRef.current) return;

    const rect = nodeRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    const min = Math.min(x, w - x, y, h - y);
    const threshold = Math.min(w, h) * 0.25;

    let zone: DropZone = 'center';
    if (min < threshold) {
        if (min === x) zone = 'left';
        else if (min === w - x) zone = 'right';
        else if (min === y) zone = 'top';
        else if (min === h - y) zone = 'bottom';
    }

    if (activeDropZone !== zone) setActiveDropZone(zone);
  };

  const handleDragLeave = () => setActiveDropZone(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const finalZone = activeDropZone || 'center';
    setActiveDropZone(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json')) as DragData;
      actions.moveWidget(data, node.id, finalZone);
    } catch (err) {
      console.error("Invalid drag data", err);
    }
  };

  const renderDropOverlay = () => {
      if (!activeDropZone) return null;
      const baseClass = "absolute bg-editor-accent/20 border-2 border-editor-accent z-50 pointer-events-none transition-all duration-75";
      const styles: Record<string, string> = {
          center: "inset-0",
          left: "top-0 bottom-0 left-0 w-1/2",
          right: "top-0 bottom-0 right-0 w-1/2",
          top: "left-0 right-0 top-0 h-1/2",
          bottom: "left-0 right-0 bottom-0 h-1/2"
      };
      return <div className={`${baseClass} ${styles[activeDropZone]}`} />;
  };

  if (!node.widgets || node.widgets.length === 0) {
    return (
        <div ref={nodeRef} className="relative w-full h-full flex flex-col items-center justify-center bg-editor-bg text-editor-muted text-xs border border-editor-border" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
            {renderDropOverlay()}
            <span>Empty Panel</span>
        </div>
    );
  }

  return (
    <div ref={nodeRef} className="relative flex flex-col w-full h-full border border-editor-border bg-editor-bg overflow-hidden">
      {renderDropOverlay()}
      <div className="flex bg-editor-bg border-b border-editor-border overflow-x-auto no-scrollbar" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        {node.widgets.map((w, idx) => {
           const isActive = w.instanceId === activeWidget?.instanceId;
           return (
             <div 
                key={w.instanceId}
                draggable
                onDragStart={(e) => {
                    const data: DragData = { type: 'tab', sourceNodeId: node.id, widgetIndex: idx };
                    e.dataTransfer.setData('application/json', JSON.stringify(data));
                    e.dataTransfer.effectAllowed = 'move';
                }}
                onClick={() => actions.setActiveTab(node.id, w.instanceId)}
                className={`group flex items-center space-x-2 px-3 py-2 text-xs cursor-pointer border-r border-editor-border min-w-[100px] max-w-[200px] truncate select-none ${isActive ? 'bg-editor-panel text-editor-accent border-b-2 border-b-editor-accent' : 'bg-editor-bg text-editor-muted hover:bg-editor-panel'} active:cursor-grabbing`}
             >
                <span className="truncate flex-1">{w.title}</span>
                <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1">
                    <button onClick={(e) => { e.stopPropagation(); actions.tearOffCopy(node.id, idx); }} className="hover:text-white" title="Duplicate to Float"><IconCopy /></button>
                    <button onClick={(e) => { e.stopPropagation(); actions.tearOff(node.id, idx); }} className="hover:text-white" title="Move to Float"><IconFloat /></button>
                    <button onClick={(e) => { e.stopPropagation(); actions.closeTab(node.id, idx); }} className="hover:text-red-400" title="Close"><IconClose /></button>
                </div>
             </div>
           );
        })}
      </div>
      <PanelHeader actions={<><Button variant="ghost" onClick={() => actions.splitNode(node.id, 'column')}>|</Button><Button variant="ghost" onClick={() => actions.splitNode(node.id, 'row')}>—</Button></>}>{activeWidget?.type || 'Empty'}</PanelHeader>
      <div className="flex-1 overflow-hidden relative">
        {activeWidget && <WidgetRenderer key={activeWidget.instanceId} widget={activeWidget} widgetId={activeWidget.instanceId} isActive={true} />}
      </div>
    </div>
  );
};

// --- Split Node (Recursive with Resize) ---

const SplitNode: React.FC<NodeProps> = ({ node, actions }) => {
  const isRow = node.direction === 'row';
  const containerRef = useRef<HTMLDivElement>(null);
  const weights = node.weights || node.children?.map(() => 100 / (node.children?.length || 1));

  const handleMouseDown = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    
    const containerSize = isRow ? containerRef.current.offsetHeight : containerRef.current.offsetWidth;
    const startPos = isRow ? e.clientY : e.clientX;
    const startWeights = [...(weights || [])];

    const onMove = (me: MouseEvent) => {
        const currentPos = isRow ? me.clientY : me.clientX;
        const deltaPixels = currentPos - startPos;
        const deltaPercent = (deltaPixels / containerSize) * 100;

        const newWeights = [...startWeights];
        newWeights[index] = Math.max(5, startWeights[index] + deltaPercent);
        newWeights[index + 1] = Math.max(5, startWeights[index + 1] - deltaPercent);
        
        actions.resizeNode(node.id, newWeights);
    };

    const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div ref={containerRef} className={`flex w-full h-full ${isRow ? 'flex-col' : 'flex-row'}`}>
      {node.children?.map((child, idx) => {
        const weight = weights?.[idx] || 50;
        return (
            <React.Fragment key={child.id}>
               <div style={{ flex: `${weight} 1 0px` }} className="overflow-hidden relative min-w-0 min-h-0">
                  <LayoutTree node={child} actions={actions} />
               </div>
               {idx < (node.children?.length || 0) - 1 && (
                 <div 
                    onMouseDown={handleMouseDown(idx)}
                    className={`${isRow ? 'h-1 w-full cursor-row-resize' : 'w-1 h-full cursor-col-resize'} bg-editor-bg hover:bg-editor-accent transition-colors z-10 flex-shrink-0`} 
                 />
               )}
            </React.Fragment>
        );
      })}
    </div>
  );
};

export const LayoutTree: React.FC<NodeProps> = (props) => {
  return props.node.type === 'leaf' ? <LeafNode {...props} /> : <SplitNode {...props} />;
};
