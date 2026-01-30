import React from 'react';
import { WidgetContext } from '../../types';
import { Button } from '../ui/Primitives';

export const ModuleListWidget: React.FC<{ context: WidgetContext }> = ({ context }) => {
  const modules = [
    { id: 'scene', ops: ['list', 'create', 'setActive', 'getActive'] },
    { id: 'viewport', ops: ['attachCanvas', 'detachCanvas', 'setNavMode', 'input', 'getStats'] },
    { id: 'world', ops: ['listRenderables'] },
    { id: 'plugin_manager', ops: ['mount', 'unmount'] }
  ];

  const runOp = (modId: string, op: string) => {
    // In a real app this might open a dialog for params.
    // Here we just trigger it or log it to the console via event.
    console.log(`Manual trigger: ${modId}.${op}`);
    context.api.call(modId, op, {});
  };

  return (
    <div className="h-full overflow-y-auto bg-editor-bg">
      <div className="p-2 space-y-4">
        {modules.map(mod => (
          <div key={mod.id} className="space-y-1">
             <div className="flex items-center space-x-2 text-editor-accent">
                <div className="w-2 h-2 rounded-full bg-editor-accent" />
                <span className="text-xs font-bold uppercase tracking-wider">{mod.id}</span>
             </div>
             <div className="pl-4 space-y-1">
                {mod.ops.map(op => (
                  <div key={op} className="flex justify-between items-center group">
                    <span className="text-xs text-editor-muted group-hover:text-editor-text font-mono transition-colors">{op}</span>
                    <button 
                      onClick={() => runOp(mod.id, op)}
                      className="opacity-0 group-hover:opacity-100 text-[10px] text-editor-text bg-editor-active px-1 rounded hover:bg-editor-accent"
                    >
                      CALL
                    </button>
                  </div>
                ))}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};
