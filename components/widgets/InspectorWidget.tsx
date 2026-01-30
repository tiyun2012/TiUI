import React, { useEffect, useState } from 'react';
import { WidgetContext } from '../../types';
import { Button } from '../ui/Primitives';

export const InspectorWidget: React.FC<{ context: WidgetContext; params: any }> = ({ context }) => {
  const [selection, setSelection] = useState<any[]>([]);
  const [mountedPlugins, setMountedPlugins] = useState<string[]>([]);

  const fetchSelection = async () => {
      // In a real app, this would listen to an event. 
      // For now, we list renderables from world.
      const items = await context.api.call('world', 'listRenderables');
      setSelection(items as any[]);
  };

  const togglePlugin = async (id: string) => {
      if (mountedPlugins.includes(id)) {
          await context.api.call('plugin_manager', 'unmount', { instanceId: id });
          setMountedPlugins(prev => prev.filter(p => p !== id));
      } else {
          await context.api.call('plugin_manager', 'mount', { instanceId: id, hostElement: 'virtual-dom-id' });
          setMountedPlugins(prev => [...prev, id]);
      }
  };

  useEffect(() => {
      fetchSelection();
  }, [context.isActive]);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
        
        <div className="space-y-2">
            <h3 className="text-xs font-bold text-editor-accent uppercase">External Plugins</h3>
            <div className="bg-editor-panel border border-editor-border rounded p-2">
                <div className="flex justify-between items-center mb-2">
                    <span>UV Mapper Pro</span>
                    <Button onClick={() => togglePlugin('uv_tool')}>
                        {mountedPlugins.includes('uv_tool') ? 'Unmount' : 'Mount'}
                    </Button>
                </div>
                <div className="flex justify-between items-center">
                    <span>Physics Debugger</span>
                    <Button onClick={() => togglePlugin('phys_dbg')}>
                         {mountedPlugins.includes('phys_dbg') ? 'Unmount' : 'Mount'}
                    </Button>
                </div>
            </div>
        </div>

        <div className="space-y-2">
            <h3 className="text-xs font-bold text-editor-accent uppercase">Scene Objects</h3>
            <div className="space-y-1">
                {selection.map((item: any) => (
                    <div key={item.id} className="p-2 bg-editor-panel border border-editor-border rounded flex justify-between">
                        <span>{item.name}</span>
                        <span className="text-editor-muted text-[10px]">{item.type}</span>
                    </div>
                ))}
            </div>
            <Button className="w-full mt-2" onClick={fetchSelection}>Refresh List</Button>
        </div>

    </div>
  );
};
