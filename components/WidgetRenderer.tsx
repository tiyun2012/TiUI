import React from 'react';
import { WidgetState, WidgetContext } from '../types';
import { apiService } from '../services/apiService';
import { widgetRegistry } from '../services/widgetRegistry';

interface Props {
  widget: WidgetState;
  isActive: boolean;
  widgetId: string;
}

export const WidgetRenderer: React.FC<Props> = ({ widget, isActive, widgetId }) => {
  const context: WidgetContext = {
    widgetId,
    isActive,
    api: apiService
  };

  const Component = widgetRegistry.get(widget.type);

  if (!Component) {
    return (
      <div className="h-full flex items-center justify-center bg-editor-bg text-red-400 text-xs p-4 border border-red-900/50">
        <div className="text-center">
          <p className="font-bold">Unknown Widget Type</p>
          <p className="font-mono mt-1 opacity-70">"{widget.type}"</p>
          <p className="mt-2 text-[10px] text-editor-muted">It may not be registered or the plugin is missing.</p>
        </div>
      </div>
    );
  }

  // Error boundary could go here for robustness
  return <Component context={context} params={widget.params} />;
};
