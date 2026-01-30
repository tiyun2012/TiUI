class CommandRegistry {
    private commands = new Set<string>();
  
    constructor() {
      // Default System Commands
      this.register('scene.list');
      this.register('scene.create');
      this.register('scene.setActive');
      this.register('scene.getActive');
      this.register('world.listRenderables');
      this.register('viewport.getStats');
      this.register('plugin_manager.mount');
    }
  
    register(command: string) {
      this.commands.add(command);
    }
  
    unregister(command: string) {
      this.commands.delete(command);
    }
  
    search(query: string, limit = 5): string[] {
      if (!query) return [];
      const lowerQuery = query.toLowerCase();
      const results: string[] = [];
      for (const cmd of this.commands) {
        if (cmd.toLowerCase().startsWith(lowerQuery)) {
          results.push(cmd);
          if (results.length >= limit) break;
        }
      }
      return results;
    }
  }
  
  export const commandRegistry = new CommandRegistry();
