// --- API & RPC Types ---

export type ModuleId = 'scene' | 'viewport' | 'world' | 'plugin_manager' | 'console' | string;

export interface ApiRequest {
  moduleId: ModuleId;
  op: string;
  payload?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// --- Theme Types ---

export interface Theme {
  name: string;
  colors: {
    bg: string;
    panel: string;
    border: string;
    active: string;
    accent: string;
    text: string;
    muted: string;
  }
}

// --- Widget Contract ---

// We keep these constants for Core widgets, but the type is now string to allow plugins
export const CoreWidgetTypes = {
  VIEWPORT: 'VIEWPORT',
  CONSOLE: 'CONSOLE',
  MODULE_LIST: 'MODULE_LIST',
  PLUGIN_HOST: 'PLUGIN_HOST',
  INSPECTOR: 'INSPECTOR',
  EMPTY: 'EMPTY'
} as const;

export interface WidgetState {
  instanceId: string;
  type: string; // Changed from enum to string for extensibility
  title: string;
  params: Record<string, any>; // Generic JSON params
}

export interface WidgetContext {
  widgetId: string;
  isActive: boolean;
  api: {
    call: <T = any>(moduleId: string, op: string, payload?: any) => Promise<T>;
  };
}

// --- Layout Engine Types ---

export type SplitDirection = 'row' | 'column';

export interface LayoutNode {
  id: string;
  type: 'split' | 'leaf';
  
  // For 'split' type
  direction?: SplitDirection;
  children?: LayoutNode[];
  weights?: number[]; // Percentage distribution (sums to 100 roughly)

  // For 'leaf' type
  widgets?: WidgetState[];
  activeWidgetId?: string;
}

export interface FloatingPanel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  node: LayoutNode; // Usually a leaf, but could be a split tree
}

export interface LayoutState {
  root: LayoutNode;
  floating: FloatingPanel[];
}

// --- Drag & Drop Types ---

export type DragType = 'tab' | 'floating';
export type DropZone = 'center' | 'top' | 'bottom' | 'left' | 'right';

export interface DragData {
  type: DragType;
  sourceNodeId?: string; // For tabs
  widgetIndex?: number;  // For tabs
  floatId?: string;      // For floating panels
}
