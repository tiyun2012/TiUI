import React, { useState, useRef, useEffect } from 'react';
import { WidgetContext } from '../../types';
import { Input } from '../ui/Primitives';

interface LogEntry {
  id: number;
  type: 'info' | 'error' | 'success';
  msg: string;
  payload?: any;
}

const COMMANDS = [
  'scene.list', 'scene.create', 'scene.setActive', 
  'viewport.getStats', 'world.listRenderables', 'plugin_manager.mount'
];

export const ConsoleWidget: React.FC<{ context: WidgetContext; params: { scope?: string } }> = ({ context, params }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Autocomplete Logic
  useEffect(() => {
    if (!input) {
      setSuggestions([]);
      return;
    }
    const match = COMMANDS.filter(c => c.toLowerCase().startsWith(input.toLowerCase()));
    setSuggestions(match.slice(0, 3)); // Top 3
  }, [input]);

  const execute = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setLogs(prev => [...prev, { id: Date.now(), type: 'info', msg: `> ${trimmed}` }]);
    setInput('');
    setSuggestions([]);

    try {
      const [target, ...rest] = trimmed.split(' ');
      const payloadStr = rest.join(' ');
      
      let moduleId = params.scope || 'scene'; 
      let op = 'list';
      let payload = {};

      if (target.includes('.')) {
        [moduleId, op] = target.split('.');
      } else {
        op = target;
      }

      if (payloadStr) {
        try {
          payload = JSON.parse(payloadStr);
        } catch (e) {
            setLogs(prev => [...prev, { id: Date.now(), type: 'error', msg: 'Invalid JSON payload' }]);
            return;
        }
      }

      const result = await context.api.call(moduleId, op, payload);
      setLogs(prev => [...prev, { id: Date.now(), type: 'success', msg: `< OK`, payload: result }]);

    } catch (e: any) {
      setLogs(prev => [...prev, { id: Date.now(), type: 'error', msg: `Error: ${e.message}` }]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-editor-bg font-mono text-xs relative">
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {logs.map(log => (
          <div key={log.id} className="break-all">
            <span className={
              log.type === 'error' ? 'text-red-400' : 
              log.type === 'success' ? 'text-green-400' : 'text-editor-text'
            }>
              {log.msg}
            </span>
            {log.payload && (
              <pre className="ml-4 text-editor-muted text-[10px] mt-1">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      
      {/* Autocomplete Popup */}
      {suggestions.length > 0 && (
        <div className="absolute bottom-10 left-2 bg-editor-panel border border-editor-border shadow-lg rounded">
          {suggestions.map(s => (
            <div 
              key={s} 
              className="px-2 py-1 cursor-pointer hover:bg-editor-accent hover:text-white"
              onClick={() => { setInput(s + " "); }}
            >
              {s}
            </div>
          ))}
        </div>
      )}

      <div className="p-2 border-t border-editor-border bg-editor-panel">
        <Input 
          className="w-full" 
          placeholder={params.scope ? `Call ${params.scope} ops...` : "Enter command..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') execute(input);
            if (e.key === 'Tab' && suggestions.length > 0) {
              e.preventDefault();
              setInput(suggestions[0] + " ");
            }
          }}
        />
      </div>
    </div>
  );
};
