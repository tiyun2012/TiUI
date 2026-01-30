import React from 'react';
import { WidgetType, WidgetState, WidgetContext } from '../types';
import { apiService } from '../services/apiService';
import { ViewportWidget, ViewportParams } from './widgets/ViewportWidget';
import { ConsoleWidget } from './widgets/ConsoleWidget';
import { InspectorWidget } from './widgets/InspectorWidget';
import { ModuleListWidget } from './widgets/ModuleListWidget';

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

  switch (widget.type) {
    case WidgetType.VIEWPORT:
      return <ViewportWidget context={context} params={widget.params as ViewportParams} />;
    case WidgetType.CONSOLE:
      return <ConsoleWidget context={context} params={widget.params} />;
    case WidgetType.INSPECTOR:
    case WidgetType.PLUGIN_HOST:
        return <InspectorWidget context={context} params={widget.params} />;
    case WidgetType.MODULE_LIST:
        return <ModuleListWidget context={context} />;
    default:
      return <div className="p-4 text-red-500">Unknown Widget Type: {widget.type}</div>;
  }
};
