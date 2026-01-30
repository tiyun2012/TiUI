import React from 'react';
import { WidgetContext } from '../types';

export type WidgetComponent = React.ComponentType<{ context: WidgetContext; params: any }>;

class WidgetRegistry {
  private registry = new Map<string, WidgetComponent>();

  /**
   * Register a new widget type.
   * @param type The unique type identifier for the widget (e.g., 'VIEWPORT')
   * @param component The React component to render
   */
  register(type: string, component: WidgetComponent) {
    if (this.registry.has(type)) {
      console.warn(`WidgetRegistry: Overwriting existing widget type '${type}'`);
    }
    this.registry.set(type, component);
    console.debug(`WidgetRegistry: Registered '${type}'`);
  }

  /**
   * Retrieve a widget component by type.
   */
  get(type: string): WidgetComponent | undefined {
    return this.registry.get(type);
  }

  /**
   * Check if a widget type is registered.
   */
  has(type: string): boolean {
    return this.registry.has(type);
  }
}

export const widgetRegistry = new WidgetRegistry();
