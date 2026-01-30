import { ApiResponse } from '../types';

/**
 * Simulates the Module System RPC.
 * In a real app, this would use postMessage or WebSockets to talk to the Engine.
 */
class ApiService {
  private renderables: Array<{ id: string; name: string; type: string }> = [
    { id: 'mesh_01', name: 'Hero Cube', type: 'Mesh' },
    { id: 'light_01', name: 'Sun Light', type: 'DirectionalLight' },
    { id: 'cam_01', name: 'Main Camera', type: 'Camera' },
  ];

  private scenes: Array<{ id: string; name: string }> = [
    { id: 'scene_main', name: 'Main Level' },
    { id: 'scene_ui', name: 'UI Overlay' },
  ];

  private activeSceneId = 'scene_main';

  // Simulate network/process latency
  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async call<T>(moduleId: string, op: string, payload: any = {}): Promise<T> {
    await this.delay(50 + Math.random() * 50); // Small jitter

    console.debug(`[RPC] ${moduleId}.${op}`, payload);

    try {
      switch (moduleId) {
        case 'scene':
          return this.handleSceneOps(op, payload) as unknown as T;
        case 'world':
          return this.handleWorldOps(op, payload) as unknown as T;
        case 'viewport':
          return this.handleViewportOps(op, payload) as unknown as T;
        case 'plugin_manager':
          return this.handlePluginOps(op, payload) as unknown as T;
        default:
          throw new Error(`Unknown module: ${moduleId}`);
      }
    } catch (err: any) {
      console.error(`[RPC Error] ${moduleId}.${op}`, err);
      throw err;
    }
  }

  private handleSceneOps(op: string, payload: any) {
    switch (op) {
      case 'list':
        return this.scenes;
      case 'create':
        const newScene = { id: `scene_${Date.now()}`, name: payload.name || 'New Scene' };
        this.scenes.push(newScene);
        return newScene;
      case 'setActive':
        if (this.scenes.find(s => s.id === payload.sceneId)) {
          this.activeSceneId = payload.sceneId;
          return { success: true };
        }
        throw new Error('Scene not found');
      case 'getActive':
        return { sceneId: this.activeSceneId };
      default:
        throw new Error(`Unknown scene op: ${op}`);
    }
  }

  private handleWorldOps(op: string, payload: any) {
    switch (op) {
      case 'listRenderables':
        return this.renderables; // Real engine would filter by sceneId
      default:
        throw new Error(`Unknown world op: ${op}`);
    }
  }

  private handleViewportOps(op: string, payload: any) {
    // These ops are usually side-effects on the engine, so we return success
    switch (op) {
      case 'attachCanvas':
        // In a real engine, we'd pass the canvas OFFSCREEN or handle resize observer here
        return { status: 'attached', viewportId: payload.viewportId };
      case 'detachCanvas':
        return { status: 'detached' };
      case 'setNavMode':
        return { mode: payload.mode };
      case 'input':
        return { processed: true };
      case 'getStats':
        return { fps: 60, drawCalls: 142, tris: 45000 };
      default:
        throw new Error(`Unknown viewport op: ${op}`);
    }
  }

  private handlePluginOps(op: string, payload: any) {
    switch (op) {
      case 'manifest':
        return { version: '1.0.0', capabilities: ['ui', 'render'] };
      case 'mount':
        return { mountId: payload.instanceId, status: 'mounted' };
      case 'unmount':
        return { status: 'unmounted' };
      default:
        throw new Error(`Unknown plugin op: ${op}`);
    }
  }
}

export const apiService = new ApiService();
